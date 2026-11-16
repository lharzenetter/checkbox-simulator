import { logIn } from "../recipes";
import { scenario } from "../scenario";
import type { TallyName, Window } from "../window";

const HLF_AT_F: TallyName = { fahrzeug: "HLF", role: "Angriffstruppführer" };
const LF_AT_F: TallyName = { fahrzeug: "LF", role: "Angriffstruppführer" };
const LF_AT_M: TallyName = { fahrzeug: "LF", role: "Angriffstruppmann" };

// The LCD text a Tally on Check shows: its Fahrzeug's Kurzname and its role code, read off the
// Tally as the first Atemschutzträger of a new login. X throws that login away again.
async function seeTallyRead(
  { trainee, see }: Window,
  tally: TallyName,
  lcdName: string,
): Promise<void> {
  await trainee.holdTally(tally);
  await see.lcd().shows(`*${lcdName}`);
  await trainee.press("X");
}

// manual 5.8, ABMELDEN figure: the LF Angriffstrupp logged in as Trupp 01, its Truppmann markiert.
const LF_ABMELDEN: readonly string[] = [
  "Trupp 01 ABMELDEN",
  "*LF AT-F",
  "*LF AT-M markiert",
  "OK  =  abmelden",
  " X  =  nicht abmelden",
];

// The LF Angriffstrupp logged in as Trupp 01, back on the Einsatzliste.
async function lfTruppInAnmarsch(window: Window): Promise<void> {
  await logIn(window, [LF_AT_F, LF_AT_M]);
  await window.trainee.press("X");
}

// decided in "Decide the contents of the fixed Tally roster"
scenario(
  "the default Roster's Tallys read as their Kurzname and role code",
  async (window) => {
    for (const fahrzeug of ["HLF", "LF"]) {
      await seeTallyRead(
        window,
        { fahrzeug, role: "Angriffstruppführer" },
        `${fahrzeug} AT-F`,
      );
      await seeTallyRead(
        window,
        { fahrzeug, role: "Angriffstruppmann" },
        `${fahrzeug} AT-M`,
      );
      await seeTallyRead(
        window,
        { fahrzeug, role: "Wassertruppführer" },
        `${fahrzeug} WT-F`,
      );
      await seeTallyRead(
        window,
        { fahrzeug, role: "Wassertruppmann" },
        `${fahrzeug} WT-M`,
      );
    }
  },
);

// decided in "Decide the contents of the fixed Tally roster"
scenario(
  "a renamed Fahrzeug's Tallys read as its new Kurzname",
  async (window) => {
    const { trainee } = window;
    await trainee.renameFahrzeug("HLF", "HLF 1");
    await trainee.renameFahrzeug("LF", "LF Süd");

    await seeTallyRead(
      window,
      { fahrzeug: "HLF 1", role: "Angriffstruppführer" },
      "HLF 1 AT-F",
    );
    await seeTallyRead(
      window,
      { fahrzeug: "LF Süd", role: "Wassertruppmann" },
      "LF Süd WT-M",
    );
  },
);

// decided in "Let the Trainee add and remove Fahrzeuge", points 1 and 6
scenario(
  "added Fahrzeuge bring four Tallys each, named after the first free prefill",
  async (window) => {
    const { trainee } = window;
    await trainee.addFahrzeug();
    await trainee.addFahrzeug();

    await seeTallyRead(
      window,
      { fahrzeug: "DLK", role: "Angriffstruppführer" },
      "DLK AT-F",
    );
    await seeTallyRead(
      window,
      { fahrzeug: "DLK", role: "Wassertruppmann" },
      "DLK WT-M",
    );
    await seeTallyRead(
      window,
      { fahrzeug: "TLF", role: "Angriffstruppmann" },
      "TLF AT-M",
    );
    await seeTallyRead(
      window,
      { fahrzeug: "TLF", role: "Wassertruppführer" },
      "TLF WT-F",
    );
  },
);

// decided in "Let the Trainee add and remove Fahrzeuge", point 6
scenario(
  "an added Fahrzeug skips a prefill whose Kurzname is taken, ignoring case",
  async (window) => {
    const { trainee } = window;
    await trainee.renameFahrzeug("HLF", "hlf");
    await trainee.renameFahrzeug("LF", "dlk");
    await trainee.addFahrzeug();

    await seeTallyRead(window, LF_AT_F, "LF AT-F");
  },
);

// decided in "Let the Trainee add and remove Fahrzeuge", point 7
scenario(
  "a Kurzname another Fahrzeug has, trimmed and ignoring case, is not kept",
  async (window) => {
    const { trainee } = window;
    await trainee.renameFahrzeug("LF", " hlf");

    await seeTallyRead(window, LF_AT_F, "LF AT-F");
  },
);

// decided in "Let the Trainee add and remove Fahrzeuge", point 3
scenario(
  "removing a Fahrzeug keeps another Fahrzeug's Tallys in their Trupp",
  async (window) => {
    const { trainee, see } = window;
    await lfTruppInAnmarsch(window);
    await trainee.removeFahrzeug("HLF");

    await trainee.holdTally(LF_AT_M);
    await see.lcd().reads(LF_ABMELDEN);
  },
);

// decided in "Let the Trainee add and remove Fahrzeuge", point 3: a new Fahrzeug never takes
// the Tallys of a Fahrzeug still on the Roster
scenario(
  "a Fahrzeug added after a removal brings Tallys of its own",
  async (window) => {
    const { trainee, see } = window;
    await trainee.addFahrzeug();
    await logIn(window, [
      { fahrzeug: "DLK", role: "Angriffstruppführer" },
      { fahrzeug: "DLK", role: "Angriffstruppmann" },
    ]);
    await trainee.press("X");
    await trainee.removeFahrzeug("HLF");
    await trainee.addFahrzeug();

    await trainee.holdTally(HLF_AT_F);
    await see
      .lcd()
      .reads([
        "Neuen Trupp anmelden:",
        "Wähle Einsatzzeit für",
        "Trupp Nr.: 02",
        "*HLF AT-F",
        "Einsatzzeit 30 min?",
        "Einsatzzeit 20 min?",
        "Einsatzzeit 180 min?",
      ]);
  },
);

// decided in "Let the Trainee add and remove Fahrzeuge", points 2 and 5
scenario(
  "a Fahrzeug with a logged-in Trupp stays on the Roster",
  async (window) => {
    const { trainee, see } = window;
    await lfTruppInAnmarsch(window);
    await trainee.removeFahrzeug("LF");

    await trainee.holdTally(LF_AT_M);
    await see.lcd().reads(LF_ABMELDEN);
  },
);

// decided in "Let the Trainee add and remove Fahrzeuge", points 2 and 5
scenario(
  "a Fahrzeug whose Tally is on the open Anmeldefenster stays on the Roster",
  async ({ trainee, see }) => {
    await trainee.holdTally(LF_AT_F);
    await trainee.press("OK");
    await trainee.removeFahrzeug("LF");

    await trainee.holdTally(LF_AT_M);
    await see.lcd().shows("*LF AT-M");
  },
);

// decided in "Let the Trainee add and remove Fahrzeuge", point 5
scenario("the last Fahrzeug stays on the Roster", async (window) => {
  const { trainee } = window;
  await trainee.removeFahrzeug("HLF");
  await trainee.removeFahrzeug("LF");

  await seeTallyRead(window, LF_AT_F, "LF AT-F");
});
