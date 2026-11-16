import type { Key } from "../../src/core/index";
import { logIn, logOff } from "../recipes";
import { scenario } from "../scenario";
import type { TallyName, Window } from "../window";

const HLF_AT_F: TallyName = { fahrzeug: "HLF", role: "Angriffstruppführer" };
const HLF_AT_M: TallyName = { fahrzeug: "HLF", role: "Angriffstruppmann" };
const LF_AT_F: TallyName = { fahrzeug: "LF", role: "Angriffstruppführer" };
const LF_AT_M: TallyName = { fahrzeug: "LF", role: "Angriffstruppmann" };

const X_AND_CHECK: readonly Key[] = ["X", "Check"];

// The Notausschaltung starts from the Einsatzliste rather than the Trupp-Ansicht the login ends on.
async function truppInAnmarsch(window: Window): Promise<void> {
  await logIn(window, [HLF_AT_F, HLF_AT_M]);
  await window.trainee.press("X");
}

// Logged in second, Trupp 02 is the markiert one.
async function twoTrupps(window: Window): Promise<void> {
  await truppInAnmarsch(window);
  await logIn(window, [LF_AT_F, LF_AT_M]);
  await window.trainee.press("X");
}

// manual 5.9 step 2: X and Check held together for about 4 s
async function openNotausschaltung({ trainee }: Window): Promise<void> {
  await trainee.holdTogether(X_AND_CHECK, { seconds: 4 });
}

// manual 5.9 step 2, right figure
function auswahl(markierterTrupp: string): readonly string[] {
  return [
    "A C H T U N G !",
    "Einsatz-ABBRUCH",
    "fuer . . .",
    `-> markierten Trupp ${markierterTrupp}`,
    "-> alle Trupps",
    "-> zurueck",
  ];
}

// manual 5.9 step 4, left figure, verbatim with its mixed `druecken` and `drücken`
const BESTAETIGUNG = [
  "A C H T U N G !",
  "WOLLEN SIE",
  "WIRKLICH DEN/DIE",
  "TRUPP(S) LOESCHEN?",
  "dann OK druecken",
  "sonst die X Taste",
  "drücken",
];

// Both Trupps of `twoTrupps` after the 4 s hold at 1×.
const TWO_TRUPPS_AFTER_HOLD = [
  "FF-Musterstadt",
  "B1- + 11:11:04",
  "01  2× Anmarsch  00:29:56",
  "02 markiert  2× Anmarsch  00:29:56",
];

// manual 5.9 step 2; verification-scenarios V23: 4 s of real time, not 0.4 s, at 10×
scenario(
  "holding X and Check for 4 s of real time opens the Notausschaltung, even at 10×",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await trainee.setSpeed(10);

    await trainee.holdTogether(X_AND_CHECK, { seconds: 3 });
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:30",
        "01 markiert  2× Anmarsch  00:29:30",
      ]);

    await openNotausschaltung(window);
    await see.lcd().reads(auswahl("01"));
  },
);

// manual 5.9 step 2: X and Check held together, each hold measured afresh
scenario(
  "letting go of X and Check early does nothing, and two short holds do not add up",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);

    await trainee.holdTogether(X_AND_CHECK, { seconds: 3 });
    await time.passes({ seconds: 5 });
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:08",
        "01 markiert  2× Anmarsch  00:29:52",
      ]);

    await trainee.holdTogether(X_AND_CHECK, { seconds: 3 });
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:11",
        "01 markiert  2× Anmarsch  00:29:49",
      ]);
  },
);

// manual 5.9 step 2: both Keys
scenario("holding X alone does nothing", async (window) => {
  const { trainee, see } = window;
  await truppInAnmarsch(window);

  await trainee.hold("X", { seconds: 10 });
  await see
    .lcd()
    .reads([
      "FF-Musterstadt",
      "B1- + 11:11:10",
      "01 markiert  2× Anmarsch  00:29:50",
    ]);
});

// ASSUMPTION: S14 opens on the markiert Trupp ("Define the key-by-screen navigation model"), so
// without one the hold does nothing
scenario(
  "holding X and Check on an empty Einsatzliste does nothing",
  async (window) => {
    const { see } = window;
    await truppInAnmarsch(window);
    await logOff(window, [HLF_AT_F, HLF_AT_M]);

    await openNotausschaltung(window);
    await see.lcd().reads(["FF-Musterstadt", "B1- + 11:11:04"]);
  },
);

// decided in "Decide how alarms are presented", point 6: the Alarm is acknowledged first
scenario("holding X and Check on Trupp ALARM does nothing", async (window) => {
  const { trainee, see, time } = window;
  await truppInAnmarsch(window);
  await trainee.setSpeed(10);
  // the first Alarmgrenze, 9:54 of the 30 min Einsatzzeit; timing-and-alarm-rules §2
  await time.passes({ seconds: 59.4 });
  await see.lcd().shows("Trupp 01 ALARM 1");

  await openNotausschaltung(window);
  await see.lcd().shows("Trupp 01 ALARM 1");
  await see.alarmLed().isBlinking();
});

// decided in "Define the key-by-screen navigation model": the cursor starts on the markiert
// Trupp; manual 5.9 steps 4 and 5, p. 31
scenario(
  "OK on `-> markierten Trupp` and OK on the confirmation end only the markiert Trupp",
  async (window) => {
    const { trainee, see } = window;
    await twoTrupps(window);

    await openNotausschaltung(window);
    await see.lcd().reads(auswahl("02"));

    await trainee.press("OK");
    await see.lcd().reads(BESTAETIGUNG);

    await trainee.press("OK");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:04",
        "01 markiert  2× Anmarsch  00:29:56",
      ]);
  },
);

// manual 5.9 steps 3 to 5
scenario(
  "OK on `-> alle Trupps` and OK on the confirmation end every Trupp",
  async (window) => {
    const { trainee, see } = window;
    await twoTrupps(window);
    await openNotausschaltung(window);

    await trainee.press("Down");
    await trainee.press("OK");
    await see.lcd().reads(BESTAETIGUNG);

    await trainee.press("OK");
    await see.lcd().reads(["FF-Musterstadt", "B1- + 11:11:04"]);
  },
);

// manual 5.9 step 3: Up from the top wraps to `-> zurueck`; decided in "Define the key-by-screen
// navigation model"
scenario(
  "Up wraps to `-> zurueck`, whose OK returns to the Einsatzliste with every Trupp unchanged",
  async (window) => {
    const { trainee, see } = window;
    await twoTrupps(window);
    await openNotausschaltung(window);

    await trainee.press("Up");
    await trainee.press("OK");
    await see.lcd().reads(TWO_TRUPPS_AFTER_HOLD);
  },
);

// ASSUMPTION: X and Check are inert on S14, which only `-> zurueck` leaves (reduce); decided in
// "Define the key-by-screen navigation model", its "Tally on Check" table
scenario(
  "X, Check and a Tally leave the Notausschaltung as it is",
  async (window) => {
    const { trainee, see } = window;
    await twoTrupps(window);
    await openNotausschaltung(window);

    await trainee.press("X");
    await trainee.press("Check");
    await trainee.holdTally(HLF_AT_F);
    await see.lcd().reads(auswahl("02"));

    // the cursor has not moved either
    await trainee.press("OK");
    await trainee.press("OK");
    await see.lcd().shows("01 markiert  2× Anmarsch  00:29:56");
  },
);

// manual 5.9 step 5; decided in "Define the key-by-screen navigation model"
for (const key of ["Up", "Down", "X", "Check"] satisfies Key[]) {
  scenario(
    `${key} on the confirmation cancels the Notausschaltung, every Trupp unchanged`,
    async (window) => {
      const { trainee, see } = window;
      await twoTrupps(window);
      await openNotausschaltung(window);
      await trainee.press("Down");
      await trainee.press("OK");

      await trainee.press(key);
      await see.lcd().reads(TWO_TRUPPS_AFTER_HOLD);
    },
  );
}

// decided in "Define the key-by-screen navigation model", its "Tally on Check" table
scenario("a Tally leaves the confirmation as it is", async (window) => {
  const { trainee, see } = window;
  await twoTrupps(window);
  await openNotausschaltung(window);
  await trainee.press("OK");

  await trainee.holdTally(HLF_AT_F);
  await see.lcd().reads(BESTAETIGUNG);
});

// manual p. 34: the empty Einsatzliste switches off after the Abschaltzeit
scenario(
  "the Checkbox switches off once the Abschaltzeit runs out after the Notausschaltung",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    await openNotausschaltung(window);
    await trainee.press("OK");
    await trainee.press("OK");

    await time.passes({ seconds: 24 });
    await see.lcd().reads(["FF-Musterstadt", "B1- + 11:11:28"]);

    await time.passes({ seconds: 1 });
    await see.lcd().isOff();
  },
);

// Trupp 01 in Anmarsch and Trupp 02 logged in to Bereitschaft, markiert, on the Einsatzliste.
async function anmarschAndBereitschaft(window: Window): Promise<void> {
  const { trainee } = window;
  await truppInAnmarsch(window);
  await trainee.holdTally(LF_AT_F);
  await trainee.press("OK");
  await trainee.holdTally(LF_AT_M);
  await trainee.press("Down");
  await trainee.press("OK");
  await trainee.press("OK");
  await trainee.press("X");
}

// decided in "Decide how alarms are presented", points 4 and 5: S12 takes over and the second OK
// returns to the interrupted screen
scenario(
  "an Alarm interrupts the Notausschaltung, which returns with the same choice afterwards",
  async (window) => {
    const { trainee, see, time } = window;
    await anmarschAndBereitschaft(window);
    await trainee.setSpeed(10);
    await openNotausschaltung(window);
    await trainee.press("Down");

    // Trupp 02's first Bereitschaft Alarm at 5 min; timing-and-alarm-rules §4.3
    await time.passes({ seconds: 26 });
    await see.alarmLed().isBlinking();

    await trainee.press("OK");
    await trainee.press("OK");
    await see.lcd().reads(auswahl("02"));

    await trainee.press("OK");
    await trainee.press("OK");
    await see.lcd().reads([/^FF-Musterstadt$/, /^B1- \+ /]);
  },
);

// The Checkbox, off after the Abschaltzeit, woken to SERVICE → `Einsatzprotokoll`; manual 5.10.
async function openEinsatzprotokolle(window: Window): Promise<void> {
  const { trainee, time } = window;
  await time.passes({ seconds: 25 });
  await trainee.press("Check");
  await trainee.press("OK");
  await trainee.press("OK");
}

// manual 5.10 figure, as far as the LCD shows it: a Trupp of a Fahrzeug's AT-F and AT-M, logged
// in at 11:11:00 and ended 4 s later
function einsatzprotokoll(
  einsatzNr: string,
  truppNr: string,
  fahrzeug: string,
): readonly string[] {
  return [
    "Einsatzprotokoll",
    `Einsatz Nr: ${einsatzNr}`,
    "Datum: 12.04.17",
    `TruppNr/EZT: ${truppNr}/030`,
    "Einsatzkräfte:",
    `${fahrzeug} AT-F`,
    `${fahrzeug} AT-M`,
    "Einsatz von: 11:11:00",
    "bis: 11:11:04",
    "davon aktiv: 00:00:04",
    "Notausschaltung",
  ];
}

// manual p. 31: "Die Notausschaltung wird im Einsatzprotokoll gespeichert"; decided in "Show the
// Einsatzprotokolle on the LCD", point 6
scenario(
  "the Notausschaltung of the markiert Trupp writes its Einsatzprotokoll",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await openNotausschaltung(window);
    await trainee.press("OK");
    await trainee.press("OK");

    await openEinsatzprotokolle(window);
    await see.lcd().reads(einsatzprotokoll("00001", "01", "HLF"));
  },
);

// manual p. 31; decided in "Show the Einsatzprotokolle on the LCD", points 2 and 6: one
// Einsatzprotokoll, and one Einsatz Nr, for every Trupp ended
scenario(
  "the Notausschaltung of all Trupps writes an Einsatzprotokoll for each",
  async (window) => {
    const { trainee, see } = window;
    await twoTrupps(window);
    await openNotausschaltung(window);
    await trainee.press("Down");
    await trainee.press("OK");
    await trainee.press("OK");

    await openEinsatzprotokolle(window);
    await see.lcd().reads(einsatzprotokoll("00002", "02", "LF"));

    // Down scrolls one line, so the newer record's 16 lines, its rules included, bring the older
    // one to the top
    for (let line = 0; line < 16; line += 1) {
      await trainee.press("Down");
    }
    await see.lcd().reads(einsatzprotokoll("00001", "01", "HLF"));
  },
);
