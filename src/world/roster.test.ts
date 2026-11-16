import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import {
  addFahrzeug,
  canAddFahrzeug,
  DEFAULT_FAHRZEUGE,
  hasDuplicateKurzname,
  isValidFahrzeug,
  isValidRoster,
  removalBlocker,
  removeFahrzeug,
  rosterTallys,
  roleCode,
  tallyHeld,
  truppHint,
} from "./index";
import type { Fahrzeug, Fahrzeuge, RosterTally } from "./index";

function tally(fahrzeuge: Fahrzeuge, index: number): RosterTally {
  const found = rosterTallys(fahrzeuge)[index];
  if (found === undefined) {
    throw new Error(`The Roster has no Tally ${String(index)}`);
  }
  return found;
}

function tap(index: number): Event {
  return tallyHeld(tally(DEFAULT_FAHRZEUGE, index), DEFAULT_FAHRZEUGE);
}

function stateAfter(...events: readonly Event[]): State {
  return events.reduce(reduce, createInitialState({ now: 0, realNow: 0 }));
}

function named(funkrufname: string, kurzname: string): Fahrzeug {
  return { id: "1", funkrufname, kurzname };
}

function names(fahrzeuge: Fahrzeuge): readonly (readonly [string, string])[] {
  return fahrzeuge.map((fahrzeug) => [fahrzeug.funkrufname, fahrzeug.kurzname]);
}

// Renames the Fahrzeuge in order, keeping their identity.
function renamed(
  fahrzeuge: Fahrzeuge,
  ...newNames: readonly (readonly [string, string])[]
): Fahrzeuge {
  return fahrzeuge.map((fahrzeug, index) => {
    const [funkrufname, kurzname] = newNames[index] ?? [
      fahrzeug.funkrufname,
      fahrzeug.kurzname,
    ];
    return { ...fahrzeug, funkrufname, kurzname };
  });
}

const LOG_IN_HLF_ANGRIFFSTRUPP: readonly Event[] = [
  tap(0),
  { type: "keyPressed", key: "OK" },
  tap(1),
  { type: "keyPressed", key: "OK" },
  { type: "keyPressed", key: "OK" },
];

describe("the Roster", () => {
  // decided in "Decide the contents of the fixed Tally roster"
  it("marks each Tally with its role code", () => {
    expect(rosterTallys(DEFAULT_FAHRZEUGE).map(roleCode)).toEqual([
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

  it("gives every Tally its own id", () => {
    const fahrzeuge = addFahrzeug(addFahrzeug(DEFAULT_FAHRZEUGE));
    const ids = rosterTallys(fahrzeuge).map((entry) => entry.tallyId);
    expect(new Set(ids).size).toBe(16);
  });
});

describe("adding a Fahrzeug", () => {
  // decided in "Let the Trainee add and remove Fahrzeuge", point 6
  it("prefills an appended Fahrzeug's Funkrufname along with its Kurzname", () => {
    const fahrzeuge = addFahrzeug(addFahrzeug(DEFAULT_FAHRZEUGE));
    expect(names(fahrzeuge)).toEqual([
      ["1/43", "HLF"],
      ["1/45", "LF"],
      ["1/33", "DLK"],
      ["1/23", "TLF"],
    ]);
  });

  // decided in "Let the Trainee add and remove Fahrzeuge", point 1
  it("adds no fifth Fahrzeug", () => {
    const four = addFahrzeug(addFahrzeug(DEFAULT_FAHRZEUGE));
    expect(canAddFahrzeug(four)).toBe(false);
    expect(addFahrzeug(four)).toBe(four);
    expect(canAddFahrzeug(DEFAULT_FAHRZEUGE)).toBe(true);
  });
});

describe("removing a Fahrzeug", () => {
  // decided in "Let the Trainee add and remove Fahrzeuge", point 5
  it("keeps the last Fahrzeug", () => {
    const [hlf, lf] = DEFAULT_FAHRZEUGE;
    if (hlf === undefined || lf === undefined) {
      throw new Error("The Roster has no Fahrzeug");
    }
    const one = removeFahrzeug(DEFAULT_FAHRZEUGE, hlf.id);
    expect(removalBlocker(stateAfter(), one, lf.id)).toBe("lastFahrzeug");
    expect(removalBlocker(stateAfter(), DEFAULT_FAHRZEUGE, lf.id)).toBe(
      undefined,
    );
  });

  // decided in "Let the Trainee add and remove Fahrzeuge", point 2
  it("keeps a Fahrzeug whose Tally is on the open Anmeldefenster", () => {
    const [hlf, lf] = DEFAULT_FAHRZEUGE;
    if (hlf === undefined || lf === undefined) {
      throw new Error("The Roster has no Fahrzeug");
    }
    const state = stateAfter(tap(4));
    expect(removalBlocker(state, DEFAULT_FAHRZEUGE, lf.id)).toBe("inUse");
    expect(removalBlocker(state, DEFAULT_FAHRZEUGE, hlf.id)).toBe(undefined);
  });

  // decided in "Let the Trainee add and remove Fahrzeuge", point 2
  it("keeps a Fahrzeug with a logged-in Trupp, but not one only in an Einsatzprotokoll", () => {
    const [hlf] = DEFAULT_FAHRZEUGE;
    if (hlf === undefined) {
      throw new Error("The Roster has no Fahrzeug");
    }
    const loggedIn = stateAfter(...LOG_IN_HLF_ANGRIFFSTRUPP);
    expect(removalBlocker(loggedIn, DEFAULT_FAHRZEUGE, hlf.id)).toBe("inUse");
    const loggedOff = stateAfter(...LOG_IN_HLF_ANGRIFFSTRUPP, tap(0), tap(1), {
      type: "keyPressed",
      key: "OK",
    });
    expect(loggedOff.einsatzprotokolle).toHaveLength(1);
    expect(removalBlocker(loggedOff, DEFAULT_FAHRZEUGE, hlf.id)).toBe(
      undefined,
    );
  });
});

describe("a Fahrzeug's names", () => {
  // decided in "Decide the contents of the fixed Tally roster"
  it("accepts a Kurzname of at most 10 characters", () => {
    expect(isValidFahrzeug(named("HLF", "HLF-Nord 1"))).toBe(true);
    expect(isValidFahrzeug(named("HLF", "HLF-Nord 12"))).toBe(false);
  });

  // ASSUMPTION in roster.ts, decided while implementing #38
  it("needs a Funkrufname and a Kurzname", () => {
    expect(isValidFahrzeug(named(" ", "HLF"))).toBe(false);
    expect(isValidFahrzeug(named("HLF", ""))).toBe(false);
  });

  // ASSUMPTION in roster.ts, decided while implementing #38
  it("accepts only characters the LCD can show in a Kurzname", () => {
    expect(isValidFahrzeug(named("HLF", "Größe"))).toBe(true);
    expect(isValidFahrzeug(named("HLF", "HLF €"))).toBe(false);
  });

  // decided in "Let the Trainee add and remove Fahrzeuge", point 7
  it("finds a Kurzname another Fahrzeug already has, trimmed and ignoring case", () => {
    const fahrzeuge = renamed(
      addFahrzeug(DEFAULT_FAHRZEUGE),
      ["1/43", "HLF"],
      ["1/45", " hlf"],
    );
    expect(
      fahrzeuge.map((fahrzeug) => hasDuplicateKurzname(fahrzeuge, fahrzeug)),
    ).toEqual([true, true, false]);
    expect(isValidRoster(fahrzeuge)).toBe(false);
  });

  // decided in "Let the Trainee add and remove Fahrzeuge", points 1 and 7
  it("accepts a Roster of one to four valid Fahrzeuge with their own Kurznamen", () => {
    const four = addFahrzeug(addFahrzeug(DEFAULT_FAHRZEUGE));
    expect(isValidRoster(four)).toBe(true);
    expect(isValidRoster(four.slice(0, 1))).toBe(true);
    expect(isValidRoster([])).toBe(false);
    expect(isValidRoster([...four, { ...named("1/11", "ELW"), id: "9" }])).toBe(
      false,
    );
    expect(isValidRoster(renamed(four, ["1/43", "HLF €"]))).toBe(false);
    expect(isValidRoster([{ ...named("1/43", "HLF"), id: "a" }])).toBe(false);
  });

  // decided in "Let the Trainee add and remove Fahrzeuge", point 7
  it("lets Funkrufnamen repeat", () => {
    expect(
      isValidRoster(
        renamed(DEFAULT_FAHRZEUGE, ["1/43", "HLF"], ["1/43", "LF"]),
      ),
    ).toBe(true);
  });
});

describe("the Trupp hint", () => {
  it("says a Tally is not logged in", () => {
    expect(truppHint(stateAfter(), tally(DEFAULT_FAHRZEUGE, 0))).toEqual({
      kind: "notLoggedIn",
      text: "nicht angemeldet",
    });
  });

  it("names the Trupp a Tally is joining", () => {
    const state = stateAfter(tap(0));
    expect(truppHint(state, tally(DEFAULT_FAHRZEUGE, 0))).toEqual({
      kind: "joining",
      text: "Anmeldung Trupp 01",
    });
  });

  it("names the Trupp a Tally belongs to", () => {
    const state = stateAfter(...LOG_IN_HLF_ANGRIFFSTRUPP);
    expect(truppHint(state, tally(DEFAULT_FAHRZEUGE, 1))).toEqual({
      kind: "inTrupp",
      text: "Trupp 01",
    });
    expect(truppHint(state, tally(DEFAULT_FAHRZEUGE, 2))).toEqual({
      kind: "notLoggedIn",
      text: "nicht angemeldet",
    });
  });
});
