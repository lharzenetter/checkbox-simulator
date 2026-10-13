import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import { ROSTER, rosterLabel, tallyHeld, truppHint } from "./index";
import type { RosterTally } from "./index";

function tally(index: number): RosterTally {
  const found = ROSTER[index];
  if (found === undefined) {
    throw new Error(`The Roster has no Tally ${String(index)}`);
  }
  return found;
}

function stateAfter(...events: readonly Event[]): State {
  return events.reduce(reduce, createInitialState({ now: 0, realNow: 0 }));
}

describe("the Roster", () => {
  // decided in "Decide the contents of the fixed Tally roster"
  it("holds eight Tallys, each read by the Checkbox as its LCD text", () => {
    expect(ROSTER.map((entry) => tallyHeld(entry))).toEqual(
      [
        "HLF AT-F",
        "HLF AT-M",
        "HLF WT-F",
        "HLF WT-M",
        "LF AT-F",
        "LF AT-M",
        "LF WT-F",
        "LF WT-M",
      ].map((name, index) => ({
        type: "tallyHeld",
        tallyId: String(index + 1),
        name,
      })),
    );
  });

  // decided in "Decide the contents of the fixed Tally roster"
  it("labels each Tally with its Funkrufname and role", () => {
    expect(rosterLabel(tally(0))).toBe("HLF · Angriffstruppführer");
    expect(rosterLabel(tally(3))).toBe("HLF · Wassertruppmann");
    expect(rosterLabel(tally(5))).toBe("LF · Angriffstruppmann");
    expect(rosterLabel(tally(6))).toBe("LF · Wassertruppführer");
  });
});

describe("the Trupp hint", () => {
  it("says a Tally is not logged in", () => {
    expect(truppHint(stateAfter(), tally(0))).toBe("nicht angemeldet");
  });

  it("names the Trupp a Tally is joining", () => {
    const state = stateAfter(tallyHeld(tally(0)));
    expect(truppHint(state, tally(0))).toBe("Anmeldung Trupp 01");
  });

  it("names the Trupp a Tally belongs to", () => {
    const state = stateAfter(
      tallyHeld(tally(0)),
      { type: "keyPressed", key: "OK" },
      tallyHeld(tally(1)),
      { type: "keyPressed", key: "OK" },
      { type: "keyPressed", key: "OK" },
    );
    expect(truppHint(state, tally(1))).toBe("Trupp 01");
    expect(truppHint(state, tally(2))).toBe("nicht angemeldet");
  });
});
