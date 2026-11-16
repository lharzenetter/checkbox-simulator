import { logIn, logInToBereitschaft } from "../recipes";
import { scenario } from "../scenario";
import type { TallyName, Window } from "../window";

const HLF_AT_F: TallyName = { fahrzeug: "HLF", role: "Angriffstruppführer" };
const HLF_AT_M: TallyName = { fahrzeug: "HLF", role: "Angriffstruppmann" };

// Simulated minutes at 10×.
async function simulated(
  { time }: Window,
  minutes: number,
  seconds = 0,
): Promise<void> {
  await time.passes({ seconds: (minutes * 60 + seconds) / 10 });
}

// Leaves the Trupp-Ansicht for the Einsatzliste and runs at 10×, so the minutes pass in few clock
// steps.
async function onEinsatzliste({ trainee }: Window): Promise<void> {
  await trainee.press("X");
  await trainee.setSpeed(10);
}

// Trupp 01 logged in to Anmarsch for 30 min at 300 bar, on the Einsatzliste.
async function truppInAnmarsch(window: Window): Promise<void> {
  await logIn(window, [HLF_AT_F, HLF_AT_M]);
  await onEinsatzliste(window);
}

// The first OK silences the Alarm and the second ends it; both leave the simulation at 1×.
async function acknowledge({ trainee }: Window): Promise<void> {
  await trainee.press("OK");
  await trainee.press("OK");
  await trainee.setSpeed(10);
}

// The next Alarm sounds once this much simulated time has passed, and not a second earlier; the
// last second runs at 1×, so the Alarm fires on its own whole second.
async function nextAlarmAfter(
  window: Window,
  minutes: number,
  seconds = 0,
): Promise<void> {
  const { trainee, see, time } = window;
  await simulated(window, minutes, seconds - 1);
  await see.alarmLed().isOff();
  await trainee.setSpeed(1);
  await time.passes({ seconds: 1 });
  await see.alarmLed().isBlinking();
}

type Item =
  | "Trupp -> Einsatz"
  | "Trupp -> Bereitschaft"
  | "Einsatzziel erreicht"
  | "Rückzug antreten"
  | "Druck ändern";

// decided in "Define the key-by-screen navigation model", its Trupp-Menü table: both status items
// come first, then the one that depends on the Einsatzstatus, then Druck ändern; in Bereitschaft
// there is no third item, so Druck ändern moves up one
const POSITION: Readonly<Record<Item, number>> = {
  "Trupp -> Einsatz": 0,
  "Trupp -> Bereitschaft": 1,
  "Einsatzziel erreicht": 2,
  "Rückzug antreten": 2,
  "Druck ändern": 3,
};

// OK on the Einsatzliste opens the Trupp-Menü with the cursor on its first item.
async function choose(
  { trainee }: Window,
  item: Item,
  position = POSITION[item],
): Promise<void> {
  await trainee.press("OK");
  for (let down = 0; down < position; down++) {
    await trainee.press("Down");
  }
  await trainee.press("OK");
}

// The editor opens at the snapped estimate, `fromBar`; Up and Down move it in 5 bar steps
// (manual 5.4, parameters [73] and [76]); OK enters `toBar`.
async function enter(
  window: Window,
  item: Item,
  { fromBar, toBar }: { readonly fromBar: number; readonly toBar: number },
  position = POSITION[item],
): Promise<void> {
  const { trainee, see } = window;
  await choose(window, item, position);
  await see.lcd().shows(`Druck ${String(fromBar)} bar`);
  const steps = (toBar - fromBar) / 5;
  for (let step = 0; step < Math.abs(steps); step++) {
    await trainee.press(steps > 0 ? "Up" : "Down");
  }
  await trainee.press("OK");
}

// S12 for the Rückzugsalarm: manual 5.5.3, ALARM figure; the real-device photo
// alarm-rueckzug.jpeg; timing-and-alarm-rules §8.5: `RÜCKZUG` in the header
function rueckzugScreen({
  druck,
  restzeit,
  rueckzugsdruck,
}: {
  readonly druck: number;
  readonly restzeit: string;
  readonly rueckzugsdruck: number;
}): readonly string[] {
  return [
    "Trupp 01 RÜCKZUG",
    "Personen-Anzahl: 2",
    `Druck ${String(druck)} bar`,
    `Restzeit ${restzeit}`,
    `Rückzugsdruck ${String(rueckzugsdruck)} bar`,
    "Alarmende",
    "mit OK",
  ];
}

// verification-scenarios V1; timing-and-alarm-rules §5.5, 5.11, 5.13: armed from login at the
// 50 bar Reservedruck, which is worth 5:00 of the 30-min Einsatzzeit
scenario(
  "an untouched Trupp sounds the Rückzugsalarm once, at 50 bar at 25:00",
  async (window) => {
    const { see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 9, 54);
    await acknowledge(window);
    await simulated(window, 9, 54);
    await acknowledge(window);

    await nextAlarmAfter(window, 5, 12);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 50,
        restzeit: "00:05:00",
        rueckzugsdruck: 50,
      }),
    );
    await acknowledge(window);

    // the next Alarm is Einsatzzeit erreicht at 00:00:00 (timing-and-alarm-rules §3.1)
    await nextAlarmAfter(window, 5);
    await see.lcd().shows("Trupp 01 ALARM");
    await see.lcd().shows("Restzeit 00:00:00");
  },
);

// verification-scenarios V2, its Rückzug row; timing-and-alarm-rules §1.3, 5.5, 5.13: the
// Rückzugsalarm goes by the Restzeit, so 270 bar at login bring it forward by 3:00
scenario(
  "a Trupp logged in at 270 bar sounds the Rückzugsalarm at 22:00",
  async (window) => {
    const { trainee, see } = window;
    await trainee.holdTally(HLF_AT_F);
    await trainee.press("OK");
    await trainee.holdTally(HLF_AT_M);
    await trainee.press("OK");
    for (let step = 0; step < 6; step++) {
      await trainee.press("Down");
    }
    await trainee.press("OK");
    await see.lcd().shows("Restzeit 00:27:00");
    await onEinsatzliste(window);

    // the Alarmgrenzen go by elapsed time (timing-and-alarm-rules §2.2)
    await simulated(window, 9, 54);
    await acknowledge(window);
    await simulated(window, 9, 54);
    await acknowledge(window);

    await nextAlarmAfter(window, 2, 12);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 50,
        restzeit: "00:05:00",
        rueckzugsdruck: 50,
      }),
    );
  },
);

// verification-scenarios V3, its Rückzug row; timing-and-alarm-rules §1.4, 5.5, 5.13
scenario(
  "a pressure entry in Anmarsch moves the Rückzugsalarm with the Restzeit, to 22:03",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 6, 3);

    await enter(window, "Druck ändern", { fromBar: 235, toBar: 210 });
    await see.alarmLed().isOff();
    await see.lcd().shows("Restzeit 00:21:00");
    await trainee.press("X");

    await simulated(window, 3, 51);
    await acknowledge(window);
    await simulated(window, 9, 54);
    await acknowledge(window);

    await nextAlarmAfter(window, 2, 15);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 50,
        restzeit: "00:05:00",
        rueckzugsdruck: 50,
      }),
    );
  },
);

// verification-scenarios V28; timing-and-alarm-rules §2.6, 5.5, 5.13: the 50 bar Reservedruck is
// worth 30:00 of 180 min
scenario(
  "a 180-min Trupp sounds the Rückzugsalarm at 150:00",
  async (window) => {
    const { trainee, see } = window;
    await trainee.holdTally(HLF_AT_F);
    await trainee.press("Up");
    await trainee.press("OK");
    await trainee.press("OK");
    await trainee.holdTally(HLF_AT_M);
    await trainee.press("OK");
    await trainee.press("OK");
    await see.lcd().shows("Restzeit 03:00:00");
    await onEinsatzliste(window);

    // the Alarmgrenzen at 59:24 and 118:48
    await simulated(window, 59, 24);
    await acknowledge(window);
    await simulated(window, 59, 24);
    await acknowledge(window);

    await nextAlarmAfter(window, 31, 12);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 50,
        restzeit: "00:30:00",
        rueckzugsdruck: 50,
      }),
    );
  },
);

// verification-scenarios V7; timing-and-alarm-rules §5.3, 5.5, 5.7, 5.11: 300 → 240 bar on the
// Anmarsch gives a Rückzugsdruck of 120 bar
scenario(
  "the Rückzugsalarm sounds once, when the estimate falls to the Rückzugsdruck",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 6);

    await enter(window, "Einsatzziel erreicht", { fromBar: 240, toBar: 240 });
    await see
      .lcd()
      .reads([
        "Trupp 01 EINSATZ",
        "Personen-Anzahl: 2",
        "Druck 240 bar",
        "Restzeit 00:24:00",
        "Rückzugsdruck 120 bar",
        "Ansicht",
      ]);
    await trainee.press("X");

    await simulated(window, 3, 54);
    await acknowledge(window);

    await nextAlarmAfter(window, 8, 6);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 120,
        restzeit: "00:12:00",
        rueckzugsdruck: 120,
      }),
    );
    await acknowledge(window);

    // the next Alarm is the second Alarmgrenze at 19:48
    await nextAlarmAfter(window, 1, 48);
    await see.lcd().shows("Trupp 01 ALARM 2");
  },
);

// verification-scenarios V7; timing-and-alarm-rules §8.2, 8.4: 300 → 215 bar at 6:00 gives a
// Rückzugsdruck of 170 bar, which the estimate meets at 10:30, while Alarm 1 is still pending
scenario(
  "a Rückzugsalarm queues behind a pending Alarm and does not sound again after its OKs",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    await simulated(window, 6);
    await enter(window, "Einsatzziel erreicht", { fromBar: 240, toBar: 215 });
    await see.lcd().shows("Rückzugsdruck 170 bar");
    await trainee.press("X");

    await simulated(window, 3, 54);
    await see.lcd().shows("Trupp 01 ALARM 1");
    // the pending Alarm holds the simulation at 1× (decided in "Correct the simulator against the
    // real Checkbox")
    await time.passes({ seconds: 36 });
    await see.lcd().shows("Trupp 01 ALARM 1");

    await trainee.press("OK");
    await trainee.press("OK");
    await see.alarmLed().isBlinking();
    await see.lcd().reads(
      rueckzugScreen({
        druck: 170,
        restzeit: "00:17:00",
        rueckzugsdruck: 170,
      }),
    );

    await acknowledge(window);
    await see.alarmLed().isOff();
    await see.lcd().shows("01 markiert  2× Einsatzziel erreicht  00:17:00");

    await nextAlarmAfter(window, 9, 18);
    await see.lcd().shows("Trupp 01 ALARM 2");
  },
);

// verification-scenarios V25; manual 3.2.3 item 9; timing-and-alarm-rules §5.7, 5.15: twice the
// Anmarschdruck, measured from the Anfangsdruck, and never below the 50 bar Reservedruck
for (const { anfangsdruck, toBar, rueckzugsdruck } of [
  { anfangsdruck: 300, toBar: 280, rueckzugsdruck: 50 },
  { anfangsdruck: 300, toBar: 275, rueckzugsdruck: 50 },
  { anfangsdruck: 300, toBar: 270, rueckzugsdruck: 60 },
  { anfangsdruck: 270, toBar: 220, rueckzugsdruck: 100 },
]) {
  scenario(
    `${String(anfangsdruck)} → ${String(toBar)} bar at Einsatzziel erreicht gives a Rückzugsdruck of ${String(rueckzugsdruck)} bar`,
    async (window) => {
      const { trainee, see } = window;
      await trainee.holdTally(HLF_AT_F);
      await trainee.press("OK");
      await trainee.holdTally(HLF_AT_M);
      await trainee.press("OK");
      for (let step = 0; step < (300 - anfangsdruck) / 5; step++) {
        await trainee.press("Down");
      }
      await trainee.press("OK");
      await onEinsatzliste(window);
      await simulated(window, 2);

      await enter(window, "Einsatzziel erreicht", {
        fromBar: anfangsdruck - 20,
        toBar,
      });
      await see.lcd().shows("Trupp 01 EINSATZ");
      await see.lcd().shows(`Rückzugsdruck ${String(rueckzugsdruck)} bar`);
    },
  );
}

// verification-scenarios V25; timing-and-alarm-rules §5.7, 5.13: 300 → 280 bar would give 40 bar,
// so the Reservedruck holds the Rückzugsalarm at 25:00
scenario(
  "a Rückzugsdruck held at the Reservedruck sounds the Rückzugsalarm at 50 bar",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 2);
    await enter(window, "Einsatzziel erreicht", { fromBar: 280, toBar: 280 });
    await see.lcd().shows("Restzeit 00:28:00");
    await trainee.press("X");

    await simulated(window, 7, 54);
    await acknowledge(window);
    await simulated(window, 9, 54);
    await acknowledge(window);

    await nextAlarmAfter(window, 5, 12);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 50,
        restzeit: "00:05:00",
        rueckzugsdruck: 50,
      }),
    );
  },
);

// verification-scenarios V8; timing-and-alarm-rules §2.6, 5.5, 5.7: the Rückzugsdruck goes by
// pressure, so 60 bar are worth 4:00 of the 20-min Einsatzzeit
scenario(
  "a 20-min Trupp sounds the Rückzugsalarm at its 60 bar Rückzugsdruck, at 16:00",
  async (window) => {
    const { trainee, see } = window;
    await trainee.holdTally(HLF_AT_F);
    await trainee.press("Down");
    await trainee.press("OK");
    await trainee.press("OK");
    await trainee.holdTally(HLF_AT_M);
    await trainee.press("OK");
    await trainee.press("OK");
    await see.lcd().shows("Restzeit 00:20:00");
    await onEinsatzliste(window);
    await simulated(window, 2);

    await enter(window, "Einsatzziel erreicht", { fromBar: 270, toBar: 270 });
    await see.lcd().shows("Restzeit 00:18:00");
    await see.lcd().shows("Rückzugsdruck 60 bar");
    await trainee.press("X");

    // the Alarmgrenzen at 6:36 and 13:12
    await simulated(window, 4, 36);
    await acknowledge(window);
    await simulated(window, 6, 36);
    await acknowledge(window);

    await nextAlarmAfter(window, 2, 48);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 60,
        restzeit: "00:04:00",
        rueckzugsdruck: 60,
      }),
    );
  },
);

// verification-scenarios V9; timing-and-alarm-rules §5.7, 5.14: an X in the editor enters
// nothing, and OK on an estimate already at the Rückzugsdruck sounds it at once
scenario(
  "an entry already at the Rückzugsdruck at Einsatzziel erreicht sounds the Rückzugsalarm on OK, once",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 8);

    await choose(window, "Einsatzziel erreicht");
    await trainee.press("X");
    await trainee.press("X");
    await see.alarmLed().isOff();
    await see.lcd().shows("01 markiert  2× Anmarsch  00:22:00");

    await enter(window, "Einsatzziel erreicht", { fromBar: 220, toBar: 200 });
    await see.alarmLed().isBlinking();
    await see.lcd().reads(
      rueckzugScreen({
        druck: 200,
        restzeit: "00:20:00",
        rueckzugsdruck: 200,
      }),
    );
    await acknowledge(window);
    await trainee.press("X");

    // only the Alarmgrenzen at 9:54 and 19:48 sound before 00:00:00 at 28:00
    await nextAlarmAfter(window, 1, 54);
    await see.lcd().shows("Trupp 01 ALARM 1");
    await acknowledge(window);
    await nextAlarmAfter(window, 9, 54);
    await see.lcd().shows("Trupp 01 ALARM 2");
    await acknowledge(window);
    await nextAlarmAfter(window, 8, 12);
    await see.lcd().shows("Trupp 01 ALARM");
    await see.lcd().shows("Restzeit 00:00:00");
  },
);

// As the user saw on the device: the Rückzugsdruck is not capped at the Flaschendruck of 300 bar;
// timing-and-alarm-rules §5.7, 5.14
scenario(
  "300 → 150 bar at Einsatzziel erreicht sounds the Rückzugsalarm on OK, at a Rückzugsdruck of 300 bar",
  async (window) => {
    const { see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 3);

    await enter(window, "Einsatzziel erreicht", { fromBar: 270, toBar: 150 });
    await see.alarmLed().isBlinking();
    await see.lcd().reads(
      rueckzugScreen({
        druck: 150,
        restzeit: "00:15:00",
        rueckzugsdruck: 300,
      }),
    );
  },
);

// timing-and-alarm-rules §8.2: the Rückzugsalarm queues before Einsatzzeit erreicht
scenario(
  "an entry of 0 bar sounds the Rückzugsalarm, then Einsatzzeit erreicht",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 5);

    await enter(window, "Einsatzziel erreicht", { fromBar: 250, toBar: 0 });
    await see.lcd().reads(
      rueckzugScreen({
        druck: 0,
        restzeit: "00:00:00",
        rueckzugsdruck: 600,
      }),
    );

    await trainee.press("OK");
    await trainee.press("OK");
    await see.alarmLed().isBlinking();
    await see.lcd().shows("Trupp 01 ALARM");

    await trainee.press("OK");
    await trainee.press("OK");
    await see.alarmLed().isOff();
    await see.lcd().shows("Trupp 01 EINSATZ");
  },
);

// verification-scenarios V10; timing-and-alarm-rules §1.5, 5.9, 5.14: 300 → 250 bar gives a
// Rückzugsdruck of 100 bar; an entry at or below it fires the Rückzugsalarm on OK, and only an
// entry above it arms it again
scenario(
  "a pressure entry across the Rückzugsdruck sounds the Rückzugsalarm, and only a raise above it re-arms it",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 5);
    await enter(window, "Einsatzziel erreicht", { fromBar: 250, toBar: 250 });
    await see.lcd().shows("Rückzugsdruck 100 bar");
    await trainee.press("X");
    await simulated(window, 2);

    await enter(window, "Druck ändern", { fromBar: 230, toBar: 95 });
    await see.alarmLed().isBlinking();
    await see.lcd().reads(
      rueckzugScreen({
        druck: 95,
        restzeit: "00:09:30",
        rueckzugsdruck: 100,
      }),
    );
    await acknowledge(window);
    await trainee.press("X");
    await simulated(window, 0, 30);

    await enter(window, "Druck ändern", { fromBar: 90, toBar: 105 });
    await see.alarmLed().isOff();
    await see.lcd().shows("Restzeit 00:10:30");
    await trainee.press("X");

    await nextAlarmAfter(window, 0, 30);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 100,
        restzeit: "00:10:00",
        rueckzugsdruck: 100,
      }),
    );
    await acknowledge(window);
    await trainee.press("X");
    await simulated(window, 0, 30);

    await enter(window, "Druck ändern", { fromBar: 95, toBar: 90 });
    await see.alarmLed().isOff();
    await see.lcd().shows("Restzeit 00:09:00");
    await trainee.press("X");

    // the next Alarm is the first Alarmgrenze at 9:54
    await nextAlarmAfter(window, 1, 24);
    await see.lcd().shows("Trupp 01 ALARM 1");
  },
);

// timing-and-alarm-rules §4.7, 5.9: the Rückzugsalarm pauses in Bereitschaft; ASSUMPTION in
// alarm.ts: it stays armed and sounds once the Trupp leaves Bereitschaft
scenario(
  "an entry at the Rückzugsdruck in Bereitschaft sounds the Rückzugsalarm only once the Trupp leaves it",
  async (window) => {
    const { trainee, see, time } = window;
    await logInToBereitschaft(window, [HLF_AT_F, HLF_AT_M]);
    await onEinsatzliste(window);
    await simulated(window, 2);

    // in Bereitschaft, Druck ändern is the Trupp-Menü's third item
    await enter(window, "Druck ändern", { fromBar: 300, toBar: 50 }, 2);
    await see.alarmLed().isOff();
    await see.lcd().shows("Restzeit 00:05:00");
    await trainee.press("X");

    // the Bereitschaft Alarm would sound at 5:00 (timing-and-alarm-rules §4.3)
    await simulated(window, 2, 59);
    await see.alarmLed().isOff();

    await choose(window, "Trupp -> Einsatz");
    await see.alarmLed().isOff();
    await trainee.setSpeed(1);
    await time.passes({ seconds: 1 });
    await see.alarmLed().isBlinking();
    await see.lcd().shows("Trupp 01 RÜCKZUG");
  },
);

// verification-scenarios V13; timing-and-alarm-rules §4.5, 4.7, 5.7, 5.9: 300 → 260 bar gives a
// Rückzugsdruck of 80 bar, kept through Bereitschaft, whose 6 min move the Rückzugsalarm to 28:00
scenario(
  "a Trupp keeps its Rückzugsdruck through Bereitschaft, and its Rückzugsalarm moves by the time spent there",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 4);
    await enter(window, "Einsatzziel erreicht", { fromBar: 260, toBar: 260 });
    await see.lcd().shows("Rückzugsdruck 80 bar");
    await trainee.press("X");

    await simulated(window, 4);
    await choose(window, "Trupp -> Bereitschaft");
    // the Bereitschaft Alarm, 5 min after 8:00
    await simulated(window, 5);
    await acknowledge(window);
    await simulated(window, 1);
    await choose(window, "Trupp -> Einsatz");

    // the Alarmgrenzen at 15:54 and 25:48
    await simulated(window, 1, 54);
    await acknowledge(window);
    await simulated(window, 9, 54);
    await acknowledge(window);

    await nextAlarmAfter(window, 2, 12);
    await see.lcd().reads(
      rueckzugScreen({
        druck: 80,
        restzeit: "00:08:00",
        rueckzugsdruck: 80,
      }),
    );
  },
);

// timing-and-alarm-rules §4.6, 5.9, 5.14: 300 → 160 bar gives a Rückzugsdruck of 280 bar, so the
// Rückzugsalarm sounds on OK; Bereitschaft does not arm it again
scenario(
  "a Rückzugsalarm that sounded before Bereitschaft does not sound again after it",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 4);
    await enter(window, "Einsatzziel erreicht", { fromBar: 260, toBar: 160 });
    await see.lcd().shows("Trupp 01 RÜCKZUG");
    await acknowledge(window);
    await trainee.press("X");

    await simulated(window, 4);
    await choose(window, "Trupp -> Bereitschaft");
    // the Bereitschaft Alarm, 5 min after 8:00
    await simulated(window, 5);
    await see.lcd().shows("Trupp 01 BEREITSCHAFT");
    await acknowledge(window);
    await simulated(window, 1);
    await choose(window, "Trupp -> Einsatz");

    // the next Alarm is the first Alarmgrenze, moved by the 6 min in Bereitschaft to 15:54
    await nextAlarmAfter(window, 1, 54);
    await see.lcd().shows("Trupp 01 ALARM 1");
  },
);

// verification-scenarios V6; timing-and-alarm-rules §5.9; ASSUMPTION in alarm.ts: Rückmarsch
// suppresses the Rückzugsalarm. 300 → 270 bar gives a Rückzugsdruck of 60 bar, which the estimate
// meets at 24:00 in Rückmarsch
scenario("a Trupp in Rückmarsch sounds no Rückzugsalarm", async (window) => {
  const { trainee, see } = window;
  await truppInAnmarsch(window);
  await simulated(window, 3);
  await enter(window, "Einsatzziel erreicht", { fromBar: 270, toBar: 270 });
  await trainee.press("X");

  await simulated(window, 6, 54);
  await acknowledge(window);
  await simulated(window, 2, 6);
  await enter(window, "Rückzug antreten", { fromBar: 180, toBar: 180 });
  await see.lcd().shows("Rückzugsdruck 60 bar");
  await trainee.press("X");

  await simulated(window, 7, 48);
  await acknowledge(window);

  // the next Alarm is Einsatzzeit erreicht at 30:00
  await nextAlarmAfter(window, 10, 12);
  await see.lcd().shows("Trupp 01 ALARM");
  await see.lcd().shows("Restzeit 00:00:00");
});

// verification-scenarios V26; timing-and-alarm-rules §4.6, 5.9, 12.4; ASSUMPTION in alarm.ts:
// Rückmarsch suppresses the Rückzugsalarm. The estimate meets the 60 bar Rückzugsdruck at 27:00
scenario(
  "a Trupp restored to Rückmarsch from Bereitschaft sounds no Rückzugsalarm",
  async (window) => {
    const { trainee } = window;
    await truppInAnmarsch(window);
    await simulated(window, 3);
    await enter(window, "Einsatzziel erreicht", { fromBar: 270, toBar: 270 });
    await trainee.press("X");
    await simulated(window, 2);
    await enter(window, "Rückzug antreten", { fromBar: 250, toBar: 250 });
    await trainee.press("X");

    await simulated(window, 1);
    await choose(window, "Trupp -> Bereitschaft");
    await simulated(window, 3);
    await choose(window, "Trupp -> Einsatz");

    // the Alarmgrenzen at 12:54 and 22:48
    await simulated(window, 3, 54);
    await acknowledge(window);
    await simulated(window, 9, 54);
    await acknowledge(window);

    // the next Alarm is Einsatzzeit erreicht at 33:00
    await nextAlarmAfter(window, 10, 12);
    await window.see.lcd().shows("Trupp 01 ALARM");
    await window.see.lcd().shows("Restzeit 00:00:00");
  },
);
