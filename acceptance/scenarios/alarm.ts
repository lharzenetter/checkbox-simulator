import { logIn } from "../recipes";
import { scenario } from "../scenario";
import type { Window } from "../window";

// The Einsatzliste shows the Alarm takeover from a plain list rather than the Trupp-Ansicht.
async function truppInAnmarsch(window: Window): Promise<void> {
  await logIn(window, [
    { fahrzeug: "HLF", role: "Angriffstruppführer" },
    { fahrzeug: "HLF", role: "Angriffstruppmann" },
  ]);
  await window.trainee.press("X");
}

// manual 5.5.3, ALARM figure; the real-device photo alarm-rueckzug.jpeg; decided in "Correct the
// simulator against the real Checkbox": the cause in the header, the Personen-Anzahl in place of
// the names, and no SICHER
const ALARM_1_AT_9_54 = [
  "Trupp 01 ALARM 1",
  "Personen-Anzahl: 2",
  "Druck 201 bar",
  "Restzeit 00:20:06",
  "Rückzugsdruck 50 bar",
  "Alarmende",
  "mit OK",
];

// verification-scenarios V1; timing-and-alarm-rules §2.2, 2.6; decided in "Decide how alarms are
// presented", points 1 to 3: S12 is live and sounds until OK
scenario(
  "the first Alarmgrenze sounds Alarm 1 at 9:54 of a 30-min Einsatzzeit",
  async (window) => {
    const { see, time } = window;
    await truppInAnmarsch(window);

    await time.passes({ minutes: 9, seconds: 53 });
    await see.alarmLed().isOff();
    await see.lcd().shows("01 markiert  2× Anmarsch  00:20:07");

    await time.passes({ seconds: 1 });
    await see.alarmLed().isBlinking();
    await see.lcd().reads(ALARM_1_AT_9_54);

    await time.passes({ minutes: 1 });
    await see.alarmLed().isBlinking();
    await see.lcd().shows("Restzeit 00:19:06");
  },
);

// timing-and-alarm-rules §8.4; decided in "Decide how alarms are presented", points 5 and 6
scenario(
  "the first OK silences Alarm 1 and the second ends it",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    await time.passes({ minutes: 9, seconds: 54 });

    await trainee.press("OK");
    await see.alarmLed().isOff();
    await see.lcd().reads(ALARM_1_AT_9_54);

    await trainee.press("OK");
    await see.alarmLed().isOff();
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:20:54",
        "01 markiert  2× Anmarsch  00:20:06",
      ]);
  },
);

// decided in "Drop the simulation to real time while an Alarm sounds", points 1 to 3, as amended
// in "Correct the simulator against the real Checkbox": 1× until the second OK
scenario(
  "the simulation drops to real time while Alarm 1 sounds",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    await trainee.setSpeed(10);

    // 59.4 s at 10× reach 9:54; the remaining 0.6 s run at 1×
    await time.passes({ minutes: 1 });
    await see.alarmLed().isBlinking();
    await see.lcd().shows("Restzeit 00:20:06");

    await time.passes({ seconds: 10 });
    await see.lcd().shows("Restzeit 00:19:56");

    await trainee.press("OK");
    await trainee.setSpeed(10);
    await time.passes({ seconds: 10 });
    await see.lcd().shows("Restzeit 00:19:46");

    await trainee.press("OK");
    await time.passes({ seconds: 10 });
    await see.lcd().shows("01 markiert  2× Anmarsch  00:19:36");

    await trainee.setSpeed(10);
    await time.passes({ seconds: 10 });
    await see.lcd().shows("01 markiert  2× Anmarsch  00:17:56");
  },
);
