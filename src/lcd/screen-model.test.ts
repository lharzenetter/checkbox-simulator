import { describe, expect, it } from "vitest";
import {
  createInitialState,
  P81_FLASCHENTYP_2_BAR,
  reduce,
} from "../core/index";
import type { Einsatzprotokoll, Event, Key, State } from "../core/index";
import { screenModel, screenText } from "./screen-model";
import type { ScreenModel } from "./screen-model";

// 12.04.17 11:11:00, the Uhrzeit in the Startdisplay figure (manual 5.2).
const FIGURE_UHRZEIT = Date.UTC(2017, 3, 12, 11, 11, 0);

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

const HLF_AT_F: Event = { type: "tallyHeld", tallyId: "1", name: "HLF AT-F" };
const HLF_AT_M: Event = { type: "tallyHeld", tallyId: "2", name: "HLF AT-M" };

function stateAfter(...events: readonly Event[]): State {
  return events.reduce(
    reduce,
    createInitialState({ now: FIGURE_UHRZEIT, realNow: 0 }),
  );
}

function tickBy(state: State, elapsedMs: number): State {
  return reduce(state, {
    type: "tick",
    now: state.now + elapsedMs,
    realNow: state.realNow + elapsedMs,
  });
}

// Two OKs on S12 end each Alarm the tick fired, and the last returns to the Einsatzliste
// (timing-and-alarm-rules §8.4).
function acknowledged(state: State): State {
  expect(state.screen).toBe("alarm");
  let ended = state;
  while (ended.screen === "alarm") {
    ended = reduce(reduce(ended, press("OK")), press("OK"));
  }
  return ended;
}

describe("S00 Aus", () => {
  // manual 5.12
  it("shows a blank display", () => {
    const model = screenModel(stateAfter());
    expect(model.layout).toBe("aus");
    expect(screenText(model)).toEqual([]);
  });
});

describe("S01 Startdisplay", () => {
  it("heads the screen with the Trainee's Feuerwehrname", () => {
    expect(
      screenText(screenModel(stateAfter(press("Check")), "FF-Übersee"))[0],
    ).toBe("FF-Übersee");
  });

  // manual 5.2, Startdisplay figure
  it("reads as in the figure", () => {
    expect(screenText(screenModel(stateAfter(press("Check"))))).toEqual([
      "FF-Musterstadt",
      "V04.02.23  #12345",
      "B1- + 88%",
      "12.04.17     11:11:00",
      "OK für SERVICE",
      "oder TALLY auflegen",
      "sonst Ende in  >  25",
    ]);
  });

  it("shows the running Uhrzeit", () => {
    const model = screenModel(tickBy(stateAfter(press("Check")), 3_000));
    expect(screenText(model)).toContain("12.04.17     11:11:03");
  });

  it("counts the Abschaltzeit down in whole seconds, rounding up", () => {
    const model = screenModel(tickBy(stateAfter(press("Check")), 15_500));
    expect(screenText(model)).toContain("sonst Ende in  >  10");
  });

  it("right-aligns a single-digit Abschaltzeit", () => {
    const model = screenModel(tickBy(stateAfter(press("Check")), 21_000));
    expect(screenText(model)).toContain("sonst Ende in  >   4");
  });
});

describe("S02 SERVICE", () => {
  // manual 5.2, SERVICE figure
  it("reads as in the figure, cursor on the first item", () => {
    const model = screenModel(stateAfter(press("Check"), press("OK")));
    expect(screenText(model)).toEqual([
      "SERVICE",
      "Einsatzprotokoll",
      "Zeit/Datum einstellen",
      "Kontrast",
      "Testprogramm",
    ]);
    expect(model).toMatchObject({ layout: "service", selectedIndex: 0 });
  });

  // manual 5.10 step 3
  it.each([1, 2, 3])("moves the bar to item %i", (downs) => {
    const model = screenModel(
      stateAfter(
        press("Check"),
        press("OK"),
        ...Array.from({ length: downs }, () => press("Down")),
      ),
    );
    expect(model).toMatchObject({ layout: "service", selectedIndex: downs });
  });
});

describe("S16 Einsatzprotokoll", () => {
  // 01.01.14 15:30:00, the login in the Einsatzprotokoll figure (manual 5.10).
  const FIGURE_LOGIN = Date.UTC(2014, 0, 1, 15, 30, 0);

  function einsatzprotokoll(
    einsatznummer: number,
    names: readonly string[],
    notausschaltung = false,
  ): Einsatzprotokoll {
    return {
      einsatznummer,
      truppnummer: 1,
      einsatzzeitMs: 30 * 60_000,
      atemschutztraeger: names.map((name, index) => ({
        tallyId: String(index),
        name,
      })),
      einsatzstatus: "rueckmarsch",
      sicherheitstrupp: false,
      loggedInAtMs: FIGURE_LOGIN,
      loggedOffAtMs: FIGURE_LOGIN + 15 * 60_000,
      davonAktivMs: 10 * 60_000,
      notausschaltung,
    };
  }

  function einsatzprotokollScreen(
    einsatzprotokolle: readonly Einsatzprotokoll[],
    ...events: readonly Event[]
  ): ScreenModel {
    return screenModel(
      [press("Check"), press("OK"), press("OK"), ...events].reduce(
        reduce,
        createInitialState(
          { now: FIGURE_UHRZEIT, realNow: 0 },
          { einsatzprotokolle, nextEinsatznummer: 1_000 },
        ),
      ),
    );
  }

  // The figure transcribes its rules as a line of `─`.
  function asFigure(model: ScreenModel): readonly string[] {
    if (model.layout !== "einsatzprotokoll") {
      throw new Error(`Expected S16, got ${model.layout}`);
    }
    return model.lines.map((line) =>
      line.kind === "rule" ? "─".repeat(21) : line.text,
    );
  }

  const RULE = "─".repeat(21);

  // manual 5.10, S16 figure
  it("shows a two-person Einsatzprotokoll as in the figure", () => {
    const model = einsatzprotokollScreen([
      einsatzprotokoll(321, ["MUSTERMANN M", "MUSTERMANN E"]),
    ]);
    expect(asFigure(model)).toEqual([
      "Einsatzprotokoll",
      RULE,
      " Einsatz Nr:    00321",
      "     Datum:  01.01.14",
      "TruppNr/EZT:   01/030",
      RULE,
      "Einsatzkräfte:",
      "MUSTERMANN M",
      "MUSTERMANN E",
      RULE,
      "Einsatz von: 15:30:00",
      "        bis: 15:45:00",
      "davon aktiv: 00:10:00",
      RULE,
      "Protokoll Ende",
    ]);
  });

  it("shows a six-person Einsatzprotokoll scrolled part-way", () => {
    const model = einsatzprotokollScreen(
      [einsatzprotokoll(7, ["A", "B", "C", "D", "E", "F"])],
      press("Down"),
      press("Down"),
    );
    expect(asFigure(model)).toEqual([
      " Einsatz Nr:    00007",
      "     Datum:  01.01.14",
      "TruppNr/EZT:   01/030",
      RULE,
      "Einsatzkräfte:",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      RULE,
      "Einsatz von: 15:30:00",
      "        bis: 15:45:00",
      "davon aktiv: 00:10:00",
    ]);
  });

  it("shows a window spanning two Einsatzprotokolle", () => {
    const model = einsatzprotokollScreen(
      [
        einsatzprotokoll(1, ["ALT A", "ALT B"]),
        einsatzprotokoll(2, ["NEU A", "NEU B"]),
      ],
      ...Array.from({ length: 10 }, () => press("Down")),
    );
    expect(asFigure(model)).toEqual([
      "Einsatz von: 15:30:00",
      "        bis: 15:45:00",
      "davon aktiv: 00:10:00",
      RULE,
      "Protokoll Ende",
      "Einsatzprotokoll",
      RULE,
      " Einsatz Nr:    00001",
      "     Datum:  01.01.14",
      "TruppNr/EZT:   01/030",
      RULE,
      "Einsatzkräfte:",
      "ALT A",
      "ALT B",
      RULE,
    ]);
  });

  // ASSUMPTION: the Notausschaltung line ("Show the Einsatzprotokolle on the LCD"); manual p. 31
  it("shows Notausschaltung before Protokoll Ende for a Trupp a Notausschaltung ended", () => {
    const model = einsatzprotokollScreen(
      [einsatzprotokoll(1, ["A", "B"], true)],
      press("Down"),
    );
    expect(asFigure(model).slice(-3)).toEqual([
      RULE,
      "Notausschaltung",
      "Protokoll Ende",
    ]);
  });

  it("shows a 20 min Einsatzzeit as `020`", () => {
    const model = einsatzprotokollScreen([
      {
        ...einsatzprotokoll(1, ["A", "B"]),
        truppnummer: 6,
        einsatzzeitMs: 20 * 60_000,
      },
    ]);
    expect(asFigure(model)[4]).toBe("TruppNr/EZT:   06/020");
  });

  // ASSUMPTION: `Kein Protokoll` ("Show the Einsatzprotokolle on the LCD")
  it("shows its title and Kein Protokoll with no Einsatzprotokoll stored", () => {
    const model = einsatzprotokollScreen([]);
    expect(asFigure(model)).toEqual([
      "Einsatzprotokoll",
      RULE,
      "Kein Protokoll",
    ]);
    expect(screenText(model)).toEqual(["Einsatzprotokoll", "Kein Protokoll"]);
  });

  it("reads its text lines without the rules", () => {
    const model = einsatzprotokollScreen([einsatzprotokoll(1, ["A", "B"])]);
    expect(screenText(model).slice(0, 3)).toEqual([
      "Einsatzprotokoll",
      "Einsatz Nr: 00001",
      "Datum: 01.01.14",
    ]);
  });
});

describe("S03 Einsatzzeit wählen", () => {
  // manual 5.3, login figure; real-device photo einsatzzeit-waehlen.jpeg: the minutes right-aligned
  // in three places
  it("reads as on the device with 30, 20 and 180 min, cursor on 30", () => {
    const model = screenModel(stateAfter(HLF_AT_F));
    expect(screenText(model)).toEqual([
      "Neuen Trupp anmelden:",
      "Wähle Einsatzzeit für",
      "Trupp Nr.: 01",
      "*HLF AT-F",
      "Einsatzzeit 30 min?",
      "Einsatzzeit 20 min?",
      "Einsatzzeit180 min?",
    ]);
    expect(model).toMatchObject({
      layout: "einsatzzeitWaehlen",
      selectedIndex: 0,
    });
  });

  // manual 5.3 step 3
  it("moves the cursor to 20 min on Down", () => {
    expect(screenModel(stateAfter(HLF_AT_F, press("Down")))).toMatchObject({
      items: [
        "Einsatzzeit 30 min?",
        "Einsatzzeit 20 min?",
        "Einsatzzeit180 min?",
      ],
      selectedIndex: 1,
    });
  });

  // timing-and-alarm-rules §8.3; verification-scenarios V28
  it("turns the bottom line into `Langzeiteinsatz? OK` on OK at 180 min", () => {
    expect(
      screenModel(stateAfter(HLF_AT_F, press("Up"), press("OK"))),
    ).toMatchObject({
      items: [
        "Einsatzzeit 30 min?",
        "Einsatzzeit 20 min?",
        "Langzeiteinsatz? OK",
      ],
      selectedIndex: 2,
    });
  });

  // manual 5.3 step 5; decided in "Define the key-by-screen navigation model"
  it("turns the 20 min line into `Langzeiteinsatz? OK` on OK at 20 min", () => {
    const model = screenModel(stateAfter(HLF_AT_F, press("Down"), press("OK")));
    expect(screenText(model)).toEqual([
      "Neuen Trupp anmelden:",
      "Wähle Einsatzzeit für",
      "Trupp Nr.: 01",
      "*HLF AT-F",
      "Einsatzzeit 30 min?",
      "Langzeiteinsatz? OK",
      "Einsatzzeit180 min?",
    ]);
    expect(model).toMatchObject({ selectedIndex: 1 });
  });
});

describe("S04 Anmeldefenster", () => {
  // manual 5.3, Anmeldefenster figure
  it("reads as in the figure, cursor on `Trupp OK Einsatz`", () => {
    const model = screenModel(stateAfter(HLF_AT_F, press("OK"), HLF_AT_M));
    expect(screenText(model)).toEqual([
      "Trupp 01   30 min",
      "*HLF AT-F",
      "*HLF AT-M",
      "Trupp OK Einsatz",
      "Trupp OK Bereitschaft",
      "Sicherheitstrupp OK",
      "Druck ändern",
    ]);
    expect(model).toMatchObject({ layout: "anmeldefenster", selectedIndex: 0 });
  });

  // manual 5.3, Anmeldefenster figure: the header carries the chosen Einsatzzeit
  it("heads a Langzeiteinsatz with its 20 min", () => {
    const model = screenModel(
      stateAfter(HLF_AT_F, press("Down"), press("OK"), press("OK")),
    );
    expect(screenText(model)[0]).toBe("Trupp 01   20 min");
  });

  // wrapping is decided for the Einsatzliste in "Define the key-by-screen navigation model";
  // the menus wrap the same way by ASSUMPTION
  it("moves the cursor with Up and Down, wrapping", () => {
    const anmeldefenster = [HLF_AT_F, press("OK"), HLF_AT_M] as const;
    expect(
      screenModel(stateAfter(...anmeldefenster, press("Down"), press("Down"))),
    ).toMatchObject({ selectedIndex: 2 });
    expect(
      screenModel(stateAfter(...anmeldefenster, press("Up"))),
    ).toMatchObject({ selectedIndex: 3 });
  });
});

describe("S08 Esz-Zeit ändern", () => {
  // manual 5.3.2, Druck ändern figure; decided in "Define the key-by-screen navigation model"
  it("reads as the Druck ändern figure, titled `Esz-Zeit ändern`", () => {
    const model = screenModel(
      stateAfter(
        HLF_AT_F,
        press("OK"),
        HLF_AT_M,
        press("Up"),
        press("OK"),
        press("Down"),
      ),
    );
    expect(screenText(model)).toEqual([
      "Esz-Zeit ändern",
      "Flasche: 300 bar",
      "Druck 295 bar",
      "Restzeit 00:29:30",
    ]);
    expect(model).toMatchObject({
      layout: "flaschendruckEditor",
      truppnummer: null,
      fillLevel: 295 / 300,
    });
  });
});

describe("S06 Anfangsdruck editor", () => {
  function anfangsdruckEditor(...keys: readonly Key[]): State {
    return stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("OK"),
      ...keys.map(press),
    );
  }

  // manual 5.3, S06 figure
  it("opens at the cylinder's 300 bar with the full Einsatzzeit", () => {
    const model = screenModel(anfangsdruckEditor());
    expect(screenText(model)).toEqual([
      "Trupp Nr.: 01",
      "Flasche: 300 bar",
      "Druck 300 bar",
      "Restzeit 00:30:00",
    ]);
    expect(model).toMatchObject({
      layout: "flaschendruckEditor",
      fillLevel: 1,
    });
  });

  // timing-and-alarm-rules §1.3; the S06 figure's 250 bar lies below the 270 bar floor (§1.6)
  it("shows the Restzeit the entered Anfangsdruck gives", () => {
    const model = screenModel(
      anfangsdruckEditor(...Array<Key>(10).fill("Down")),
    );
    expect(screenText(model)).toContain("Druck 270 bar");
    expect(screenText(model)).toContain("Restzeit 00:27:00");
  });

  it("fills the cylinder in proportion to the Flaschendruck, at most full", () => {
    expect(
      screenModel(anfangsdruckEditor("Down", "Down", "Down")),
    ).toMatchObject({ fillLevel: 285 / 300 });
    expect(screenModel(anfangsdruckEditor("Up"))).toMatchObject({
      fillLevel: 1,
    });
  });
});

describe("S07 Einsatzliste", () => {
  // X closes the Trupp-Ansicht the login shows.
  function einsatzliste(...keys: readonly Key[]): State {
    return stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("OK"),
      ...keys.map(press),
      press("OK"),
      press("X"),
    );
  }

  function firstRestzeit(state: State): string | undefined {
    const model = screenModel(state);
    return model.layout === "einsatzliste"
      ? model.rows[0]?.restzeit
      : undefined;
  }

  // manual 5.3, Einsatzliste figure with one Trupp; decided in "Define the key-by-screen
  // navigation model"
  it("shows the new Trupp selected, in Anmarsch, with its Restzeit", () => {
    const model = screenModel(einsatzliste());
    expect(screenText(model)).toEqual([
      "FF-Musterstadt",
      "B1- + 11:11:00",
      "01 markiert  2× Anmarsch  00:30:00",
    ]);
    expect(model).toMatchObject({
      layout: "einsatzliste",
      rows: [
        {
          truppnummer: "01",
          selected: true,
          statussymbol: { einsatzstatus: "anmarsch", count: 2 },
          restzeit: "00:30:00",
        },
        null,
        null,
        null,
        null,
        null,
      ],
    });
  });

  it("heads the list with the Trainee's Feuerwehrname", () => {
    expect(screenText(screenModel(einsatzliste(), "FF-Übersee"))[0]).toBe(
      "FF-Übersee",
    );
  });

  // decided in "Decide what survives a page reload": the Uhrzeit runs on simulated time
  it("counts the Restzeit down and runs the Uhrzeit on", () => {
    const model = screenModel(tickBy(einsatzliste(), 61_000));
    expect(screenText(model)).toEqual([
      "FF-Musterstadt",
      "B1- + 11:12:01",
      "01 markiert  2× Anmarsch  00:28:59",
    ]);
  });

  it("shows a Restzeit in whole seconds, rounding up", () => {
    expect(firstRestzeit(tickBy(einsatzliste(), 500))).toBe("00:30:00");
  });

  // manual 5.5.3; decided in "Define the key-by-screen navigation model": `-0:00:10`
  it("drops the hour's leading digit from a negative Restzeit", () => {
    const overdue = tickBy(einsatzliste(), 30 * 60_000 + 10_000);
    expect(firstRestzeit(acknowledged(overdue))).toBe("-0:00:10");
  });

  it("shows 00:00:00, not a negative zero, within the first overdue second", () => {
    const overdue = tickBy(einsatzliste(), 30 * 60_000 + 500);
    expect(firstRestzeit(acknowledged(overdue))).toBe("00:00:00");
  });

  it("lists a second Trupp in its own row and selects it", () => {
    const state = stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("OK"),
      press("OK"),
      { type: "tallyHeld", tallyId: "5", name: "LF AT-F" },
      press("OK"),
      { type: "tallyHeld", tallyId: "6", name: "LF AT-M" },
      { type: "tallyHeld", tallyId: "7", name: "LF WT-F" },
      { type: "tallyHeld", tallyId: "8", name: "LF WT-M" },
      press("OK"),
      press("OK"),
      press("X"),
    );
    expect(screenModel(state)).toMatchObject({
      rows: [
        { truppnummer: "01", selected: false },
        {
          truppnummer: "02",
          selected: true,
          statussymbol: { einsatzstatus: "anmarsch", count: 4 },
        },
        null,
        null,
        null,
        null,
      ],
    });
  });

  function sicherheitstrupp(): State {
    return stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("Down"),
      press("Down"),
      press("OK"),
      press("OK"),
      press("X"),
    );
  }

  // manual 5.3.1 step 4, Einsatzliste figure item 8; timing-and-alarm-rules §9
  it("alternates SICHER with the Statussymbol of a Sicherheitstrupp every second", () => {
    expect(screenText(screenModel(sicherheitstrupp()))[2]).toBe(
      "01 markiert  SICHER  00:30:00",
    );
    expect(screenText(screenModel(tickBy(sicherheitstrupp(), 1_000)))[2]).toBe(
      "01 markiert  2× Bereitschaft  00:30:00",
    );
    expect(screenModel(tickBy(sicherheitstrupp(), 2_000))).toMatchObject({
      rows: [{ sicher: true }, null, null, null, null, null],
    });
  });

  // timing-and-alarm-rules §4.1; 4 min stays short of the Bereitschaft Alarm (§4.3)
  it("shows a frozen Restzeit for a Trupp logged in to Bereitschaft", () => {
    const bereitschaft = stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("Down"),
      press("OK"),
      press("Down"),
      press("OK"),
    );
    expect(screenModel(tickBy(bereitschaft, 4 * 60_000))).toMatchObject({
      rows: [
        {
          statussymbol: { einsatzstatus: "bereitschaft", count: 2 },
          sicher: false,
          restzeit: "00:29:30",
        },
        null,
        null,
        null,
        null,
        null,
      ],
    });
  });

  // timing-and-alarm-rules §4.1, 12.8; short of the Bereitschaft Alarm (§4.3)
  it("shows a frozen Restzeit for a Sicherheitstrupp", () => {
    expect(firstRestzeit(tickBy(sicherheitstrupp(), 4 * 60_000))).toBe(
      "00:30:00",
    );
  });
});

describe("S13 ABMELDEN", () => {
  const TRUPP_01 = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
  ] as const;

  // manual 5.8, ABMELDEN figure
  it("reads as in the figure, with the member who held their Tally marked", () => {
    const model = screenModel(stateAfter(...TRUPP_01, HLF_AT_F));
    expect(model).toMatchObject({
      layout: "abmelden",
      atemschutztraeger: [
        { name: "*HLF AT-F", marked: true },
        { name: "*HLF AT-M", marked: false },
      ],
    });
    expect(screenText(model)).toEqual([
      "Trupp 01 ABMELDEN",
      "*HLF AT-F markiert",
      "*HLF AT-M",
      "OK  =  abmelden",
      " X  =  nicht abmelden",
    ]);
  });

  // manual 5.8 step 3
  it("marks every member who has held their Tally", () => {
    const model = screenModel(stateAfter(...TRUPP_01, HLF_AT_M, HLF_AT_F));
    expect(screenText(model).slice(1, 3)).toEqual([
      "*HLF AT-F markiert",
      "*HLF AT-M markiert",
    ]);
  });
});

describe("S11 Trupp-Ansicht", () => {
  // the login shows it (ASSUMPTION in the reducer)
  const TRUPP_01 = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
  ] as const;

  // From the Einsatzliste: Druck ändern, the Anmarsch menu's fourth item, accepted at the estimate.
  const DRUCK_AENDERN = [
    press("OK"),
    ...Array.from({ length: 3 }, () => press("Down")),
    press("OK"),
    press("OK"),
  ] as const;

  // the real-device photo trupp-ansicht.jpeg; decided in "Correct the simulator against the real
  // Checkbox": the ALARM layout, labelled `Ansicht`
  it("reads as in the device photo after a pressure entry, labelled `Ansicht`", () => {
    const model = screenModel(
      DRUCK_AENDERN.reduce(
        reduce,
        acknowledged(tickBy(stateAfter(...TRUPP_01), 15 * 60_000)),
      ),
    );
    expect(screenText(model)).toEqual([
      "Trupp 01 ANMARSCH",
      "Personen-Anzahl: 2",
      "Druck 150 bar",
      "Restzeit 00:15:00",
      "Ansicht",
    ]);
    expect(model).toMatchObject({ layout: "truppAnsicht", fillLevel: 0.5 });
  });

  // timing-and-alarm-rules §1.7: live, in whole bar, rounded down
  it("shows the Aktueller Flaschendruck live, rounded down", () => {
    const model = screenModel(tickBy(stateAfter(...TRUPP_01), 4_000));
    expect(model).toMatchObject({ layout: "truppAnsicht" });
    expect(screenText(model)).toContain("Druck 299 bar");
  });

  // timing-and-alarm-rules §1.7: clamped at 0 once the Restzeit is negative; the negative Restzeit
  // in full, as on the ALARM screen
  it("shows 0 bar and the negative Restzeit in full once the Einsatzzeit is exceeded", () => {
    const entered = DRUCK_AENDERN.reduce(
      reduce,
      acknowledged(tickBy(stateAfter(...TRUPP_01), 31 * 60_000)),
    );
    const model = screenModel(tickBy(entered, 4_000));
    expect(screenText(model)).toContain("Druck 0 bar");
    expect(screenText(model)).toContain("Restzeit -00:00:04");
    expect(model).toMatchObject({ layout: "truppAnsicht", fillLevel: 0 });
  });

  // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
  it("heads a Trupp in Bereitschaft with `BEREITSCHAFT`", () => {
    const model = screenModel(
      stateAfter(
        HLF_AT_F,
        press("OK"),
        HLF_AT_M,
        press("Down"),
        press("OK"),
        press("OK"),
      ),
    );
    expect(screenText(model)[0]).toBe("Trupp 01 BEREITSCHAFT");
  });
});

describe("S09 Trupp-Menü", () => {
  // X closes the login's Trupp-Ansicht, and OK on the Einsatzliste opens the Trupp-Menü
  const TRUPP_MENUE = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
    press("X"),
    press("OK"),
  ] as const;

  // the real-device photo trupp-menue-anmarsch.jpeg; decided in "Correct the simulator against the
  // real Checkbox", navigation
  it("reads as the ANMARSCH photo, cursor on the first item", () => {
    const model = screenModel(stateAfter(...TRUPP_MENUE));
    expect(screenText(model)).toEqual([
      "Trupp 01 ANMARSCH",
      "*HLF AT-F",
      "*HLF AT-M",
      "Restzeit 00:30:00",
      "Trupp -> Einsatz",
      "Trupp -> Bereitschaft",
      "Einsatzziel erreicht",
      "Druck ändern",
    ]);
    expect(model).toMatchObject({
      layout: "truppMenue",
      selectedIndex: 0,
      sicher: false,
    });
  });

  // decided in "Define the key-by-screen navigation model": the list scrolls past 4 lines
  it("scrolls to keep the cursor in view", () => {
    const model = screenModel(
      stateAfter(
        ...TRUPP_MENUE,
        ...Array.from({ length: 4 }, () => press("Down")),
      ),
    );
    expect(model).toMatchObject({
      items: [
        "Trupp -> Bereitschaft",
        "Einsatzziel erreicht",
        "Druck ändern",
        "Attribute eintragen",
      ],
      selectedIndex: 3,
    });
  });

  // timing-and-alarm-rules §1.1: the clock line is live
  it("shows the Restzeit running down", () => {
    const model = screenModel(tickBy(stateAfter(...TRUPP_MENUE), 5_000));
    expect(screenText(model)).toContain("Restzeit 00:29:55");
  });

  // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
  it("lists the Bereitschaft items under `BEREITSCHAFT`", () => {
    const model = screenModel(
      stateAfter(
        HLF_AT_F,
        press("OK"),
        HLF_AT_M,
        press("Down"),
        press("OK"),
        press("OK"),
        press("X"),
        press("OK"),
      ),
    );
    expect(model).toMatchObject({
      title: "Trupp 01 BEREITSCHAFT",
      items: [
        "Trupp -> Einsatz",
        "Trupp -> Bereitschaft",
        "Druck ändern",
        "Attribute eintragen",
      ],
    });
  });

  // the real-device photo trupp-menue-sicherheitstrupp.jpeg; timing-and-alarm-rules §12.8: static,
  // not alternating as on the Einsatzliste
  it("shows a static `SICHER` on the clock line of a Sicherheitstrupp", () => {
    const sicherheitstrupp = stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("Down"),
      press("Down"),
      press("OK"),
      press("OK"),
      press("X"),
      press("OK"),
    );
    for (const elapsedMs of [0, 1_000, 2_000]) {
      const model = screenModel(tickBy(sicherheitstrupp, elapsedMs));
      expect(model).toMatchObject({ layout: "truppMenue", sicher: true });
      expect(screenText(model)).toContain("Restzeit 00:30:00 SICHER");
    }
  });
});

describe("S08 `Esz-Zeit ändern` from the Trupp-Menü", () => {
  // manual 5.6.4, Druck ändern figure; timing-and-alarm-rules §1.4, 1.7
  it("opens at the snapped estimate with the Restzeit it gives", () => {
    const model = screenModel(
      stateAfter(
        HLF_AT_F,
        press("OK"),
        HLF_AT_M,
        press("OK"),
        press("OK"),
        {
          type: "tick",
          now: FIGURE_UHRZEIT + (6 * 60 + 3) * 1000,
          realNow: (6 * 60 + 3) * 1000,
        },
        press("OK"),
        ...Array.from({ length: 3 }, () => press("Down")),
        press("OK"),
      ),
    );
    expect(screenText(model)).toEqual([
      "Esz-Zeit ändern",
      "Flasche: 300 bar",
      "Druck 235 bar",
      "Restzeit 00:23:30",
    ]);
    expect(model).toMatchObject({
      layout: "flaschendruckEditor",
      truppnummer: null,
    });
  });
});

describe("S12 Trupp ALARM", () => {
  const TRUPP_01 = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
  ] as const;

  // manual 5.5.3, ALARM figure; the real-device photo alarm-rueckzug.jpeg; decided in "Correct
  // the simulator against the real Checkbox": the cause in the header, the Personen-Anzahl in
  // place of the names, and no SICHER
  it("reads as in the device photo at the first Alarmgrenze", () => {
    const model = screenModel(tickBy(stateAfter(...TRUPP_01), 594_000));
    expect(screenText(model)).toEqual([
      "Trupp 01 ALARM 1",
      "Personen-Anzahl: 2",
      "Druck 201 bar",
      "Restzeit 00:20:06",
      "Alarmende",
      "mit OK",
    ]);
    expect(model).toMatchObject({ layout: "alarm", fillLevel: 0.67 });
  });

  // timing-and-alarm-rules §8.5
  it.each<{ cause: string; header: string; events: () => State }>([
    {
      cause: "the second Alarmgrenze",
      header: "Trupp 01 ALARM 2",
      events: () =>
        tickBy(acknowledged(tickBy(stateAfter(...TRUPP_01), 594_000)), 594_000),
    },
    {
      cause: "Einsatzzeit erreicht",
      header: "Trupp 01 ALARM",
      events: () =>
        tickBy(
          acknowledged(
            tickBy(
              acknowledged(tickBy(stateAfter(...TRUPP_01), 594_000)),
              594_000,
            ),
          ),
          612_000,
        ),
    },
    {
      cause: "an overdue repeat",
      header: "Trupp 01 ALARM",
      events: () =>
        tickBy(
          acknowledged(tickBy(stateAfter(...TRUPP_01), 30 * 60_000)),
          5 * 60_000,
        ),
    },
    {
      // Einsatzziel erreicht at 0 bar, the Trupp-Menü's third item, fires it first (§8.2)
      cause: "the Rückzugsalarm",
      header: "Trupp 01 RÜCKZUG",
      events: () =>
        stateAfter(
          ...TRUPP_01,
          press("X"),
          press("OK"),
          press("Down"),
          press("Down"),
          press("OK"),
          ...Array.from({ length: 60 }, () => press("Down")),
          press("OK"),
        ),
    },
    {
      cause: "the Bereitschaft Alarm",
      header: "Trupp 01 BEREITSCHAFT",
      events: () =>
        tickBy(
          stateAfter(
            HLF_AT_F,
            press("OK"),
            HLF_AT_M,
            press("Down"),
            press("OK"),
            press("OK"),
          ),
          5 * 60_000,
        ),
    },
  ])("names $cause in its header", ({ header, events }) => {
    const state = events();
    expect(state.screen).toBe("alarm");
    expect(screenText(screenModel(state))[0]).toBe(header);
  });

  // the real-device photo alarm-rueckzug.jpeg: `-00:00:27`, nine characters
  it("shows the negative Restzeit in full and 0 bar while the Alarm stays unacknowledged", () => {
    const model = screenModel(
      tickBy(tickBy(stateAfter(...TRUPP_01), 30 * 60_000), 10_000),
    );
    expect(screenText(model)).toEqual([
      "Trupp 01 ALARM 1",
      "Personen-Anzahl: 2",
      "Druck 0 bar",
      "Restzeit -00:00:10",
      "Alarmende",
      "mit OK",
    ]);
    expect(model).toMatchObject({ fillLevel: 0 });
  });

  // timing-and-alarm-rules §8.4: the screen stays, live and unchanged, after the first OK
  it("looks the same after the first OK", () => {
    const alarm = tickBy(stateAfter(...TRUPP_01), 594_000);
    expect(screenModel(reduce(alarm, press("OK")))).toEqual(screenModel(alarm));
  });

  // the real-device photo alarm-rueckzug.jpeg: the `R` mark on the cylinder at the Rückzugsdruck
  it("marks the Rückzugsdruck on the cylinder once there is one", () => {
    const anmarsch = tickBy(stateAfter(...TRUPP_01), 594_000);
    expect(screenModel(anmarsch)).toMatchObject({ rueckzugsdruckLevel: null });
    // Einsatzziel erreicht at 10:00 with the 200 bar the editor opens at: Rückzugsdruck 150 bar
    const einsatzziel = stateAfter(
      ...TRUPP_01,
      { type: "tick", now: FIGURE_UHRZEIT + 5 * 60_000, realNow: 5 * 60_000 },
      press("OK"),
      press("Down"),
      press("Down"),
      press("OK"),
      ...Array.from({ length: 10 }, () => press("Down")),
      press("OK"),
      { type: "tick", now: FIGURE_UHRZEIT + 594_000, realNow: 594_000 },
    );
    expect(einsatzziel.screen).toBe("alarm");
    expect(screenModel(einsatzziel)).toMatchObject({
      rueckzugsdruckLevel: 0.5,
    });
  });

  // verification-scenarios V21; timing-and-alarm-rules §8.2; decided in "Decide how alarms are
  // presented", points 1 and 4: the head of the queue, live, and no queue indicator
  it("shows the Trupp at the head of the queue with its live values", () => {
    const HLF_WT_F: Event = {
      type: "tallyHeld",
      tallyId: "3",
      name: "HLF WT-F",
    };
    const HLF_WT_M: Event = {
      type: "tallyHeld",
      tallyId: "4",
      name: "HLF WT-M",
    };
    const bothLoggedIn = [
      HLF_WT_F,
      press("OK"),
      HLF_WT_M,
      press("OK"),
      press("OK"),
    ].reduce(reduce, tickBy(stateAfter(...TRUPP_01), 30_000));

    // Trupp 01's first Alarmgrenze at 9:54, Trupp 02's at 10:24
    const queued = tickBy(tickBy(bothLoggedIn, 564_000), 30_000);
    expect(screenText(screenModel(queued))).toEqual([
      "Trupp 01 ALARM 1",
      "Personen-Anzahl: 2",
      "Druck 196 bar",
      "Restzeit 00:19:36",
      "Alarmende",
      "mit OK",
    ]);

    const next = tickBy(
      reduce(reduce(queued, press("OK")), press("OK")),
      6_000,
    );
    expect(screenText(screenModel(next))).toEqual([
      "Trupp 02 ALARM 1",
      "Personen-Anzahl: 2",
      "Druck 200 bar",
      "Restzeit 00:20:00",
      "Alarmende",
      "mit OK",
    ]);
  });
});

describe("the Einsatzstatus screens", () => {
  const TRUPP_01 = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
  ] as const;

  function at(minutes: number): Event {
    return {
      type: "tick",
      now: FIGURE_UHRZEIT + minutes * 60_000,
      realNow: minutes * 60_000,
    };
  }

  // Opens the Trupp-Menü from the Einsatzliste and moves down to the item.
  function truppMenueAt(downs: number): readonly Event[] {
    return [press("OK"), ...Array.from({ length: downs }, () => press("Down"))];
  }

  // Einsatzziel erreicht at 5:00, accepted at 250 bar, on its Trupp-Ansicht
  const EINSATZZIEL_ANSICHT = [
    ...TRUPP_01,
    at(5),
    ...truppMenueAt(2),
    press("OK"),
    press("OK"),
  ] as const;

  // the same, back on the Einsatzliste
  const EINSATZZIEL = [...EINSATZZIEL_ANSICHT, press("X")] as const;

  // Rückzug antreten at 6:00, accepted at 240 bar, on its Trupp-Ansicht
  const RUECKMARSCH = [
    ...EINSATZZIEL,
    at(6),
    ...truppMenueAt(2),
    press("OK"),
    press("OK"),
  ] as const;

  // manual 5.4 step 5, Esz-Ziel erreicht figure; decided in "Define the key-by-screen navigation
  // model", its pressure editor table
  it("titles the Einsatzziel erreicht editor `Esz-Ziel erreicht`", () => {
    const model = screenModel(
      stateAfter(...TRUPP_01, at(5), ...truppMenueAt(2), press("OK")),
    );
    expect(screenText(model)).toEqual([
      "Esz-Ziel erreicht",
      "Flasche: 300 bar",
      "Druck 250 bar",
      "Restzeit 00:25:00",
    ]);
    expect(model).toMatchObject({
      layout: "flaschendruckEditor",
      truppnummer: null,
    });
  });

  // manual 5.7; decided in "Define the key-by-screen navigation model", its pressure editor table
  it("titles the Rückzug antreten editor `Rückzug antreten`", () => {
    const model = screenModel(
      stateAfter(...EINSATZZIEL, at(6), ...truppMenueAt(2), press("OK")),
    );
    expect(screenText(model)[0]).toBe("Rückzug antreten");
  });

  // manual 5.6.2, Trupp-Menü figure (EINSATZ); decided in "Define the key-by-screen navigation
  // model", its Trupp-Menü table
  it("heads the Trupp-Menü at the Einsatzziel `EINSATZ` with its items", () => {
    const model = screenModel(stateAfter(...EINSATZZIEL, ...truppMenueAt(0)));
    expect(model).toMatchObject({
      layout: "truppMenue",
      title: "Trupp 01 EINSATZ",
      items: [
        "Trupp -> Einsatz",
        "Trupp -> Bereitschaft",
        "Rückzug antreten",
        "Druck ändern",
      ],
    });
  });

  // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
  it("heads the Trupp-Menü in Rückmarsch `RÜCKMARSCH` with its items", () => {
    const model = screenModel(
      stateAfter(...RUECKMARSCH, press("X"), press("OK")),
    );
    expect(model).toMatchObject({
      layout: "truppMenue",
      title: "Trupp 01 RÜCKMARSCH",
      items: [
        "Trupp -> Einsatz",
        "Trupp -> Bereitschaft",
        "Druck ändern",
        "Attribute eintragen",
      ],
    });
  });

  // manual 5.7 step 5, RÜCKMARSCH figure; decided in "Correct the simulator against the real
  // Checkbox": every pressure entry shows the Trupp-Ansicht
  it("shows the Trupp-Ansicht in `RÜCKMARSCH` after Rückzug antreten", () => {
    expect(screenText(screenModel(stateAfter(...RUECKMARSCH)))).toEqual([
      "Trupp 01 RÜCKMARSCH",
      "Personen-Anzahl: 2",
      "Druck 240 bar",
      "Restzeit 00:24:00",
      "Rückzugsdruck 150 bar",
      "Ansicht",
    ]);
  });

  // manual 3.2.3 item 9; timing-and-alarm-rules §5.7; verification scenario V7
  it("shows the Rückzugsdruck on the Trupp-Ansicht once the Einsatzziel is reached", () => {
    expect(screenText(screenModel(stateAfter(...EINSATZZIEL_ANSICHT)))).toEqual(
      [
        "Trupp 01 EINSATZ",
        "Personen-Anzahl: 2",
        "Druck 250 bar",
        "Restzeit 00:25:00",
        "Rückzugsdruck 150 bar",
        "Ansicht",
      ],
    );
  });

  // manual 3.2.3 item 9: the Anmarsch has no Anmarschzeit yet (timing-and-alarm-rules §5.13)
  it("shows no Rückzugsdruck on the Trupp-Ansicht in Anmarsch", () => {
    expect(screenModel(stateAfter(...TRUPP_01))).toMatchObject({
      layout: "truppAnsicht",
      rueckzugsdruck: null,
    });
  });

  // manual 3.2.3 items 3–5: the bar stays empty until there is an Anmarschzeit (issue #42)
  it("leaves the time-split bar empty in Bereitschaft and during the first Anmarsch", () => {
    const bereitschaft = stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("Down"),
      press("OK"),
      press("OK"),
    );
    expect(screenModel(bereitschaft)).toMatchObject({
      layout: "truppAnsicht",
      timeSplit: null,
    });
    expect(screenModel(stateAfter(...TRUPP_01))).toMatchObject({
      layout: "truppAnsicht",
      timeSplit: null,
    });
  });

  // manual 3.2.3 items 3–5; timing-and-alarm-rules §5.5, 5.6, 5.8; ADR 0008: field ⑤ is the
  // Rückmarschzeit `2·t_A + t_res`, here 2 × 5 min + 5 min of the 30 min Einsatzzeit
  it("splits the bar into Anmarschzeit and Rückmarschzeit once the Einsatzziel is reached", () => {
    expect(screenModel(stateAfter(...EINSATZZIEL_ANSICHT))).toMatchObject({
      layout: "truppAnsicht",
      timeSplit: { anmarschzeitShare: 5 / 30, rueckmarschzeitShare: 15 / 30 },
    });
  });

  // timing-and-alarm-rules §5.7: the Rückzugsdruck is field ⑤ in bar, `[42] + 2·t_A × P_N / T`
  it("agrees with the Rückzugsdruck on the same screen", () => {
    const model = screenModel(stateAfter(...EINSATZZIEL_ANSICHT));
    if (model.layout !== "truppAnsicht" || model.timeSplit === null) {
      throw new Error("expected the Trupp-Ansicht with a time split");
    }
    expect(model.rueckzugsdruck).toBe(
      `${String(model.timeSplit.rueckmarschzeitShare * P81_FLASCHENTYP_2_BAR)} bar`,
    );
  });

  // manual 5.7 step 5, RÜCKMARSCH figure: the Anmarschzeit is kept on the Rückmarsch
  it("keeps the time split on the Trupp-Ansicht in `RÜCKMARSCH` after the Einsatzziel", () => {
    expect(screenModel(stateAfter(...RUECKMARSCH))).toMatchObject({
      title: "Trupp 01 RÜCKMARSCH",
      timeSplit: { anmarschzeitShare: 5 / 30, rueckmarschzeitShare: 15 / 30 },
    });
  });

  // ASSUMPTION: field ⑤ is cut back where the two would overlap (issue #42)
  it("cuts the Rückmarschzeit back so the fields never overflow the bar after a long Anmarsch", () => {
    // the Alarmgrenzen fire on the way; the Rückzugsalarm fires on reaching the Einsatzziel
    const longAnmarsch = stateAfter(
      ...TRUPP_01,
      at(25),
      // two OKs each for both Alarmgrenzen
      ...Array.from({ length: 4 }, () => press("OK")),
      ...truppMenueAt(2),
      press("OK"),
      press("OK"),
    );
    expect(screenModel(longAnmarsch)).toMatchObject({
      layout: "alarm",
      timeSplit: {
        anmarschzeitShare: 25 / 30,
        rueckmarschzeitShare: expect.closeTo(5 / 30) as number,
      },
    });
  });

  // ASSUMPTION: field ③ is clamped to the bar (issue #42)
  it("fills the whole bar with the Anmarschzeit once it exceeds the Einsatzzeit", () => {
    const overdueAnmarsch = stateAfter(
      ...TRUPP_01,
      at(35),
      // two OKs each for both Alarmgrenzen and Einsatzzeit erreicht
      ...Array.from({ length: 6 }, () => press("OK")),
      ...truppMenueAt(2),
      press("OK"),
      press("OK"),
    );
    expect(screenModel(overdueAnmarsch)).toMatchObject({
      timeSplit: { anmarschzeitShare: 1, rueckmarschzeitShare: 0 },
    });
  });

  // manual 3.2.2
  it("lists the Einsatzstatus of each Trupp on the Einsatzliste", () => {
    expect(screenText(screenModel(stateAfter(...EINSATZZIEL)))).toContain(
      "01 markiert  2× Einsatzziel erreicht  00:25:00",
    );
    expect(
      screenText(screenModel(stateAfter(...RUECKMARSCH, press("X")))),
    ).toContain("01 markiert  2× Rückmarsch  00:24:00");
  });
});

// Trupp 01 logged in, its Trupp-Ansicht closed, and X and Check held together on the Einsatzliste
// for 4 s.
function notausschaltungAuswahl(): State {
  return tickBy(
    stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("OK"),
      press("OK"),
      press("X"),
      press("X"),
      press("Check"),
    ),
    4_000,
  );
}

describe("S14 Notausschaltung – Auswahl", () => {
  // manual 5.9 step 2, right figure; decided in "Define the key-by-screen navigation model": the
  // inverse bar starts on the marked Trupp
  it("reads as in the figure, with the cursor on the marked Trupp", () => {
    const model = screenModel(notausschaltungAuswahl());
    expect(model).toMatchObject({
      layout: "notausschaltungAuswahl",
      selectedIndex: 0,
    });
    expect(screenText(model)).toEqual([
      "A C H T U N G !",
      "Einsatz-ABBRUCH",
      "fuer . . .",
      "-> markierten Trupp 01",
      "-> alle Trupps",
      "-> zurueck",
    ]);
  });

  // manual 5.9 step 3
  it("moves the inverse bar to the choice under the cursor", () => {
    const model = screenModel(reduce(notausschaltungAuswahl(), press("Up")));
    expect(model).toMatchObject({ selectedIndex: 2 });
  });
});

describe("S15 Notausschaltung – Bestätigung", () => {
  // manual 5.9 step 4, left figure, verbatim with its mixed `druecken` and `drücken`
  it("reads as in the figure", () => {
    const model = screenModel(reduce(notausschaltungAuswahl(), press("OK")));
    expect(model).toMatchObject({ layout: "notausschaltungBestaetigung" });
    expect(screenText(model)).toEqual([
      "A C H T U N G !",
      "WOLLEN SIE",
      "WIRKLICH DEN/DIE",
      "TRUPP(S) LOESCHEN?",
      "dann OK druecken",
      "sonst die X Taste",
      "drücken",
    ]);
  });
});
