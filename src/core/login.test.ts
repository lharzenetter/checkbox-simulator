import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "./index";
import type { Event, Key, State } from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

const A1 = { tallyId: "a1", name: "HLF AT-F" };
const A2 = { tallyId: "a2", name: "HLF AT-M" };
const B1 = { tallyId: "b1", name: "LF AT-F" };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

function hold(tally: { tallyId: string; name: string }): Event {
  return { type: "tallyHeld", ...tally };
}

function aus(): State {
  return createInitialState(SESSION_START);
}

describe("starting a login", () => {
  // decided in "Define the key-by-screen navigation model"
  it("opens Einsatzzeit wählen when a Tally is held to Check while Aus", () => {
    const state = run(aus(), hold(A1));
    expect(state.screen).toBe("einsatzzeitWaehlen");
    expect(state.login).toMatchObject({
      truppnummer: 1,
      atemschutztraeger: [A1],
    });
  });

  it("opens Einsatzzeit wählen from the Startdisplay", () => {
    expect(run(aus(), press("Check"), hold(A1)).screen).toBe(
      "einsatzzeitWaehlen",
    );
  });

  it("ignores a Tally on SERVICE", () => {
    const service = run(aus(), press("Check"), press("OK"));
    expect(reduce(service, hold(A1))).toBe(service);
  });
});

describe("Einsatzzeit wählen", () => {
  // decided in "Define the key-by-screen navigation model"
  it("opens the Anmeldefenster for 30 min on OK", () => {
    const state = run(aus(), hold(A1), press("OK"));
    expect(state.screen).toBe("anmeldefenster");
    expect(state.login?.einsatzzeitMs).toBe(30 * 60_000);
  });
});

describe("the Anmeldefenster", () => {
  function anmeldefenster(): State {
    return run(aus(), hold(A1), press("OK"));
  }

  // manual 5.3 step 6
  it("adds each further Tally held to Check as an Atemschutzträger", () => {
    const state = run(anmeldefenster(), hold(A2), hold(B1));
    expect(state.login?.atemschutztraeger).toEqual([A1, A2, B1]);
  });

  // decided in "Define the key-by-screen navigation model"
  it("ignores a Tally that is already in the Trupp", () => {
    const state = run(anmeldefenster(), hold(A2));
    expect(reduce(state, hold(A1))).toBe(state);
  });

  // manual 5.3 step 6: at most six Atemschutzträger on V04
  it("ignores a seventh Atemschutzträger", () => {
    const six = run(
      anmeldefenster(),
      ...["2", "3", "4", "5", "6"].map((id) => hold({ tallyId: id, name: id })),
    );
    expect(reduce(six, hold({ tallyId: "7", name: "7" }))).toBe(six);
  });

  // decided in "Define the key-by-screen navigation model"
  it("opens the Anfangsdruck editor at 300 bar on `Trupp OK Einsatz` + OK", () => {
    const state = run(anmeldefenster(), hold(A2), press("OK"));
    expect(state.screen).toBe("anfangsdruckEditor");
    expect(state.login?.anfangsdruckBar).toBe(300);
  });

  // manual 9.1 [07]: a Trupp needs at least two Atemschutzträger
  it("does not confirm a Trupp of one", () => {
    const state = anmeldefenster();
    expect(reduce(state, press("OK"))).toBe(state);
  });
});

describe("the Anfangsdruck editor", () => {
  function anfangsdruckEditor(): State {
    return run(aus(), hold(A1), press("OK"), hold(A2), press("OK"));
  }

  function anfangsdruckAfter(...keys: readonly Key[]): number | undefined {
    return run(anfangsdruckEditor(), ...keys.map(press)).login?.anfangsdruckBar;
  }

  // manual 9.1 [76]
  it("changes the Anfangsdruck in 5-bar steps", () => {
    expect(anfangsdruckAfter("Down")).toBe(295);
    expect(anfangsdruckAfter("Up", "Up")).toBe(310);
  });

  // verification-scenarios V2; timing-and-alarm-rules §1.6
  it("stops at 270 bar going down and at 330 bar going up", () => {
    expect(anfangsdruckAfter(...Array<Key>(20).fill("Down"))).toBe(270);
    expect(anfangsdruckAfter(...Array<Key>(20).fill("Up"))).toBe(330);
  });

  // decided in "Define the key-by-screen navigation model": S06 has no X
  it("ignores X", () => {
    const state = anfangsdruckEditor();
    expect(reduce(state, press("X"))).toBe(state);
  });

  // decided in "Define the key-by-screen navigation model"
  it("logs the Trupp in on OK and shows it selected on the Einsatzliste", () => {
    const state = run(anfangsdruckEditor(), press("OK"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.login).toBeNull();
    expect(state.selectedTruppnummer).toBe(1);
    expect(state.trupps).toEqual([
      {
        truppnummer: 1,
        einsatzzeitMs: 30 * 60_000,
        atemschutztraeger: [A1, A2],
        einsatzstatus: "anmarsch",
        restzeitMs: 30 * 60_000,
      },
    ]);
  });

  // verification-scenarios V2; timing-and-alarm-rules §1.3
  it("scales the initial Restzeit by the Anfangsdruck", () => {
    function restzeitAt(...keys: readonly Key[]): number | undefined {
      return run(anfangsdruckEditor(), ...keys.map(press), press("OK"))
        .trupps[0]?.restzeitMs;
    }
    expect(restzeitAt(...Array<Key>(6).fill("Down"))).toBe(27 * 60_000);
    expect(restzeitAt(...Array<Key>(6).fill("Up"))).toBe(33 * 60_000);
  });
});

function loggedIn(
  state: State,
  atemschutztraeger: readonly { tallyId: string; name: string }[],
  ...anfangsdruckKeys: readonly Key[]
): State {
  const [first, ...rest] = atemschutztraeger;
  if (first === undefined) {
    throw new Error("A login needs a Tally");
  }
  return run(
    state,
    hold(first),
    press("OK"),
    ...rest.map(hold),
    press("OK"),
    ...anfangsdruckKeys.map(press),
    press("OK"),
  );
}

function tickBy(state: State, elapsedMs: number): State {
  return reduce(state, {
    type: "tick",
    now: state.now + elapsedMs,
    realNow: state.realNow + elapsedMs,
  });
}

describe("the Restzeit", () => {
  // timing-and-alarm-rules §1.1
  it("counts down one second per second of simulated time", () => {
    const einsatzliste = loggedIn(aus(), [A1, A2]);
    const later = reduce(einsatzliste, {
      type: "tick",
      now: einsatzliste.now + 60_000,
      realNow: einsatzliste.realNow + 6_000,
    });
    expect(later.trupps[0]?.restzeitMs).toBe(29 * 60_000);
  });

  // timing-and-alarm-rules §1.2
  it("keeps counting below zero", () => {
    const einsatzliste = loggedIn(aus(), [A1, A2]);
    expect(tickBy(einsatzliste, 31 * 60_000).trupps[0]?.restzeitMs).toBe(
      -60_000,
    );
  });

  // verification-scenarios V2
  it("reaches −0:05:00 at 32:00 after an Anfangsdruck of 270 bar", () => {
    const einsatzliste = loggedIn(
      aus(),
      [A1, A2],
      ...Array<Key>(6).fill("Down"),
    );
    expect(tickBy(einsatzliste, 32 * 60_000).trupps[0]?.restzeitMs).toBe(
      -5 * 60_000,
    );
  });

  // verification-scenarios V2
  it("reaches 17:06 at 9:54 after an Anfangsdruck of 270 bar", () => {
    const einsatzliste = loggedIn(
      aus(),
      [A1, A2],
      ...Array<Key>(6).fill("Down"),
    );
    expect(
      tickBy(einsatzliste, (9 * 60 + 54) * 1000).trupps[0]?.restzeitMs,
    ).toBe((17 * 60 + 6) * 1000);
  });

  it("does not switch the Einsatzliste to Aus", () => {
    const einsatzliste = loggedIn(aus(), [A1, A2]);
    expect(tickBy(einsatzliste, 60_000).screen).toBe("einsatzliste");
  });
});

describe("a second login", () => {
  const C1 = { tallyId: "c1", name: "LF AT-M" };

  // decided in "Define the key-by-screen navigation model"
  it("starts from the Einsatzliste with the next free Truppnummer", () => {
    const state = run(loggedIn(aus(), [A1, A2]), hold(B1));
    expect(state.screen).toBe("einsatzzeitWaehlen");
    expect(state.login?.truppnummer).toBe(2);
  });

  it("selects the new Trupp and keeps the first one running", () => {
    const first = tickBy(loggedIn(aus(), [A1, A2]), 60_000);
    const second = tickBy(loggedIn(first, [B1, C1]), 60_000);
    expect(second.selectedTruppnummer).toBe(2);
    expect(second.trupps.map((trupp) => trupp.restzeitMs)).toEqual([
      28 * 60_000,
      29 * 60_000,
    ]);
  });

  // decided in "Define the key-by-screen navigation model"
  it("is not joined by an Atemschutzträger of a running Trupp", () => {
    const anmeldefenster = run(
      loggedIn(aus(), [A1, A2]),
      hold(B1),
      press("OK"),
    );
    expect(reduce(anmeldefenster, hold(A2))).toBe(anmeldefenster);
  });

  // manual 9.1 [72]; decided in "Define the key-by-screen navigation model"
  it("is not started while six Trupps run", () => {
    const sixTrupps = [1, 2, 3, 4, 5, 6].reduce(
      (state, index) =>
        loggedIn(state, [
          { tallyId: `${String(index)}a`, name: "a" },
          { tallyId: `${String(index)}b`, name: "b" },
        ]),
      aus(),
    );
    expect(sixTrupps.trupps).toHaveLength(6);
    expect(reduce(sixTrupps, hold(B1))).toBe(sixTrupps);
  });
});
