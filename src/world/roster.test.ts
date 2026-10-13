import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import {
  DEFAULT_VEHICLES,
  isValidVehicle,
  ROSTER,
  rosterLabel,
  tallyHeld,
  truppHint,
} from "./index";
import type { RosterTally, Vehicles } from "./index";

function tally(index: number): RosterTally {
  const found = ROSTER[index];
  if (found === undefined) {
    throw new Error(`The Roster has no Tally ${String(index)}`);
  }
  return found;
}

function tap(index: number): Event {
  return tallyHeld(tally(index), DEFAULT_VEHICLES);
}

function stateAfter(...events: readonly Event[]): State {
  return events.reduce(reduce, createInitialState({ now: 0, realNow: 0 }));
}

describe("the Roster", () => {
  // decided in "Decide the contents of the fixed Tally roster"
  it("holds eight Tallys, each read by the Checkbox as its LCD text", () => {
    expect(ROSTER.map((entry) => tallyHeld(entry, DEFAULT_VEHICLES))).toEqual(
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
    expect(rosterLabel(tally(0), DEFAULT_VEHICLES)).toBe(
      "HLF · Angriffstruppführer",
    );
    expect(rosterLabel(tally(3), DEFAULT_VEHICLES)).toBe(
      "HLF · Wassertruppmann",
    );
    expect(rosterLabel(tally(5), DEFAULT_VEHICLES)).toBe(
      "LF · Angriffstruppmann",
    );
    expect(rosterLabel(tally(6), DEFAULT_VEHICLES)).toBe(
      "LF · Wassertruppführer",
    );
  });

  // decided in "Decide the contents of the fixed Tally roster"
  it("names each Tally after its vehicle's renamed Funkrufname and Kurzname", () => {
    const vehicles: Vehicles = [
      { funkrufname: "Florian Musterstadt 1/46-1", kurzname: "HLF 1" },
      { funkrufname: "Florian Musterstadt 1/44-1", kurzname: "LF Süd" },
    ];
    expect(rosterLabel(tally(0), vehicles)).toBe(
      "Florian Musterstadt 1/46-1 · Angriffstruppführer",
    );
    expect(tallyHeld(tally(0), vehicles)).toEqual({
      type: "tallyHeld",
      tallyId: "1",
      name: "HLF 1 AT-F",
    });
    expect(tallyHeld(tally(7), vehicles)).toEqual({
      type: "tallyHeld",
      tallyId: "8",
      name: "LF Süd WT-M",
    });
  });
});

describe("a vehicle's names", () => {
  // decided in "Decide the contents of the fixed Tally roster"
  it("accepts a Kurzname of at most 10 characters", () => {
    expect(isValidVehicle({ funkrufname: "HLF", kurzname: "HLF-Nord 1" })).toBe(
      true,
    );
    expect(
      isValidVehicle({ funkrufname: "HLF", kurzname: "HLF-Nord 12" }),
    ).toBe(false);
  });

  // ASSUMPTION in roster.ts, decided while implementing #38
  it("needs a Funkrufname and a Kurzname", () => {
    expect(isValidVehicle({ funkrufname: " ", kurzname: "HLF" })).toBe(false);
    expect(isValidVehicle({ funkrufname: "HLF", kurzname: "" })).toBe(false);
  });

  // ASSUMPTION in roster.ts, decided while implementing #38
  it("accepts only characters the LCD can show in a Kurzname", () => {
    expect(isValidVehicle({ funkrufname: "HLF", kurzname: "Größe" })).toBe(
      true,
    );
    expect(isValidVehicle({ funkrufname: "HLF", kurzname: "HLF €" })).toBe(
      false,
    );
  });
});

describe("the Trupp hint", () => {
  it("says a Tally is not logged in", () => {
    expect(truppHint(stateAfter(), tally(0))).toBe("nicht angemeldet");
  });

  it("names the Trupp a Tally is joining", () => {
    const state = stateAfter(tap(0));
    expect(truppHint(state, tally(0))).toBe("Anmeldung Trupp 01");
  });

  it("names the Trupp a Tally belongs to", () => {
    const state = stateAfter(
      tap(0),
      { type: "keyPressed", key: "OK" },
      tap(1),
      { type: "keyPressed", key: "OK" },
      { type: "keyPressed", key: "OK" },
    );
    expect(truppHint(state, tally(1))).toBe("Trupp 01");
    expect(truppHint(state, tally(2))).toBe("nicht angemeldet");
  });
});
