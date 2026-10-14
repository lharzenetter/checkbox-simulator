import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import {
  DEFAULT_VEHICLES,
  isValidVehicle,
  ROSTER,
  roleCode,
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
  it("marks each Tally with its role code", () => {
    expect(ROSTER.map(roleCode)).toEqual([
      "AT-F",
      "AT-M",
      "WT-F",
      "WT-M",
      "AT-F",
      "AT-M",
      "WT-F",
      "WT-M",
    ]);
  });

  // decided in "Decide the contents of the fixed Tally roster"
  it("names each Tally after its vehicle's renamed Kurzname", () => {
    const vehicles: Vehicles = [
      { funkrufname: "Florian Musterstadt 1/46-1", kurzname: "HLF 1" },
      { funkrufname: "Florian Musterstadt 1/44-1", kurzname: "LF Süd" },
    ];
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
    expect(truppHint(stateAfter(), tally(0))).toEqual({
      kind: "notLoggedIn",
      text: "nicht angemeldet",
    });
  });

  it("names the Trupp a Tally is joining", () => {
    const state = stateAfter(tap(0));
    expect(truppHint(state, tally(0))).toEqual({
      kind: "joining",
      text: "Anmeldung Trupp 01",
    });
  });

  it("names the Trupp a Tally belongs to", () => {
    const state = stateAfter(
      tap(0),
      { type: "keyPressed", key: "OK" },
      tap(1),
      { type: "keyPressed", key: "OK" },
      { type: "keyPressed", key: "OK" },
    );
    expect(truppHint(state, tally(1))).toEqual({
      kind: "inTrupp",
      text: "Trupp 01",
    });
    expect(truppHint(state, tally(2))).toEqual({
      kind: "notLoggedIn",
      text: "nicht angemeldet",
    });
  });
});
