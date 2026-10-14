import { describe, expect, it } from "vitest";
import {
  abschaltzeitRestMs,
  createInitialState,
  einsatzprotokollWindow,
  reduce,
} from "./index";
import type { Einsatzprotokoll, Event, Key, State } from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

function presses(key: Key, count: number): readonly Event[] {
  return Array.from({ length: count }, () => press(key));
}

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
      tallyId: `t${String(index)}`,
      name,
    })),
    einsatzstatus: "rueckmarsch",
    sicherheitstrupp: false,
    loggedInAtMs: SESSION_START.now,
    loggedOffAtMs: SESSION_START.now + 15 * 60_000,
    davonAktivMs: 10 * 60_000,
    notausschaltung,
  };
}

const ZWEI = ["MUSTERMANN M", "MUSTERMANN E"];
const SECHS = ["A", "B", "C", "D", "E", "F"];

/** S16 opened from the Startdisplay with these Einsatzprotokolle stored, oldest first. */
function einsatzprotokollScreen(
  einsatzprotokolle: readonly Einsatzprotokoll[],
): State {
  return run(
    createInitialState(SESSION_START, {
      einsatzprotokolle,
      nextEinsatznummer: einsatzprotokolle.length + 1,
    }),
    press("Check"),
    press("OK"),
    press("OK"),
  );
}

function kinds(state: State): readonly string[] {
  return einsatzprotokollWindow(state).map((line) => line.kind);
}

// manual 5.10, S16 figure
const ZWEI_PERSONEN_RECORD = [
  "title",
  "rule",
  "einsatznummer",
  "datum",
  "truppnummerEinsatzzeit",
  "rule",
  "einsatzkraefte",
  "atemschutztraeger",
  "atemschutztraeger",
  "rule",
  "einsatzVon",
  "bis",
  "davonAktiv",
  "rule",
  "protokollEnde",
];

describe("the Einsatzprotokoll screen", () => {
  // manual 5.10, S16 figure: a two-person Einsatzprotokoll exactly fills the screen
  it("shows a two-person Einsatzprotokoll whole, as in the figure", () => {
    const state = einsatzprotokollScreen([einsatzprotokoll(321, ZWEI)]);
    expect(state.screen).toBe("einsatzprotokoll");
    expect(kinds(state)).toEqual(ZWEI_PERSONEN_RECORD);
    expect(einsatzprotokollWindow(state)).toContainEqual({
      kind: "atemschutztraeger",
      name: "MUSTERMANN E",
    });
  });

  it("opens at the top of the newest Einsatzprotokoll", () => {
    const state = einsatzprotokollScreen([
      einsatzprotokoll(1, ZWEI),
      einsatzprotokoll(2, ZWEI),
    ]);
    expect(einsatzprotokollWindow(state).slice(0, 3)).toEqual([
      { kind: "title" },
      { kind: "rule" },
      { kind: "einsatznummer", einsatznummer: 2 },
    ]);
  });

  // ASSUMPTION: the strip scrolls line by line ("Show the Einsatzprotokolle on the LCD")
  it("scrolls one line further on Down and back on Up", () => {
    const state = einsatzprotokollScreen([einsatzprotokoll(1, SECHS)]);
    const down = run(state, press("Down"));
    expect(kinds(down)[0]).toBe("rule");
    expect(kinds(run(down, press("Up")))[0]).toBe("title");
  });

  it("stops scrolling at the top of the newest Einsatzprotokoll", () => {
    const state = einsatzprotokollScreen([einsatzprotokoll(1, SECHS)]);
    expect(reduce(state, press("Up"))).toBe(state);
  });

  it("stops scrolling once the oldest Protokoll Ende is in view", () => {
    const state = einsatzprotokollScreen([einsatzprotokoll(1, SECHS)]);
    const end = run(state, ...presses("Down", 4));
    expect(kinds(end).at(-1)).toBe("protokollEnde");
    expect(kinds(end)).toHaveLength(15);
    expect(reduce(end, press("Down"))).toBe(end);
  });

  it("does not scroll a single two-person Einsatzprotokoll", () => {
    const state = einsatzprotokollScreen([einsatzprotokoll(1, ZWEI)]);
    expect(reduce(state, press("Down"))).toBe(state);
  });

  it("rolls the next older Einsatzprotokoll into view past Protokoll Ende", () => {
    const state = einsatzprotokollScreen([
      einsatzprotokoll(1, ZWEI),
      einsatzprotokoll(2, ZWEI),
    ]);
    const window = einsatzprotokollWindow(run(state, ...presses("Down", 3)));
    expect(window.slice(11, 15)).toEqual([
      { kind: "protokollEnde" },
      { kind: "title" },
      { kind: "rule" },
      { kind: "einsatznummer", einsatznummer: 1 },
    ]);
  });

  it("scrolls back up into the newer Einsatzprotokoll", () => {
    const state = einsatzprotokollScreen([
      einsatzprotokoll(1, ZWEI),
      einsatzprotokoll(2, ZWEI),
    ]);
    const older = run(state, ...presses("Down", 15));
    expect(einsatzprotokollWindow(older)[2]).toEqual({
      kind: "einsatznummer",
      einsatznummer: 1,
    });
    expect(kinds(run(older, press("Up")))[0]).toBe("protokollEnde");
    expect(reduce(older, press("Down"))).toBe(older);
  });

  // ASSUMPTION: the Notausschaltung line ("Show the Einsatzprotokolle on the LCD"); manual p. 31
  it("adds a Notausschaltung line before Protokoll Ende", () => {
    const state = einsatzprotokollScreen([einsatzprotokoll(1, ZWEI, true)]);
    const end = run(state, ...presses("Down", 5));
    expect(kinds(end).slice(-3)).toEqual([
      "rule",
      "notausschaltung",
      "protokollEnde",
    ]);
    expect(kinds(end)[0]).toBe("rule");
    expect(reduce(end, press("Down"))).toBe(end);
  });

  // ASSUMPTION: `Kein Protokoll` ("Show the Einsatzprotokolle on the LCD")
  it("shows nothing and does not scroll with no Einsatzprotokoll stored", () => {
    const state = einsatzprotokollScreen([]);
    expect(einsatzprotokollWindow(state)).toEqual([]);
    expect(reduce(state, press("Down"))).toBe(state);
    expect(reduce(state, press("Up"))).toBe(state);
  });

  it("opens at the newest Einsatzprotokoll again on every entry", () => {
    const state = einsatzprotokollScreen([einsatzprotokoll(1, SECHS)]);
    const reentered = run(state, press("Down"), press("X"), press("OK"));
    expect(reentered.screen).toBe("einsatzprotokoll");
    expect(kinds(reentered)[0]).toBe("title");
  });

  // manual 5.10 step 6
  it("returns to SERVICE on X, the bar on Einsatzprotokoll, and to the Startdisplay on a second X", () => {
    const service = run(einsatzprotokollScreen([]), press("X"));
    expect(service.screen).toBe("service");
    expect(service.serviceAktion).toBe("einsatzprotokoll");
    expect(run(service, press("X")).screen).toBe("startdisplay");
  });

  // decided in "Show the Einsatzprotokolle on the LCD"
  it("restarts the Abschaltzeit when X twice reaches the Startdisplay", () => {
    const state = einsatzprotokollScreen([]);
    const later = reduce(state, {
      type: "tick",
      now: state.now + 60_000,
      realNow: state.realNow + 60_000,
    });
    expect(abschaltzeitRestMs(run(later, press("X"), press("X")))).toBe(25_000);
  });

  // manual p. 17
  it("ignores OK, Check and Tallys", () => {
    const state = einsatzprotokollScreen([einsatzprotokoll(1, ZWEI)]);
    expect(reduce(state, press("OK"))).toBe(state);
    expect(reduce(state, press("Check"))).toBe(state);
    expect(
      reduce(state, { type: "tallyHeld", tallyId: "a1", name: "HLF AT-F" }),
    ).toBe(state);
  });

  // decided in "Show the Einsatzprotokolle on the LCD"
  it("does not time out", () => {
    const state = einsatzprotokollScreen([]);
    const later = reduce(state, {
      type: "tick",
      now: state.now + 60 * 60_000,
      realNow: state.realNow + 60 * 60_000,
    });
    expect(later.screen).toBe("einsatzprotokoll");
  });
});
