import { logIn, logInToBereitschaft, logOff } from "../recipes";
import { scenario } from "../scenario";
import type { TallyName, Window } from "../window";

const HLF_AT_F: TallyName = { fahrzeug: "HLF", role: "Angriffstruppführer" };
const HLF_AT_M: TallyName = { fahrzeug: "HLF", role: "Angriffstruppmann" };
const LF_AT_F: TallyName = { fahrzeug: "LF", role: "Angriffstruppführer" };
const LF_AT_M: TallyName = { fahrzeug: "LF", role: "Angriffstruppmann" };

// ABMELDEN starts from the Einsatzliste rather than the Trupp-Ansicht the login ends on.
async function truppInAnmarsch(window: Window): Promise<void> {
  await logIn(window, [HLF_AT_F, HLF_AT_M]);
  await window.trainee.press("X");
}

// manual 5.8, ABMELDEN figure: Trupp 01's two Atemschutzträger, each markiert or not.
function abmelden(atF: string, atM: string): readonly string[] {
  return [
    "Trupp 01 ABMELDEN",
    atF,
    atM,
    "OK  =  abmelden",
    " X  =  nicht abmelden",
  ];
}

// manual 5.8 step 1, ABMELDEN figure; decided in "Define the key-by-screen navigation model"
scenario(
  "an Atemschutzträger's Tally on Check opens ABMELDEN with them markiert",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);

    await trainee.holdTally(HLF_AT_M);
    await see.lcd().reads(abmelden("*HLF AT-F", "*HLF AT-M markiert"));
  },
);

// manual 5.8 steps 2 to 4; timing-and-alarm-rules §7.4, 12.7: no logoff without OK
scenario(
  "OK logs the Trupp off once every Atemschutzträger is markiert",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);

    await trainee.holdTally(HLF_AT_M);
    await trainee.holdTally(HLF_AT_F);
    await see.lcd().reads(abmelden("*HLF AT-F markiert", "*HLF AT-M markiert"));

    await trainee.press("OK");
    await see.lcd().reads(["FF-Musterstadt", "B1- + 11:11:00"]);
    await see.alarmLed().isOff();
  },
);

// timing-and-alarm-rules §12.7: no logoff with anyone missing; daueralarm.ts states the logoff
// Daueralarm this starts
scenario(
  "OK does not log the Trupp off while an Atemschutzträger is not markiert",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);

    await trainee.holdTally(HLF_AT_F);
    await trainee.press("OK");
    await see.lcd().reads(abmelden("*HLF AT-F markiert", "*HLF AT-M"));
  },
);

// manual 5.8 step 4; timing-and-alarm-rules §7.4; decided in "Define the key-by-screen navigation
// model"
scenario(
  "X leaves ABMELDEN with the Trupp still logged in and its marks cleared",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);

    await trainee.holdTally(HLF_AT_F);
    await trainee.holdTally(HLF_AT_M);
    await trainee.press("X");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "01 markiert  2× Anmarsch  00:30:00",
      ]);

    await trainee.holdTally(HLF_AT_M);
    await see.lcd().reads(abmelden("*HLF AT-F", "*HLF AT-M markiert"));
  },
);

// Logged in second, Trupp 02 is the markiert one.
async function twoTrupps(window: Window): Promise<void> {
  await truppInAnmarsch(window);
  await logIn(window, [LF_AT_F, LF_AT_M]);
  await window.trainee.press("X");
}

// ASSUMPTION: the selection after a logoff, as in `selectionAfterEnding`; "Define the
// key-by-screen navigation model" does not say
scenario(
  "the markiert Trupp stays markiert when another Trupp logs off",
  async (window) => {
    await twoTrupps(window);
    await window.see.lcd().shows("02 markiert  2× Anmarsch  00:30:00");

    await logOff(window, [HLF_AT_F, HLF_AT_M]);
    await window.see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "02 markiert  2× Anmarsch  00:30:00",
      ]);
  },
);

// ASSUMPTION: as above
scenario(
  "the first remaining Trupp is markiert when the markiert one logs off",
  async (window) => {
    await twoTrupps(window);

    await logOff(window, [LF_AT_F, LF_AT_M]);
    await window.see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "01 markiert  2× Anmarsch  00:30:00",
      ]);
  },
);

// manual p. 34; timing-and-alarm-rules §9.1: the Abschaltzeit runs on real time, so 10× does not
// shorten it
scenario(
  "the Checkbox switches off once the Abschaltzeit runs out after the last logoff",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    await time.passes({ minutes: 1 });
    await see.lcd().shows("01 markiert  2× Anmarsch  00:29:00");

    await trainee.setSpeed(10);
    await logOff(window, [HLF_AT_F, HLF_AT_M]);
    await time.passes({ seconds: 24 });
    await see.lcd().reads(["FF-Musterstadt", "B1- + 11:16:00"]);

    await time.passes({ seconds: 1 });
    await see.lcd().isOff();
  },
);

// Trupp 01 logged in to Bereitschaft with `Trupp OK Bereitschaft`, on the Einsatzliste.
async function truppInBereitschaft(window: Window): Promise<void> {
  await logInToBereitschaft(window, [HLF_AT_F, HLF_AT_M]);
  await window.trainee.press("X");
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

// timing-and-alarm-rules §12.7; verification-scenarios V17
for (const { einsatzstatus, reach, row } of [
  {
    einsatzstatus: "Anmarsch",
    reach: truppInAnmarsch,
    row: "01 markiert  2× Anmarsch  00:26:00",
  },
  {
    einsatzstatus: "Einsatzziel erreicht",
    reach: async (window: Window) => {
      await truppInAnmarsch(window);
      await moveOn(window);
    },
    row: "01 markiert  2× Einsatzziel erreicht  00:26:00",
  },
  {
    einsatzstatus: "Rückmarsch",
    reach: async (window: Window) => {
      await truppInAnmarsch(window);
      await moveOn(window);
      await moveOn(window);
    },
    row: "01 markiert  2× Rückmarsch  00:26:00",
  },
  {
    einsatzstatus: "Bereitschaft",
    reach: truppInBereitschaft,
    row: "01 markiert  2× Bereitschaft  00:30:00",
  },
]) {
  scenario(
    `a Trupp in ${einsatzstatus} logs off and none of its Alarms fire afterwards`,
    async (window) => {
      const { trainee, see, time } = window;
      await reach(window);
      // 10× keeps the Playwright driver's clock steps few
      await trainee.setSpeed(10);
      // 4 min: short of the first Alarmgrenze (9:54) and the Bereitschaft Alarm (5:00), so no
      // Alarm takes over ABMELDEN
      await time.passes({ seconds: 24 });
      await see.lcd().shows(row);

      // Trupp 02 keeps the Checkbox on past the Abschaltzeit; its own first Alarmgrenze is 9:54 away
      await logIn(window, [LF_AT_F, LF_AT_M]);
      await trainee.press("X");
      await logOff(window, [HLF_AT_F, HLF_AT_M]);
      await see
        .lcd()
        .reads([
          "FF-Musterstadt",
          "B1- + 11:15:00",
          "02 markiert  2× Anmarsch  00:30:00",
        ]);

      // 7 min more: past where Trupp 01's next Alarm would have sounded
      await time.passes({ seconds: 42 });
      await see.alarmLed().isOff();
      await see.lcd().shows("02 markiert  2× Anmarsch  00:23:00");
    },
  );
}
