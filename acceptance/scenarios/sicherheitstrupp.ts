import { logIn } from "../recipes";
import { scenario } from "../scenario";
import type { TallyName, Window } from "../window";

const HLF_AT_F: TallyName = { fahrzeug: "HLF", role: "Angriffstruppführer" };
const HLF_AT_M: TallyName = { fahrzeug: "HLF", role: "Angriffstruppmann" };
const LF_AT_F: TallyName = { fahrzeug: "LF", role: "Angriffstruppführer" };
const LF_AT_M: TallyName = { fahrzeug: "LF", role: "Angriffstruppmann" };

// Trupp 01 logged in with `Sicherheitstrupp OK` for 30 min at 300 bar, on the Einsatzliste.
async function sicherheitstrupp({ trainee }: Window): Promise<void> {
  await trainee.holdTally(HLF_AT_F);
  await trainee.press("OK");
  await trainee.holdTally(HLF_AT_M);
  await trainee.press("Down");
  await trainee.press("Down");
  await trainee.press("OK");
  await trainee.press("OK");
  await trainee.press("X");
}

// Opens the Trupp-Menü from the Einsatzliste and chooses its first item, `Trupp -> Einsatz`.
async function truppEinsatz({ trainee }: Window): Promise<void> {
  await trainee.press("OK");
  await trainee.press("OK");
}

// Opens the Trupp-Menü from the Einsatzliste and chooses its second item,
// `Trupp -> Bereitschaft`, which goes straight back to the Einsatzliste.
async function truppBereitschaft({ trainee }: Window): Promise<void> {
  await trainee.press("OK");
  await trainee.press("Down");
  await trainee.press("OK");
}

// The Trupp-Menü's third item moves the Trupp on; OK accepts its Flaschendruck as it stands.
async function moveOn({ trainee }: Window): Promise<void> {
  await trainee.press("OK");
  await trainee.press("Down");
  await trainee.press("Down");
  await trainee.press("OK");
  await trainee.press("OK");
  await trainee.press("X");
}

// The real-device photo sicherheitstrupp-deaktivieren.jpeg: the box over Trupp 01's Trupp-Menü,
// with a static SICHER on the clock line.
const DEAKTIVIEREN_ASKED = [
  "Trupp 01 BEREITSCHAFT",
  "*HLF AT-F",
  "*HLF AT-M",
  "Restzeit 00:30:00 SICHER",
  "Trupp -> Einsatz",
  "Trupp -> Bereitschaft",
  "Druck ändern",
  "Sicherheitstrupp",
  "deaktivieren?",
  "[X]         [OK]",
];

// timing-and-alarm-rules §12.8; manual 5.3.1 step 4, Einsatzliste figure item 8
scenario(
  "`Sicherheitstrupp OK` logs a Sicherheitstrupp in, in Bereitschaft",
  async (window) => {
    const { trainee, see } = window;
    await trainee.holdTally(HLF_AT_F);
    await trainee.press("OK");
    await trainee.holdTally(HLF_AT_M);
    await trainee.press("Down");
    await trainee.press("Down");
    await trainee.press("OK");
    await trainee.press("OK");
    await see
      .lcd()
      .reads([
        "Trupp 01 BEREITSCHAFT",
        "Personen-Anzahl: 2",
        "Druck 300 bar",
        "Restzeit 00:30:00",
        "Rückzugsdruck 50 bar",
        "Ansicht",
      ]);

    await trainee.press("X");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "01 markiert  SICHER  00:30:00",
      ]);
  },
);

// manual 5.3.1 step 4; timing-and-alarm-rules §9 (1 s / 1 s), §9.1: the phase runs on real time,
// so 10× does not quicken it
for (const speed of [1, 10] as const) {
  scenario(
    `SICHER alternates with the Statussymbol every real second at ${String(speed)}×`,
    async (window) => {
      const { trainee, see, time } = window;
      await sicherheitstrupp(window);
      await trainee.setSpeed(speed);
      await see.lcd().shows("01 markiert  SICHER  00:30:00");

      await time.passes({ seconds: 0.95 });
      await see.lcd().shows("01 markiert  SICHER  00:30:00");

      await time.passes({ seconds: 0.05 });
      await see.lcd().shows("01 markiert  2× Bereitschaft  00:30:00");

      await time.passes({ seconds: 1 });
      await see.lcd().shows("01 markiert  SICHER  00:30:00");
    },
  );
}

// manual 5.3.1 step 4; timing-and-alarm-rules §12.8
scenario(
  "a Trupp logged in with `Trupp OK Bereitschaft` never shows SICHER",
  async ({ trainee, see, time }) => {
    await trainee.holdTally(HLF_AT_F);
    await trainee.press("OK");
    await trainee.holdTally(HLF_AT_M);
    await trainee.press("Down");
    await trainee.press("OK");
    await trainee.press("OK");
    await trainee.press("X");
    await see.lcd().shows("01 markiert  2× Bereitschaft  00:30:00");

    await time.passes({ seconds: 1 });
    await see.lcd().shows("01 markiert  2× Bereitschaft  00:30:00");
  },
);

// timing-and-alarm-rules §4.1, 4.3, 12.8: the Restzeit stays and no Bereitschaft Alarm sounds
scenario(
  "a Sicherheitstrupp in Bereitschaft keeps its Restzeit and never sounds the Bereitschaft Alarm",
  async (window) => {
    const { trainee, see, time } = window;
    await sicherheitstrupp(window);
    // 10× keeps the Playwright driver's clock steps few
    await trainee.setSpeed(10);

    // 5, 10, 15 and 30 min, then 60 min: each an even number of real seconds, so SICHER shows
    for (const seconds of [30, 30, 30, 90, 180]) {
      await time.passes({ seconds });
      await see.alarmLed().isOff();
      await see.lcd().shows("01 markiert  SICHER  00:30:00");
    }
  },
);

// the real-device photo trupp-menue-sicherheitstrupp.jpeg; timing-and-alarm-rules §12.8: static,
// not alternating as on the Einsatzliste
scenario(
  "the Trupp-Menü of a Sicherheitstrupp shows a static SICHER",
  async (window) => {
    const { trainee, see, time } = window;
    await sicherheitstrupp(window);

    await trainee.press("OK");
    for (let second = 0; second < 3; second += 1) {
      await see
        .lcd()
        .reads([
          "Trupp 01 BEREITSCHAFT",
          "*HLF AT-F",
          "*HLF AT-M",
          "Restzeit 00:30:00 SICHER",
          "Trupp -> Einsatz",
          "Trupp -> Bereitschaft",
          "Druck ändern",
        ]);
      await time.passes({ seconds: 1 });
    }
  },
);

// timing-and-alarm-rules §12.8; the real-device photo sicherheitstrupp-deaktivieren.jpeg
scenario(
  "`Trupp -> Einsatz` asks `Sicherheitstrupp deaktivieren?` before sending a Sicherheitstrupp in",
  async (window) => {
    await sicherheitstrupp(window);

    await truppEinsatz(window);
    await window.see.lcd().reads(DEAKTIVIEREN_ASKED);
  },
);

// timing-and-alarm-rules §12.8: X keeps the Sicherheitstrupp, so SICHER goes on alternating
scenario(
  "X on `Sicherheitstrupp deaktivieren?` sends it in still a Sicherheitstrupp",
  async (window) => {
    const { trainee, see, time } = window;
    await sicherheitstrupp(window);
    await truppEinsatz(window);

    await trainee.press("X");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "01 markiert  SICHER  00:30:00",
      ]);
    await time.passes({ seconds: 1 });
    await see.lcd().shows("01 markiert  2× Anmarsch  00:29:59");
    await time.passes({ seconds: 1 });
    await see.lcd().shows("01 markiert  SICHER  00:29:58");
  },
);

// timing-and-alarm-rules §12.8: OK sends it in as an ordinary Trupp, without SICHER
scenario(
  "OK on `Sicherheitstrupp deaktivieren?` sends it in as an ordinary Trupp",
  async (window) => {
    const { trainee, see, time } = window;
    await sicherheitstrupp(window);
    await truppEinsatz(window);

    await trainee.press("OK");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "01 markiert  2× Anmarsch  00:30:00",
      ]);
    await time.passes({ seconds: 2 });
    await see.lcd().shows("01 markiert  2× Anmarsch  00:29:58");
  },
);

// ASSUMPTION in reduce.ts: every other key is ignored while the box shows; for a Tally, taken in
// #52
scenario(
  "Up, Down, Check and a Tally leave `Sicherheitstrupp deaktivieren?` as it is",
  async (window) => {
    const { trainee, see } = window;
    await sicherheitstrupp(window);
    await truppEinsatz(window);

    for (const key of ["Up", "Down", "Check"] as const) {
      await trainee.press(key);
      await see.lcd().reads(DEAKTIVIEREN_ASKED);
    }
    for (const tally of [LF_AT_F, HLF_AT_F]) {
      await trainee.holdTally(tally);
      await see.lcd().reads(DEAKTIVIEREN_ASKED);
    }

    await trainee.press("X");
    await see.lcd().shows("01 markiert  SICHER  00:30:00");
  },
);

// timing-and-alarm-rules §12.8; ASSUMPTION in reduce.ts: asked each time it leaves Bereitschaft
scenario(
  "`Sicherheitstrupp deaktivieren?` asks again each time a Sicherheitstrupp leaves Bereitschaft",
  async (window) => {
    const { trainee, see } = window;
    await sicherheitstrupp(window);
    await truppEinsatz(window);
    await trainee.press("X");

    await truppBereitschaft(window);
    await see.lcd().shows("01 markiert  SICHER  00:30:00");
    await truppEinsatz(window);
    await see.lcd().reads(DEAKTIVIEREN_ASKED);
  },
);

// timing-and-alarm-rules §9 [13]; ASSUMPTION in reduce.ts, taken in #52
scenario(
  "`Sicherheitstrupp deaktivieren?` closes with the Trupp-Menü after 15 s without a key",
  async (window) => {
    const { see, time } = window;
    await sicherheitstrupp(window);
    await truppEinsatz(window);

    await time.passes({ seconds: 14 });
    await see.lcd().reads(DEAKTIVIEREN_ASKED);

    await time.passes({ seconds: 1 });
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:15",
        "01 markiert  SICHER  00:30:00",
      ]);
    await time.passes({ seconds: 1 });
    await see.lcd().shows("01 markiert  2× Bereitschaft  00:30:00");

    // still a Sicherheitstrupp, so `Trupp -> Einsatz` asks again
    await truppEinsatz(window);
    await see.lcd().reads(DEAKTIVIEREN_ASKED);
  },
);

// timing-and-alarm-rules §8.2, 8.4: S12 takes over from any screen and gives it back unchanged
scenario(
  "`Sicherheitstrupp deaktivieren?` shows again after an Alarm that interrupted it",
  async (window) => {
    const { trainee, see, time } = window;
    await sicherheitstrupp(window);
    // Trupp 02 in Anmarsch reaches its first Alarmgrenze at 9:54 into its Einsatz
    await logIn(window, [LF_AT_F, LF_AT_M]);
    await trainee.press("X");
    await trainee.press("Up");
    await time.passes({ minutes: 9, seconds: 50 });

    await truppEinsatz(window);
    await see.lcd().reads(DEAKTIVIEREN_ASKED);

    await time.passes({ seconds: 4 });
    await see.alarmLed().isBlinking();
    await see.lcd().shows("Trupp 02 ALARM 1");

    await trainee.press("OK");
    await trainee.press("OK");
    await see.lcd().reads(DEAKTIVIEREN_ASKED);

    await trainee.press("X");
    await see.lcd().shows("01 markiert  SICHER  00:30:00");
    await time.passes({ seconds: 1 });
    await see.lcd().shows("01 markiert  2× Anmarsch  00:29:59");
  },
);

// timing-and-alarm-rules §12.8: once deactivated, `Trupp -> Einsatz` sends it straight in
scenario(
  "a deactivated Sicherheitstrupp is not asked again",
  async (window) => {
    const { trainee, see } = window;
    await sicherheitstrupp(window);
    await truppEinsatz(window);
    await trainee.press("OK");

    await truppBereitschaft(window);
    await see.lcd().shows("01 markiert  2× Bereitschaft  00:30:00");
    await truppEinsatz(window);
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "01 markiert  2× Anmarsch  00:30:00",
      ]);
  },
);

// timing-and-alarm-rules §4.3, 4.4: the Bereitschaft Alarm sounds 5 min into the Bereitschaft
scenario(
  "a deactivated Sicherheitstrupp gets the Bereitschaft Alarm on its next Bereitschaft",
  async (window) => {
    const { trainee, see, time } = window;
    await sicherheitstrupp(window);
    await truppEinsatz(window);
    await trainee.press("OK");
    await time.passes({ minutes: 4 });
    await truppBereitschaft(window);

    await time.passes({ minutes: 4, seconds: 59 });
    await see.alarmLed().isOff();

    await time.passes({ seconds: 1 });
    await see.alarmLed().isBlinking();
    await see.lcd().shows("Trupp 01 BEREITSCHAFT");
  },
);

// timing-and-alarm-rules §4.3, 12.8
scenario(
  "a Sicherheitstrupp sent in with X gets no Bereitschaft Alarm on its next Bereitschaft",
  async (window) => {
    const { trainee, see, time } = window;
    await sicherheitstrupp(window);
    await truppEinsatz(window);
    await trainee.press("X");
    await time.passes({ minutes: 4 });
    await truppBereitschaft(window);
    // 10× keeps the Playwright driver's clock steps few
    await trainee.setSpeed(10);

    // 5 and 10 min into the Bereitschaft
    for (const seconds of [30, 30]) {
      await time.passes({ seconds });
      await see.alarmLed().isOff();
      await see.lcd().shows(/^01 markiert {2}SICHER {2}/);
    }
  },
);

// verification-scenarios V16; timing-and-alarm-rules §12.8; manual 5.3.1 step 4
scenario(
  "a Sicherheitstrupp keeps SICHER through every Einsatzstatus",
  async (window) => {
    const { trainee, see, time } = window;
    await sicherheitstrupp(window);

    await truppEinsatz(window);
    await trainee.press("X");
    await see.lcd().shows(/^01 markiert {2}SICHER {2}/);
    await time.passes({ seconds: 1 });
    await see.lcd().shows(/^01 markiert {2}2× Anmarsch {2}/);

    await moveOn(window);
    await see.lcd().shows(/^01 markiert {2}SICHER {2}/);
    await time.passes({ seconds: 1 });
    await see.lcd().shows(/^01 markiert {2}2× Einsatzziel erreicht {2}/);

    await moveOn(window);
    await see.lcd().shows(/^01 markiert {2}SICHER {2}/);
    await time.passes({ seconds: 1 });
    await see.lcd().shows(/^01 markiert {2}2× Rückmarsch {2}/);

    await truppBereitschaft(window);
    await see.lcd().shows(/^01 markiert {2}SICHER {2}/);
    await time.passes({ seconds: 1 });
    await see.lcd().shows(/^01 markiert {2}2× Bereitschaft {2}/);
  },
);
