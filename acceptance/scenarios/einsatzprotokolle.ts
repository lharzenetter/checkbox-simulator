import { logIn, logOff, openEinsatzprotokoll, powerOn } from "../recipes";
import { scenario } from "../scenario";
import type { TallyName, Window } from "../window";

const HLF_AT_F: TallyName = { fahrzeug: "HLF", role: "Angriffstruppführer" };
const HLF_AT_M: TallyName = { fahrzeug: "HLF", role: "Angriffstruppmann" };

// manual 5.2, SERVICE figure
const SERVICE = [
  "SERVICE",
  "Einsatzprotokoll",
  "Zeit/Datum einstellen",
  "Kontrast",
  "Testprogramm",
];

const KEIN_PROTOKOLL = ["Einsatzprotokoll", "Kein Protokoll"];

// manual 5.10, S16 figure, for the Einsatz of `einsatzOfTrupp01`
const AELTERES_PROTOKOLL = [
  "Einsatzprotokoll",
  "Einsatz Nr: 00001",
  "Datum: 12.04.17",
  "TruppNr/EZT: 01/030",
  "Einsatzkräfte:",
  "HLF AT-F",
  "HLF AT-M",
  "Einsatz von: 11:11:00",
  "bis: 11:15:00",
  "davon aktiv: 00:04:00",
  "Protokoll Ende",
];

// Trupp 01 logs in at 11:11:00 and off at 11:15:00; the Abschaltzeit then switches the Checkbox
// off, ready for Check to wake it to the Startdisplay.
async function einsatzOfTrupp01(window: Window): Promise<void> {
  const { trainee, time } = window;
  await logIn(window, [HLF_AT_F, HLF_AT_M]);
  await trainee.press("X");
  // 10× keeps the Playwright driver's clock steps few; 4 min stays short of the first Alarmgrenze
  await trainee.setSpeed(10);
  await time.passes({ seconds: 24 });
  await logOff(window, [HLF_AT_F, HLF_AT_M]);
  await time.passes({ seconds: 25 });
}

// manual 5.2
scenario("OK on the Startdisplay opens SERVICE", async (window) => {
  await powerOn(window);
  await window.trainee.press("OK");
  await window.see.lcd().reads(SERVICE);
});

// manual 5.2; decided in "Show the Einsatzprotokolle on the LCD": SERVICE does not time out and
// the Startdisplay's Abschaltzeit starts afresh
scenario(
  "X on SERVICE returns to the Startdisplay with the Abschaltzeit afresh",
  async (window) => {
    const { trainee, see, time } = window;
    await powerOn(window);
    await trainee.press("OK");
    await time.passes({ seconds: 30 });
    await see.lcd().reads(SERVICE);

    await trainee.press("X");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "V04.02.23  #12345",
        "B1- + 88%",
        "12.04.17     11:11:30",
        "OK für SERVICE",
        "oder TALLY auflegen",
        "sonst Ende in  >  25",
      ]);
  },
);

// manual 5.10 steps 3 and 4: the bar starts on Einsatzprotokoll
scenario(
  "OK on SERVICE opens the Einsatzprotokoll screen, Kein Protokoll with none stored",
  async (window) => {
    const { trainee, see } = window;
    await openEinsatzprotokoll(window);
    await see.lcd().reads(KEIN_PROTOKOLL);

    // decided in "Show the Einsatzprotokolle on the LCD", point 5: nothing to scroll
    await trainee.press("Down");
    await trainee.press("Up");
    await see.lcd().reads(KEIN_PROTOKOLL);
  },
);

// manual 5.10 step 3; decided in "Draw the simulator's scope": the other items are inert
for (const [item, downs] of [
  ["Zeit/Datum einstellen", 1],
  ["Kontrast", 2],
  ["Testprogramm", 3],
] as const) {
  scenario(
    `Down moves the bar to ${item}, where OK does nothing, and Up back`,
    async (window) => {
      const { trainee, see } = window;
      await powerOn(window);
      await trainee.press("OK");
      for (let step = 0; step < downs; step++) {
        await trainee.press("Down");
      }
      await trainee.press("OK");
      await see.lcd().reads(SERVICE);

      for (let step = 0; step < downs; step++) {
        await trainee.press("Up");
      }
      await trainee.press("OK");
      await see.lcd().reads(KEIN_PROTOKOLL);
    },
  );
}

// ASSUMPTION: every choice screen wraps ("Show the Einsatzprotokolle on the LCD", point 1)
scenario("the bar on SERVICE wraps both ways", async (window) => {
  const { trainee, see } = window;
  await powerOn(window);
  await trainee.press("OK");
  await trainee.press("Up");
  await trainee.press("OK");
  await see.lcd().reads(SERVICE);

  await trainee.press("Down");
  await trainee.press("OK");
  await see.lcd().reads(KEIN_PROTOKOLL);
});

// manual p. 17: a Tally on Check is ignored on SERVICE
scenario("SERVICE ignores Check and Tallys", async (window) => {
  const { trainee, see } = window;
  await powerOn(window);
  await trainee.press("OK");
  await trainee.press("Check");
  await trainee.holdTally(HLF_AT_F);
  await see.lcd().reads(SERVICE);

  await trainee.press("OK");
  await see.lcd().reads(KEIN_PROTOKOLL);
});

// manual 5.8 step 4, 5.10, S16 figure; decided in "Show the Einsatzprotokolle on the LCD", point 2
scenario(
  "a logoff writes an Einsatzprotokoll, shown as in the figure",
  async (window) => {
    await einsatzOfTrupp01(window);
    await openEinsatzprotokoll(window);
    await window.see.lcd().reads(AELTERES_PROTOKOLL);
  },
);

// ASSUMPTION: `davon aktiv` is `t_run` ("Show the Einsatzprotokolle on the LCD", point 3)
scenario(
  "davon aktiv counts only the time the Trupp spent outside Bereitschaft",
  async (window) => {
    const { trainee, see, time } = window;
    await logIn(window, [HLF_AT_F, HLF_AT_M]);
    await trainee.press("X");
    await trainee.setSpeed(10);
    await time.passes({ seconds: 18 });
    // the Trupp-Menü's second item sends the Trupp to Bereitschaft
    await trainee.press("OK");
    await trainee.press("Down");
    await trainee.press("OK");
    await trainee.press("X");
    await time.passes({ seconds: 12 });
    await logOff(window, [HLF_AT_F, HLF_AT_M]);
    await time.passes({ seconds: 25 });

    await openEinsatzprotokoll(window);
    await see.lcd().shows("bis: 11:16:00");
    await see.lcd().shows("davon aktiv: 00:03:00");
  },
);

// Two Einsätze of Trupp 01; the Abschaltzeit at 10× puts the second at 11:19:10 to 11:23:10.
async function zweiEinsaetze(window: Window): Promise<void> {
  await einsatzOfTrupp01(window);
  await einsatzOfTrupp01(window);
}

const NEUERES_PROTOKOLL = [
  "Einsatzprotokoll",
  "Einsatz Nr: 00002",
  "Datum: 12.04.17",
  "TruppNr/EZT: 01/030",
  "Einsatzkräfte:",
  "HLF AT-F",
  "HLF AT-M",
  "Einsatz von: 11:19:10",
  "bis: 11:23:10",
  "davon aktiv: 00:04:00",
  "Protokoll Ende",
];

// decided in "Show the Einsatzprotokolle on the LCD", points 2 and 4: newest first, one
// Einsatznummer each; the strip stops at the top of the newest
scenario(
  "the Einsatzprotokoll screen opens on the newest Einsatzprotokoll, numbered in turn",
  async (window) => {
    const { trainee, see } = window;
    await zweiEinsaetze(window);
    await openEinsatzprotokoll(window);
    await see.lcd().reads(NEUERES_PROTOKOLL);

    await trainee.press("Up");
    await see.lcd().reads(NEUERES_PROTOKOLL);
  },
);

// ASSUMPTION: the strip scrolls line by line ("Show the Einsatzprotokolle on the LCD", point 4)
scenario(
  "Down scrolls line by line into the next older Einsatzprotokoll, and Up back",
  async (window) => {
    const { trainee, see } = window;
    await zweiEinsaetze(window);
    await openEinsatzprotokoll(window);

    await trainee.press("Down");
    await see.lcd().reads([...NEUERES_PROTOKOLL.slice(1), "Einsatzprotokoll"]);
    await trainee.press("Up");
    await see.lcd().reads(NEUERES_PROTOKOLL);

    // past the newer one's title, its rule and its Einsatz Nr
    await trainee.press("Down");
    await trainee.press("Down");
    await trainee.press("Down");
    await see
      .lcd()
      .reads([
        ...NEUERES_PROTOKOLL.slice(2),
        "Einsatzprotokoll",
        "Einsatz Nr: 00001",
      ]);
  },
);

// decided in "Show the Einsatzprotokolle on the LCD", point 4
scenario(
  "scrolling stops once the oldest Protokoll Ende reaches the bottom line",
  async (window) => {
    const { trainee, see } = window;
    await zweiEinsaetze(window);
    await openEinsatzprotokoll(window);
    // a two-person Einsatzprotokoll is 15 lines high, as is the screen
    for (let step = 0; step < 16; step++) {
      await trainee.press("Down");
    }
    await see.lcd().reads(AELTERES_PROTOKOLL);

    await trainee.press("Down");
    await see.lcd().reads(AELTERES_PROTOKOLL);
  },
);

// decided in "Show the Einsatzprotokolle on the LCD", point 4: one two-person record fills the
// screen exactly
scenario(
  "a single two-person Einsatzprotokoll does not scroll",
  async (window) => {
    const { trainee, see } = window;
    await einsatzOfTrupp01(window);
    await openEinsatzprotokoll(window);
    await trainee.press("Down");
    await see.lcd().reads(AELTERES_PROTOKOLL);
  },
);

// decided in "Show the Einsatzprotokolle on the LCD", point 4; manual 5.10 step 6
scenario(
  "X returns to SERVICE and the screen opens on the newest Einsatzprotokoll again",
  async (window) => {
    const { trainee, see } = window;
    await zweiEinsaetze(window);
    await openEinsatzprotokoll(window);
    await trainee.press("Down");
    await trainee.press("Down");

    await trainee.press("X");
    await see.lcd().reads(SERVICE);
    await trainee.press("OK");
    await see.lcd().reads(NEUERES_PROTOKOLL);
  },
);

// manual 5.10 step 6; decided in "Show the Einsatzprotokolle on the LCD", point 1
scenario(
  "the Einsatzprotokoll screen does not time out, and X twice reaches the Startdisplay afresh",
  async (window) => {
    const { trainee, see, time } = window;
    await openEinsatzprotokoll(window);
    await time.passes({ seconds: 30 });
    await see.lcd().reads(KEIN_PROTOKOLL);

    await trainee.press("X");
    await trainee.press("X");
    await see.lcd().shows("sonst Ende in  >  25");
  },
);

// manual p. 17
scenario(
  "the Einsatzprotokoll screen ignores OK, Check and Tallys",
  async (window) => {
    const { trainee, see } = window;
    await openEinsatzprotokoll(window);
    await trainee.press("OK");
    await trainee.press("Check");
    await trainee.holdTally(HLF_AT_F);
    await see.lcd().reads(KEIN_PROTOKOLL);
  },
);
