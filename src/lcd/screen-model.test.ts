import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Event, Key, State } from "../core/index";
import { screenModel, screenText } from "./screen-model";

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

describe("S00 Aus", () => {
  // manual 5.12
  it("shows a blank display", () => {
    const model = screenModel(stateAfter());
    expect(model.layout).toBe("aus");
    expect(screenText(model)).toEqual([]);
  });
});

describe("S01 Startdisplay", () => {
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
});

describe("S03 Einsatzzeit wählen", () => {
  // manual 5.3, login figure; decided in "Define the key-by-screen navigation model"
  it("reads as in the figure with only 30 and 20 min, cursor on 30", () => {
    const model = screenModel(stateAfter(HLF_AT_F));
    expect(screenText(model)).toEqual([
      "Neuen Trupp anmelden:",
      "Wähle Einsatzzeit für",
      "Trupp Nr.: 01",
      "*HLF AT-F",
      "Einsatzzeit  30 min?",
      "Einsatzzeit  20 min?",
    ]);
    expect(model).toMatchObject({
      layout: "einsatzzeitWaehlen",
      selectedIndex: 0,
    });
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
  function einsatzliste(...keys: readonly Key[]): State {
    return stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("OK"),
      ...keys.map(press),
      press("OK"),
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
    expect(firstRestzeit(tickBy(einsatzliste(), 30 * 60_000 + 10_000))).toBe(
      "-0:00:10",
    );
  });

  it("shows 00:00:00, not a negative zero, within the first overdue second", () => {
    expect(firstRestzeit(tickBy(einsatzliste(), 30 * 60_000 + 500))).toBe(
      "00:00:00",
    );
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
});
