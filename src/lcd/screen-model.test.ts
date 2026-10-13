import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Event, Key, State } from "../core/index";
import { screenModel, screenText } from "./screen-model";

// 12.04.17 11:11:00, the Uhrzeit in the Startdisplay figure (manual 5.2).
const FIGURE_UHRZEIT = Date.UTC(2017, 3, 12, 11, 11, 0);

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

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
