import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "./index";
import type { Event, Key, State } from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

const A1 = { tallyId: "a1", name: "HLF AT-F" };
const A2 = { tallyId: "a2", name: "HLF AT-M" };
const B1 = { tallyId: "b1", name: "LF AT-F" };
const B2 = { tallyId: "b2", name: "LF AT-M" };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

function hold(tally: { tallyId: string; name: string }): Event {
  return { type: "tallyHeld", ...tally };
}

function tickAfter(state: State, elapsedMs: number): Event {
  return {
    type: "tick",
    now: state.now + elapsedMs,
    realNow: state.realNow + elapsedMs,
  };
}

/** Trupp 01 of A1 and A2, logged in to Anmarsch, on the Einsatzliste. */
function truppInAnmarsch(): State {
  return run(
    createInitialState(SESSION_START),
    hold(A1),
    press("OK"),
    hold(A2),
    press("OK"),
    press("OK"),
  );
}

// Trupp 01 at its Einsatzziel, its Restzeit accepted unchanged, on the Einsatzliste.
function truppAtEinsatzziel(): State {
  return chooseInTruppMenue(truppInAnmarsch(), 2);
}

// Trupp 01 straight from Anmarsch into Rückmarsch, back on the Einsatzliste.
function truppInRueckmarsch(): State {
  return reduce(chooseInTruppMenue(truppInAnmarsch(), 3), press("X"));
}

// Opens the Trupp-Menü, moves down to the item and accepts its Flaschendruck editor with OK.
function chooseInTruppMenue(state: State, downs: number): State {
  return run(
    state,
    press("OK"),
    press("OK"),
    ...Array.from({ length: downs }, () => press("Down")),
    press("OK"),
    press("OK"),
  );
}

/** Trupp 01 of A1 and A2, logged in to Bereitschaft, on the Einsatzliste. */
function truppInBereitschaft(): State {
  return run(
    createInitialState(SESSION_START),
    hold(A1),
    press("OK"),
    hold(A2),
    press("Down"),
    press("OK"),
    press("OK"),
  );
}

describe("opening ABMELDEN", () => {
  // manual 5.8 step 1; decided in "Define the key-by-screen navigation model"
  it("opens ABMELDEN for the Trupp with the member marked when their Tally is held to Check", () => {
    const state = reduce(truppInAnmarsch(), hold(A2));
    expect(state.screen).toBe("abmelden");
    expect(state.logoff).toEqual({
      truppnummer: 1,
      markedTallyIds: [A2.tallyId],
    });
  });
  // decided in "Define the key-by-screen navigation model": logoffs still work while 6 Trupps run
  it("opens ABMELDEN while six Trupps run", () => {
    let state = truppInAnmarsch();
    for (let trupp = 2; trupp <= 6; trupp++) {
      state = run(
        state,
        hold({ tallyId: `t${String(trupp)}f`, name: "F" }),
        press("OK"),
        hold({ tallyId: `t${String(trupp)}m`, name: "M" }),
        press("OK"),
        press("OK"),
      );
    }
    expect(state.trupps).toHaveLength(6);
    expect(reduce(state, hold(A1)).screen).toBe("abmelden");
  });
});

describe("marking on ABMELDEN", () => {
  // manual 5.8 steps 2–3
  it("marks each further member of the Trupp", () => {
    const state = run(truppInAnmarsch(), hold(A2), hold(A1));
    expect(state.logoff?.markedTallyIds).toEqual([A2.tallyId, A1.tallyId]);
  });

  // decided in "Define the key-by-screen navigation model"
  it("ignores an Atemschutzträger of another Trupp or of none", () => {
    const abmelden = run(
      truppInAnmarsch(),
      hold(B1),
      press("OK"),
      hold(B2),
      press("OK"),
      press("OK"),
      hold(A1),
    );
    expect(reduce(abmelden, hold(B1))).toBe(abmelden);
    expect(reduce(abmelden, hold({ tallyId: "c1", name: "X" }))).toBe(abmelden);
  });

  it("ignores a member who is already marked", () => {
    const abmelden = run(truppInAnmarsch(), hold(A1));
    expect(reduce(abmelden, hold(A1))).toBe(abmelden);
  });
});

describe("leaving ABMELDEN", () => {
  // timing-and-alarm-rules §12.7: no logoff with anyone missing; the logoff Daueralarm (§7.3) is
  // not simulated yet
  it("does nothing on OK while a member is unmarked", () => {
    const abmelden = run(truppInAnmarsch(), hold(A1));
    expect(reduce(abmelden, press("OK"))).toBe(abmelden);
  });

  // decided in "Define the key-by-screen navigation model": no auto-logoff
  it("waits for OK once every member is marked", () => {
    const state = run(truppInAnmarsch(), hold(A1), hold(A2));
    expect(state.screen).toBe("abmelden");
    expect(state.trupps).toHaveLength(1);
  });

  it.each<Key>(["Up", "Down", "Check"])("ignores %s", (key) => {
    const abmelden = run(truppInAnmarsch(), hold(A1), hold(A2));
    expect(reduce(abmelden, press(key))).toBe(abmelden);
  });

  // manual 5.8 step 4; decided in "Define the key-by-screen navigation model"
  it("returns to the Einsatzliste on X with the marks cleared and the Trupp unchanged", () => {
    const before = truppInAnmarsch();
    const state = run(before, hold(A1), hold(A2), press("X"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.logoff).toBeNull();
    expect(state.trupps).toEqual(before.trupps);
  });
});

// timing-and-alarm-rules §12.7; verification scenario V17
describe.each([
  { einsatzstatus: "anmarsch", truppInStatus: truppInAnmarsch },
  { einsatzstatus: "einsatzzielErreicht", truppInStatus: truppAtEinsatzziel },
  { einsatzstatus: "rueckmarsch", truppInStatus: truppInRueckmarsch },
  { einsatzstatus: "bereitschaft", truppInStatus: truppInBereitschaft },
])(
  "logging off a Trupp in $einsatzstatus",
  ({ einsatzstatus, truppInStatus }) => {
    function loggedOff(): State {
      const running = truppInStatus();
      // before the first Alarmgrenze and Bereitschaft Alarm, so no Alarm takes over from ABMELDEN
      const later = run(running, tickAfter(running, 4 * 60_000));
      return run(later, hold(A1), hold(A2), press("OK"));
    }

    it("fires none of its Alarms afterwards", () => {
      const state = loggedOff();
      const later = reduce(state, tickAfter(state, 30 * 60_000));
      expect(later.pendingAlarms).toEqual([]);
      expect(later.screen).not.toBe("alarm");
    });

    it("removes the Trupp from the Einsatzliste", () => {
      const state = loggedOff();
      expect(state.screen).toBe("einsatzliste");
      expect(state.trupps).toEqual([]);
      expect(state.logoff).toBeNull();
    });

    // manual 5.8 step 4: "Alle Einsatzdaten werden gespeichert"
    it("records an Einsatzprotokoll with the Einsatzstatus at logoff", () => {
      expect(loggedOff().einsatzprotokolle).toEqual([
        {
          truppnummer: 1,
          einsatzzeitMs: 30 * 60_000,
          atemschutztraeger: [A1, A2],
          einsatzstatus,
          sicherheitstrupp: false,
          loggedInAtMs: SESSION_START.now,
          loggedOffAtMs: SESSION_START.now + 4 * 60_000,
        },
      ]);
    });
  },
);

describe("the Einsatzliste after a logoff", () => {
  function twoTrupps(): State {
    return run(
      truppInAnmarsch(),
      hold(B1),
      press("OK"),
      hold(B2),
      press("OK"),
      press("OK"),
    );
  }

  it("keeps the selection on another Trupp", () => {
    const state = run(twoTrupps(), hold(A1), hold(A2), press("OK"));
    expect(state.trupps.map((trupp) => trupp.truppnummer)).toEqual([2]);
    expect(state.selectedTruppnummer).toBe(2);
  });

  it("selects the first remaining Trupp when the selected one logs off", () => {
    const state = run(twoTrupps(), hold(B1), hold(B2), press("OK"));
    expect(state.selectedTruppnummer).toBe(1);
  });
});

describe("the empty Einsatzliste", () => {
  function realTickAfter(state: State, elapsedMs: number): Event {
    return {
      type: "tick",
      now: state.now,
      realNow: state.realNow + elapsedMs,
    };
  }

  function emptied(): State {
    return run(truppInAnmarsch(), hold(A1), hold(A2), press("OK"));
  }

  // manual p. 34; timing-and-alarm-rules §9.1: on real time
  it("switches to Aus when the Abschaltzeit runs out after the last logoff", () => {
    const state = emptied();
    expect(reduce(state, realTickAfter(state, 24_999)).screen).toBe(
      "einsatzliste",
    );
    expect(reduce(state, realTickAfter(state, 25_000)).screen).toBe("aus");
  });

  it("stays on while a Trupp is still logged in", () => {
    const state = truppInAnmarsch();
    expect(reduce(state, tickAfter(state, 60_000)).screen).toBe("einsatzliste");
  });
});

describe("the Einsatzprotokolle", () => {
  function logInAndOff(state: State): State {
    return run(
      state,
      hold(A1),
      press("OK"),
      hold(A2),
      press("OK"),
      press("OK"),
      tickAfter(state, 60_000),
      hold(A1),
      hold(A2),
      press("OK"),
    );
  }

  // manual p. 15, p. 32; decided in "Decide what survives a page reload"
  it("keeps exactly the latest 100, overwriting the oldest", () => {
    let state = createInitialState(SESSION_START);
    for (let einsatz = 0; einsatz < 101; einsatz++) {
      state = logInAndOff(state);
    }
    expect(state.einsatzprotokolle).toHaveLength(100);
    expect(state.einsatzprotokolle[0]?.loggedOffAtMs).toBe(
      SESSION_START.now + 2 * 60_000,
    );
    expect(state.einsatzprotokolle[99]?.loggedOffAtMs).toBe(
      SESSION_START.now + 101 * 60_000,
    );
  });

  // decided in "Decide what survives a page reload": they are device memory, kept across sessions
  it("carries the device memory's Einsatzprotokolle into a new session", () => {
    const previousSession = logInAndOff(createInitialState(SESSION_START));
    const kept = previousSession.einsatzprotokolle;
    const state = logInAndOff(createInitialState(SESSION_START, kept));
    expect(state.einsatzprotokolle).toHaveLength(2);
    expect(state.einsatzprotokolle[0]).toEqual(kept[0]);
  });
});
