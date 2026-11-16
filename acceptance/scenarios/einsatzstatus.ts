import { acceptFlaschendruck, chooseInTruppMenue, logIn } from "../recipes";
import type { Einsatzstatus } from "../recipes";
import { scenario } from "../scenario";
import type { TallyName, Window } from "../window";

const HLF_AT_F: TallyName = { fahrzeug: "HLF", role: "Angriffstruppführer" };
const HLF_AT_M: TallyName = { fahrzeug: "HLF", role: "Angriffstruppmann" };

// Trupp 01 in Anmarsch on the Einsatzliste, at 10× so the minutes pass in few clock steps.
async function truppInAnmarsch(window: Window): Promise<void> {
  await logIn(window, [HLF_AT_F, HLF_AT_M]);
  await window.trainee.press("X");
  await window.trainee.setSpeed(10);
}

// Simulated minutes at 10×.
async function simulated(
  { time }: Window,
  minutes: number,
  seconds = 0,
): Promise<void> {
  await time.passes({ seconds: (minutes * 60 + seconds) / 10 });
}

// The first OK silences the Alarm and the second ends it; both leave the simulation at 1×.
async function acknowledge({ trainee }: Window): Promise<void> {
  await trainee.press("OK");
  await trainee.press("OK");
  await trainee.setSpeed(10);
}

// manual 5.4 steps 3 to 5, Esz-Ziel erreicht figure; timing-and-alarm-rules §1.7: the estimate,
// snapped down to 5 bar; decided in "Define the key-by-screen navigation model", its pressure
// editor table
scenario(
  "Einsatzziel erreicht opens the Flaschendruck editor at the snapped estimate",
  async (window) => {
    await truppInAnmarsch(window);
    await simulated(window, 5, 4);

    await chooseInTruppMenue(window, "Einsatzziel erreicht", "Anmarsch");
    await window.see
      .lcd()
      .reads([
        "Esz-Ziel erreicht",
        "Flasche: 300 bar",
        "Druck 245 bar",
        "Restzeit 00:24:30",
      ]);
  },
);

// manual 5.4 steps 6 to 8; timing-and-alarm-rules §1.4, 5.4, 5.7; verification-scenarios V7;
// decided in "Correct the simulator against the real Checkbox": every pressure entry shows the
// Trupp-Ansicht
scenario(
  "OK on Esz-Ziel erreicht sets Einsatzziel erreicht and shows the Trupp-Ansicht",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 5);

    await chooseInTruppMenue(window, "Einsatzziel erreicht", "Anmarsch");
    await trainee.press("OK");
    await see
      .lcd()
      .reads([
        "Trupp 01 EINSATZ",
        "Personen-Anzahl: 2",
        "Druck 250 bar",
        "Restzeit 00:25:00",
        "Rückzugsdruck 100 bar",
        "Ansicht",
      ]);

    // manual 3.2.2
    await trainee.press("X");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:16:00",
        "01 markiert  2× Einsatzziel erreicht  00:25:00",
      ]);
  },
);

// verification-scenarios V9; decided in "Define the key-by-screen navigation model": X leaves the
// Einsatzstatus unchanged
scenario(
  "X on Esz-Ziel erreicht keeps Anmarsch and its Restzeit",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 8);

    await chooseInTruppMenue(window, "Einsatzziel erreicht", "Anmarsch");
    await trainee.press("Down");
    await trainee.press("X");
    await see
      .lcd()
      .reads([
        "Trupp 01 ANMARSCH",
        "*HLF AT-F",
        "*HLF AT-M",
        "Restzeit 00:22:00",
        "Trupp -> Einsatz",
        "Trupp -> Bereitschaft",
        "Einsatzziel erreicht",
        "Druck ändern",
      ]);

    await trainee.press("X");
    await see.lcd().shows("01 markiert  2× Anmarsch  00:22:00");
  },
);

// manual 5.7 steps 3 to 8, RÜCKMARSCH figure; timing-and-alarm-rules §1.4, 5.7: 300 → 250 bar on
// the Anmarsch gives a Rückzugsdruck of 100 bar
scenario(
  "OK on Rückzug antreten sets Rückmarsch and shows the Trupp-Ansicht",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 5);
    await acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch");
    await simulated(window, 1);

    await chooseInTruppMenue(
      window,
      "Rückzug antreten",
      "Einsatzziel erreicht",
    );
    await see.lcd().shows("Rückzug antreten");
    await trainee.press("OK");
    await see
      .lcd()
      .reads([
        "Trupp 01 RÜCKMARSCH",
        "Personen-Anzahl: 2",
        "Druck 240 bar",
        "Restzeit 00:24:00",
        "Rückzugsdruck 100 bar",
        "Ansicht",
      ]);

    // manual 3.2.2
    await trainee.press("X");
    await see.lcd().shows("01 markiert  2× Rückmarsch  00:24:00");
  },
);

// decided in "Define the key-by-screen navigation model": X leaves the Einsatzstatus unchanged
scenario(
  "X on Rückzug antreten keeps Einsatzziel erreicht and its Restzeit",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 3);
    await acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch");
    await simulated(window, 1);

    await chooseInTruppMenue(
      window,
      "Rückzug antreten",
      "Einsatzziel erreicht",
    );
    await trainee.press("Down");
    await trainee.press("X");
    await see.lcd().shows("Trupp 01 EINSATZ");

    await trainee.press("X");
    await see.lcd().shows("01 markiert  2× Einsatzziel erreicht  00:26:00");
  },
);

// decided in "Correct the simulator against the real Checkbox", navigation, and in "Define the
// key-by-screen navigation model", its Trupp-Menü table; timing-and-alarm-rules §12.5; manual
// 5.6.2, Trupp-Menü figure (EINSATZ); the real-device photo trupp-menue-anmarsch.jpeg
for (const { einsatzstatus, reach, title, restzeit, third } of [
  {
    einsatzstatus: "Anmarsch",
    reach: truppInAnmarsch,
    title: "Trupp 01 ANMARSCH",
    restzeit: "Restzeit 00:29:00",
    third: ["Einsatzziel erreicht"],
  },
  {
    einsatzstatus: "Einsatzziel erreicht",
    reach: async (window: Window) => {
      await truppInAnmarsch(window);
      await acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch");
    },
    title: "Trupp 01 EINSATZ",
    restzeit: "Restzeit 00:29:00",
    third: ["Rückzug antreten"],
  },
  {
    einsatzstatus: "Rückmarsch",
    reach: async (window: Window) => {
      await truppInAnmarsch(window);
      await acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch");
      await acceptFlaschendruck(
        window,
        "Rückzug antreten",
        "Einsatzziel erreicht",
      );
    },
    title: "Trupp 01 RÜCKMARSCH",
    restzeit: "Restzeit 00:29:00",
    third: [],
  },
  {
    einsatzstatus: "Bereitschaft",
    reach: async (window: Window) => {
      await logIn(window, [HLF_AT_F, HLF_AT_M], {
        anmeldeaktion: "Trupp OK Bereitschaft",
      });
      await window.trainee.press("X");
      await window.trainee.setSpeed(10);
    },
    title: "Trupp 01 BEREITSCHAFT",
    restzeit: "Restzeit 00:30:00",
    third: [],
  },
]) {
  scenario(
    `the Trupp-Menü of a Trupp in ${einsatzstatus} offers its items`,
    async (window) => {
      await reach(window);
      await simulated(window, 1);

      await window.trainee.press("OK");
      await window.see
        .lcd()
        .reads([
          title,
          "*HLF AT-F",
          "*HLF AT-M",
          restzeit,
          "Trupp -> Einsatz",
          "Trupp -> Bereitschaft",
          ...third,
          "Druck ändern",
        ]);
    },
  );
}

// timing-and-alarm-rules §12.2, 12.5, 12.6: Rückmarsch is final
scenario(
  "a Trupp in Rückmarsch is not sent back by `Trupp -> Einsatz`, only to Bereitschaft",
  async (window) => {
    const { see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 3);
    await acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch");
    await acceptFlaschendruck(
      window,
      "Rückzug antreten",
      "Einsatzziel erreicht",
    );

    await chooseInTruppMenue(window, "Trupp -> Einsatz", "Rückmarsch");
    await see.lcd().shows("01 markiert  2× Rückmarsch  00:27:00");

    await chooseInTruppMenue(window, "Trupp -> Bereitschaft", "Rückmarsch");
    await see.lcd().shows("01 markiert  2× Bereitschaft  00:27:00");
  },
);

// verification-scenarios V15; timing-and-alarm-rules §4.3, 4.4, 12.5: choosing the Einsatzstatus
// the Trupp has does nothing, so the Bereitschaft interval is not restarted
scenario(
  "choosing the Einsatzstatus the Trupp already has does nothing",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    await simulated(window, 3);

    await chooseInTruppMenue(window, "Trupp -> Einsatz", "Anmarsch");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:14:00",
        "01 markiert  2× Anmarsch  00:27:00",
      ]);

    await simulated(window, 3);
    await chooseInTruppMenue(window, "Trupp -> Bereitschaft", "Anmarsch");
    await see.lcd().shows("01 markiert  2× Bereitschaft  00:24:00");

    await simulated(window, 3);
    await chooseInTruppMenue(window, "Trupp -> Bereitschaft", "Bereitschaft");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:20:00",
        "01 markiert  2× Bereitschaft  00:24:00",
      ]);

    // the Bereitschaft Alarm, 5 min after 6:00
    await simulated(window, 1, 59);
    await see.alarmLed().isOff();
    await trainee.setSpeed(1);
    await time.passes({ seconds: 1 });
    await see.alarmLed().isBlinking();
  },
);

// timing-and-alarm-rules §4.1, 12.3
for (const { einsatzstatus, reach } of [
  { einsatzstatus: "Anmarsch", reach: () => Promise.resolve() },
  {
    einsatzstatus: "Einsatzziel erreicht",
    reach: (window: Window) =>
      acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch"),
  },
  {
    einsatzstatus: "Rückmarsch",
    reach: async (window: Window) => {
      await acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch");
      await acceptFlaschendruck(
        window,
        "Rückzug antreten",
        "Einsatzziel erreicht",
      );
    },
  },
] satisfies {
  readonly einsatzstatus: Einsatzstatus;
  readonly reach: (window: Window) => Promise<void>;
}[]) {
  scenario(
    `\`Trupp -> Bereitschaft\` from ${einsatzstatus} stops the Restzeit`,
    async (window) => {
      const { see } = window;
      await truppInAnmarsch(window);
      await simulated(window, 4);
      await reach(window);
      await see.lcd().shows(`01 markiert  2× ${einsatzstatus}  00:26:00`);

      await chooseInTruppMenue(window, "Trupp -> Bereitschaft", einsatzstatus);
      await see
        .lcd()
        .reads([
          "FF-Musterstadt",
          "B1- + 11:15:00",
          "01 markiert  2× Bereitschaft  00:26:00",
        ]);

      await simulated(window, 4);
      await see.lcd().shows("01 markiert  2× Bereitschaft  00:26:00");
    },
  );
}

// verification-scenarios V13; timing-and-alarm-rules §4.1, 4.3, 4.5, 4.6, 12.4: the Alarmgrenze at
// t_run 9:54 moves by the 6 min in Bereitschaft
scenario(
  "`Trupp -> Einsatz` restores Einsatzziel erreicht and moves the Alarmgrenze by the Bereitschaft",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    await simulated(window, 4);
    await acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch");
    await see.lcd().shows("01 markiert  2× Einsatzziel erreicht  00:26:00");

    await simulated(window, 4);
    await chooseInTruppMenue(
      window,
      "Trupp -> Bereitschaft",
      "Einsatzziel erreicht",
    );
    await see.lcd().shows("01 markiert  2× Bereitschaft  00:22:00");

    // the Bereitschaft Alarm, 5 min after 8:00
    await simulated(window, 5);
    await see.alarmLed().isBlinking();
    await acknowledge(window);

    await simulated(window, 1);
    await chooseInTruppMenue(window, "Trupp -> Einsatz", "Bereitschaft");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:25:00",
        "01 markiert  2× Einsatzziel erreicht  00:22:00",
      ]);

    await simulated(window, 1, 53);
    await see.alarmLed().isOff();
    await trainee.setSpeed(1);
    await time.passes({ seconds: 1 });
    await see.alarmLed().isBlinking();
    await see.lcd().shows("Trupp 01 ALARM 1");
  },
);

// timing-and-alarm-rules §4.6, 12.4
scenario(
  "`Trupp -> Einsatz` restores Anmarsch with its Restzeit running on",
  async (window) => {
    const { see } = window;
    await truppInAnmarsch(window);
    await simulated(window, 4);
    await chooseInTruppMenue(window, "Trupp -> Bereitschaft", "Anmarsch");

    // the Bereitschaft Alarm, 5 min after 4:00
    await simulated(window, 5);
    await acknowledge(window);
    await simulated(window, 1);

    await chooseInTruppMenue(window, "Trupp -> Einsatz", "Bereitschaft");
    await see.lcd().shows("01 markiert  2× Anmarsch  00:26:00");

    await simulated(window, 1);
    await see.lcd().shows("01 markiert  2× Anmarsch  00:25:00");
  },
);

// verification-scenarios V26; timing-and-alarm-rules §4.6, 12.4, 12.6
scenario(
  "`Trupp -> Einsatz` restores Rückmarsch with its Restzeit and its items",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    // 300 → 270 bar at 3:00 and 250 bar at 5:00, each accepted at the estimate
    await simulated(window, 3);
    await acceptFlaschendruck(window, "Einsatzziel erreicht", "Anmarsch");
    await simulated(window, 2);
    await acceptFlaschendruck(
      window,
      "Rückzug antreten",
      "Einsatzziel erreicht",
    );
    await see.lcd().shows("01 markiert  2× Rückmarsch  00:25:00");

    await simulated(window, 1);
    await chooseInTruppMenue(window, "Trupp -> Bereitschaft", "Rückmarsch");
    await simulated(window, 3);
    await chooseInTruppMenue(window, "Trupp -> Einsatz", "Bereitschaft");
    await see.lcd().shows("01 markiert  2× Rückmarsch  00:24:00");

    await simulated(window, 0, 30);
    await trainee.press("OK");
    await see
      .lcd()
      .reads([
        "Trupp 01 RÜCKMARSCH",
        "*HLF AT-F",
        "*HLF AT-M",
        "Restzeit 00:23:30",
        "Trupp -> Einsatz",
        "Trupp -> Bereitschaft",
        "Druck ändern",
      ]);
  },
);

// verification-scenarios V12; timing-and-alarm-rules §4.6, 12.1, 12.4
scenario(
  "`Trupp -> Einsatz` sends a Trupp logged in to Bereitschaft into Anmarsch",
  async (window) => {
    const { trainee, see } = window;
    await logIn(window, [HLF_AT_F, HLF_AT_M], {
      anmeldeaktion: "Trupp OK Bereitschaft",
    });
    // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
    await see.lcd().shows("Trupp 01 BEREITSCHAFT");
    await trainee.press("X");
    await trainee.setSpeed(10);

    // the Bereitschaft Alarm, 5 min after the login
    await simulated(window, 5);
    await acknowledge(window);
    await simulated(window, 1);

    await chooseInTruppMenue(window, "Trupp -> Einsatz", "Bereitschaft");
    await see.lcd().shows("01 markiert  2× Anmarsch  00:30:00");

    await simulated(window, 1);
    await see.lcd().shows("01 markiert  2× Anmarsch  00:29:00");
  },
);
