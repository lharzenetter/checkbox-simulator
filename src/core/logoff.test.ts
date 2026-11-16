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

/** Trupp 01 of A1 and A2, logged in to Anmarsch, on the Einsatzliste once X closes its Trupp-Ansicht. */
function truppInAnmarsch(): State {
  return run(
    createInitialState(SESSION_START),
    hold(A1),
    press("OK"),
    hold(A2),
    press("OK"),
    press("OK"),
    press("X"),
  );
}

// Trupp 01 at its Einsatzziel, its Restzeit accepted unchanged, on the Einsatzliste.
function truppAtEinsatzziel(): State {
  return chooseInTruppMenue(truppInAnmarsch(), 2);
}

// Trupp 01 turned back at its Einsatzziel, back on the Einsatzliste.
function truppInRueckmarsch(): State {
  return chooseInTruppMenue(truppAtEinsatzziel(), 2);
}

// Opens the Trupp-Menü, moves down to the item, accepts its Flaschendruck editor with OK and closes
// the Trupp-Ansicht with X.
function chooseInTruppMenue(state: State, downs: number): State {
  return run(
    state,
    press("OK"),
    ...Array.from({ length: downs }, () => press("Down")),
    press("OK"),
    press("OK"),
    press("X"),
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
    press("X"),
  );
}

describe("opening ABMELDEN", () => {
  // decided in "Define the key-by-screen navigation model": logoffs still work while 6 Trupps run;
  // the default Roster's 8 Tallys can't run six Trupps, so no scenario states this yet
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
  it.each<Key>(["Up", "Down", "Check"])("ignores %s", (key) => {
    const abmelden = run(truppInAnmarsch(), hold(A1), hold(A2));
    expect(reduce(abmelden, press(key))).toBe(abmelden);
  });
});

// timing-and-alarm-rules §12.7; verification scenario V17
describe.each([
  {
    einsatzstatus: "anmarsch",
    truppInStatus: truppInAnmarsch,
    davonAktivMs: 4 * 60_000,
  },
  {
    einsatzstatus: "einsatzzielErreicht",
    truppInStatus: truppAtEinsatzziel,
    davonAktivMs: 4 * 60_000,
  },
  {
    einsatzstatus: "rueckmarsch",
    truppInStatus: truppInRueckmarsch,
    davonAktivMs: 4 * 60_000,
  },
  {
    einsatzstatus: "bereitschaft",
    truppInStatus: truppInBereitschaft,
    davonAktivMs: 0,
  },
])(
  "logging off a Trupp in $einsatzstatus",
  ({ einsatzstatus, truppInStatus, davonAktivMs }) => {
    function loggedOff(): State {
      const running = truppInStatus();
      // before the first Alarmgrenze and Bereitschaft Alarm, so no Alarm takes over from ABMELDEN
      const later = run(running, tickAfter(running, 4 * 60_000));
      return run(later, hold(A1), hold(A2), press("OK"));
    }

    // manual 5.8 step 4: "Alle Einsatzdaten werden gespeichert"
    it("records an Einsatzprotokoll with the Einsatzstatus at logoff", () => {
      expect(loggedOff().einsatzprotokolle).toEqual([
        {
          einsatznummer: 1,
          truppnummer: 1,
          einsatzzeitMs: 30 * 60_000,
          atemschutztraeger: [A1, A2],
          einsatzstatus,
          sicherheitstrupp: false,
          loggedInAtMs: SESSION_START.now,
          loggedOffAtMs: SESSION_START.now + 4 * 60_000,
          davonAktivMs,
          notausschaltung: false,
        },
      ]);
    });
  },
);

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
  it("carries the device memory's Einsatzprotokolle and Einsatznummer into a new session", () => {
    const previousSession = logInAndOff(createInitialState(SESSION_START));
    const kept = previousSession.einsatzprotokolle;
    const state = logInAndOff(
      createInitialState(SESSION_START, {
        einsatzprotokolle: kept,
        nextEinsatznummer: previousSession.nextEinsatznummer,
      }),
    );
    expect(state.einsatzprotokolle).toHaveLength(2);
    expect(state.einsatzprotokolle[0]).toEqual(kept[0]);
    expect(state.einsatzprotokolle[1]?.einsatznummer).toBe(2);
  });

  // ASSUMPTION: one Einsatznummer per Einsatzprotokoll ("Show the Einsatzprotokolle on the LCD")
  it("numbers them in the order they are written", () => {
    const state = logInAndOff(logInAndOff(createInitialState(SESSION_START)));
    expect(
      state.einsatzprotokolle.map((protokoll) => protokoll.einsatznummer),
    ).toEqual([1, 2]);
  });

  it("keeps counting after the oldest are overwritten, never reusing an Einsatznummer", () => {
    let state = createInitialState(SESSION_START);
    for (let einsatz = 0; einsatz < 101; einsatz++) {
      state = logInAndOff(state);
    }
    expect(state.einsatzprotokolle[0]?.einsatznummer).toBe(2);
    expect(state.einsatzprotokolle[99]?.einsatznummer).toBe(101);
    expect(state.nextEinsatznummer).toBe(102);
  });

  // ASSUMPTION: `davon aktiv` is `t_run` ("Show the Einsatzprotokolle on the LCD")
  it("records as davon aktiv only the time spent outside Bereitschaft", () => {
    const anmarsch = truppInAnmarsch();
    const bereitschaft = run(
      anmarsch,
      tickAfter(anmarsch, 3 * 60_000),
      press("OK"),
      press("Down"),
      press("OK"),
    );
    expect(bereitschaft.trupps[0]?.einsatzstatus).toBe("bereitschaft");
    const state = run(
      bereitschaft,
      tickAfter(bereitschaft, 2 * 60_000),
      hold(A1),
      hold(A2),
      press("OK"),
    );
    expect(state.einsatzprotokolle[0]?.davonAktivMs).toBe(3 * 60_000);
    expect(state.einsatzprotokolle[0]?.loggedOffAtMs).toBe(
      SESSION_START.now + 5 * 60_000,
    );
  });
});
