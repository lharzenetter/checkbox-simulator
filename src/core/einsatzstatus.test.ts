import { describe, expect, it } from "vitest";
import {
  createInitialState,
  estimateFlaschendruckBar,
  isSicherShown,
  reduce,
  rueckzugsdruckBar,
  selectedTrupp,
  truppMenueAktionen,
} from "./index";
import type {
  Einsatzstatus,
  Event,
  Key,
  State,
  TruppMenueAktion,
} from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

const A1 = { tallyId: "a1", name: "HLF AT-F" };
const A2 = { tallyId: "a2", name: "HLF AT-M" };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

function presses(key: Key, count: number): readonly Event[] {
  return Array.from({ length: count }, () => press(key));
}

function tickAt(minutes: number, seconds = 0): Event {
  const elapsedMs = (minutes * 60 + seconds) * 1000;
  return {
    type: "tick",
    now: SESSION_START.now + elapsedMs,
    realNow: SESSION_START.realNow + elapsedMs,
  };
}

function hold(tally: { tallyId: string; name: string }): Event {
  return { type: "tallyHeld", ...tally };
}

function minutes(value: number, seconds = 0): number {
  return (value * 60 + seconds) * 1000;
}

// Trupp 01 of A1 and A2, logged in for 30 min at 300 bar with the chosen Anmeldeaktion.
function loggedIn(anmeldeaktionDowns: number): State {
  return run(
    createInitialState(SESSION_START),
    hold(A1),
    press("OK"),
    hold(A2),
    ...presses("Down", anmeldeaktionDowns),
    press("OK"),
    press("OK"),
  );
}

function truppInAnmarsch(): State {
  return loggedIn(0);
}

function truppInBereitschaft(): State {
  return loggedIn(1);
}

function sicherheitstrupp(): State {
  return loggedIn(2);
}

// Opens the Trupp-Menü from the Einsatzliste and chooses the item.
function chooseItem(state: State, aktion: TruppMenueAktion): State {
  const menue = run(state, press("OK"), press("OK"));
  const index = truppMenueAktionen(menue).indexOf(aktion);
  expect(index).toBeGreaterThanOrEqual(0);
  return run(menue, ...presses("Down", index), press("OK"));
}

// Chooses the item, then OK in the Flaschendruck editor it opens: "accept" in the scenarios.
function accept(state: State, aktion: TruppMenueAktion): State {
  return reduce(chooseItem(state, aktion), press("OK"));
}

// Chooses the item, sets the editor to the Flaschendruck with Down, then OK: "enter P".
function enter(
  state: State,
  aktion: TruppMenueAktion,
  flaschendruckBar: number,
): State {
  const editor = chooseItem(state, aktion);
  const opened = editor.truppMenue?.draftFlaschendruckBar ?? 0;
  return run(
    editor,
    ...presses("Down", (opened - flaschendruckBar) / 5),
    press("OK"),
  );
}

function einsatzstatusOf(state: State): Einsatzstatus | undefined {
  return state.trupps[0]?.einsatzstatus;
}

function restzeitOf(state: State): number | undefined {
  return state.trupps[0]?.restzeitMs;
}

describe("`Einsatzziel erreicht`", () => {
  // manual 5.4 steps 3–5; decided in "Define the key-by-screen navigation model", its pressure
  // editor table; timing-and-alarm-rules §1.7
  it("opens the Flaschendruck editor at the snapped estimate", () => {
    const editor = chooseItem(
      run(truppInAnmarsch(), tickAt(5, 4)),
      "einsatzzielErreicht",
    );
    expect(editor.screen).toBe("truppFlaschendruckAendern");
    expect(editor.truppMenue?.draftFlaschendruckBar).toBe(245);
  });

  // manual 5.4 steps 6–8; timing-and-alarm-rules §1.4, 5.4; verification scenario V7
  it("sets Einsatzziel erreicht on OK, recomputes the Restzeit and returns to the Einsatzliste", () => {
    const state = accept(
      run(truppInAnmarsch(), tickAt(5)),
      "einsatzzielErreicht",
    );
    expect(state.screen).toBe("einsatzliste");
    expect(state.truppMenue).toBeNull();
    expect(einsatzstatusOf(state)).toBe("einsatzzielErreicht");
    expect(restzeitOf(state)).toBe(minutes(25));
    expect(state.trupps[0]?.anmarschzeitMs).toBe(minutes(5));
  });

  // decided in "Define the key-by-screen navigation model": X leaves the status unchanged
  // verification scenario V9
  it("keeps Anmarsch and the Restzeit on X in the editor", () => {
    const anmarsch = run(truppInAnmarsch(), tickAt(8));
    const state = run(
      chooseItem(anmarsch, "einsatzzielErreicht"),
      press("Down"),
      press("X"),
    );
    expect(state.screen).toBe("truppMenue");
    expect(state.truppMenue?.draftFlaschendruckBar).toBeNull();
    expect(state.trupps).toEqual(anmarsch.trupps);
  });
});

describe("`Rückzug antreten`", () => {
  // manual 5.7 steps 3–8; decided in "Define the key-by-screen navigation model", its pressure
  // editor table; timing-and-alarm-rules §1.4
  it("sets Rückmarsch from Einsatzziel erreicht on OK and shows the Trupp-Ansicht", () => {
    const einsatzziel = accept(
      run(truppInAnmarsch(), tickAt(3)),
      "einsatzzielErreicht",
    );
    const state = accept(
      run(einsatzziel, tickAt(12), press("OK")),
      "rueckzugAntreten",
    );
    expect(state.screen).toBe("truppAnsicht");
    expect(state.truppMenue).toBeNull();
    expect(einsatzstatusOf(state)).toBe("rueckmarsch");
    expect(restzeitOf(state)).toBe(minutes(18));
  });

  // decided in "Define the key-by-screen navigation model": X leaves the status unchanged
  it("keeps Einsatzziel erreicht on X in the editor", () => {
    const einsatzziel = accept(
      run(truppInAnmarsch(), tickAt(3)),
      "einsatzzielErreicht",
    );
    const before = run(einsatzziel, tickAt(12), press("OK"));
    const state = run(
      chooseItem(before, "rueckzugAntreten"),
      press("Down"),
      press("X"),
    );
    expect(state.screen).toBe("truppMenue");
    expect(einsatzstatusOf(state)).toBe("einsatzzielErreicht");
    expect(state.trupps).toEqual(before.trupps);
  });
});

// verification scenario V11, its transition half; timing-and-alarm-rules §5.10, 12.2, 12.5, 12.6
describe("Anmarsch → Rückmarsch", () => {
  it("skips Einsatzziel erreicht and leaves Rückmarsch only via Bereitschaft", () => {
    let state = run(truppInAnmarsch(), tickAt(6));
    expect(truppMenueAktionen(run(state, press("OK"), press("OK")))).toContain(
      "rueckzugAntreten",
    );

    state = accept(state, "rueckzugAntreten");
    expect(einsatzstatusOf(state)).toBe("rueckmarsch");
    expect(restzeitOf(state)).toBe(minutes(24));
    expect(state.trupps[0]?.anmarschzeitMs).toBeNull();

    state = run(state, press("X"), tickAt(6, 30));
    const menue = run(state, press("OK"), press("OK"));
    expect(truppMenueAktionen(menue)).toEqual([
      "truppEinsatz",
      "truppBereitschaft",
      "flaschendruckAendern",
      "attributeEintragen",
    ]);

    const unchanged = reduce(menue, press("OK"));
    expect(unchanged.screen).toBe("einsatzliste");
    expect(unchanged.trupps).toEqual(state.trupps);

    expect(einsatzstatusOf(chooseItem(unchanged, "truppBereitschaft"))).toBe(
      "bereitschaft",
    );
  });
});

// decided in "Define the key-by-screen navigation model", its Trupp-Menü table
describe("the Trupp-Menü of a Trupp at its Einsatzziel", () => {
  it("offers `Rückzug antreten` but not `Einsatzziel erreicht`", () => {
    const einsatzziel = accept(
      run(truppInAnmarsch(), tickAt(3)),
      "einsatzzielErreicht",
    );
    expect(
      truppMenueAktionen(run(einsatzziel, press("OK"), press("OK"))),
    ).toEqual([
      "truppEinsatz",
      "truppBereitschaft",
      "rueckzugAntreten",
      "flaschendruckAendern",
      "attributeEintragen",
    ]);
  });
});

// verification scenario V15; timing-and-alarm-rules §12.5
describe("choosing the current Einsatzstatus", () => {
  it("does nothing and returns to the Einsatzliste", () => {
    let state = run(truppInAnmarsch(), tickAt(3));
    const anmarsch = state.trupps;
    state = chooseItem(state, "truppEinsatz");
    expect(state.screen).toBe("einsatzliste");
    expect(state.truppMenue).toBeNull();
    expect(state.trupps).toEqual(anmarsch);

    // `t_A` measured from login proves the Anmarsch was not restarted at 3:00
    state = accept(run(state, tickAt(5)), "einsatzzielErreicht");
    expect(state.trupps[0]?.anmarschzeitMs).toBe(minutes(5));

    state = chooseItem(run(state, tickAt(6)), "truppBereitschaft");
    expect(einsatzstatusOf(state)).toBe("bereitschaft");

    // unchanged Trupp: the Bereitschaft interval that starts at 6:00 is not restarted (§4.4)
    const bereitschaft = run(state, tickAt(9));
    state = chooseItem(bereitschaft, "truppBereitschaft");
    expect(state.screen).toBe("einsatzliste");
    expect(state.trupps).toEqual(bereitschaft.trupps);
  });
});

// timing-and-alarm-rules §4.1, 12.3
describe.each<{ einsatzstatus: Einsatzstatus; reach: (state: State) => State }>(
  [
    { einsatzstatus: "anmarsch", reach: (state) => state },
    {
      einsatzstatus: "einsatzzielErreicht",
      reach: (state) => accept(state, "einsatzzielErreicht"),
    },
    {
      einsatzstatus: "rueckmarsch",
      reach: (state) => run(accept(state, "rueckzugAntreten"), press("X")),
    },
  ],
)("`Trupp -> Bereitschaft` from $einsatzstatus", ({ einsatzstatus, reach }) => {
  it("sets Bereitschaft, returns to the Einsatzliste and stops the Restzeit", () => {
    const running = reach(run(truppInAnmarsch(), tickAt(4)));
    expect(einsatzstatusOf(running)).toBe(einsatzstatus);
    const state = chooseItem(running, "truppBereitschaft");
    expect(state.screen).toBe("einsatzliste");
    expect(einsatzstatusOf(state)).toBe("bereitschaft");
    expect(restzeitOf(reduce(state, tickAt(8)))).toBe(restzeitOf(state));
  });
});

// verification scenario V13, its transitions; timing-and-alarm-rules §4.1, 4.6, 5.15, 12.4
describe("`Trupp -> Einsatz` from Bereitschaft", () => {
  it("starts a new Anmarsch whose Anmarschzeit is measured from this start", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(4)),
      "einsatzzielErreicht",
      160,
    );
    expect(restzeitOf(state)).toBe(minutes(16));
    expect(state.trupps[0]?.anmarschzeitMs).toBe(minutes(4));

    state = chooseItem(run(state, tickAt(8)), "truppBereitschaft");
    expect(restzeitOf(state)).toBe(minutes(12));

    state = chooseItem(run(state, tickAt(14)), "truppEinsatz");
    expect(state.screen).toBe("einsatzliste");
    expect(einsatzstatusOf(state)).toBe("anmarsch");
    expect(state.trupps[0]?.anmarschzeitMs).toBeNull();
    expect(restzeitOf(state)).toBe(minutes(12));

    // the Alarmgrenze at t_run 9:54 is shifted by the 6 min in Bereitschaft
    state = run(state, tickAt(15, 54), press("OK"));
    state = accept(run(state, tickAt(16)), "einsatzzielErreicht");
    expect(restzeitOf(state)).toBe(minutes(10));
    expect(state.trupps[0]?.anmarschzeitMs).toBe(minutes(2));
  });

  // manual 5.6.3; timing-and-alarm-rules §4.1, 4.6: the earlier status is never restored
  it("leads from a Bereitschaft entered in Rückmarsch to Anmarsch", () => {
    const rueckmarsch = run(
      accept(run(truppInAnmarsch(), tickAt(2)), "rueckzugAntreten"),
      press("X"),
    );
    const bereitschaft = chooseItem(rueckmarsch, "truppBereitschaft");
    const state = chooseItem(run(bereitschaft, tickAt(3)), "truppEinsatz");
    expect(einsatzstatusOf(state)).toBe("anmarsch");
    expect(restzeitOf(reduce(state, tickAt(4)))).toBe(
      (restzeitOf(state) ?? 0) - minutes(1),
    );
  });

  // verification scenario V12, its transition; timing-and-alarm-rules §12.1, 12.4
  it("sends a Trupp logged in to Bereitschaft into Anmarsch", () => {
    const state = chooseItem(
      run(truppInBereitschaft(), tickAt(12)),
      "truppEinsatz",
    );
    expect(einsatzstatusOf(state)).toBe("anmarsch");
    expect(restzeitOf(state)).toBe(minutes(30));
    expect(restzeitOf(reduce(state, tickAt(13)))).toBe(minutes(29));
  });
});

// verification scenario V16; timing-and-alarm-rules §12.8; manual 5.3.1 step 4
describe("a Sicherheitstrupp", () => {
  // The Einsatzliste was just entered, so its SICHER phase is showing.
  function expectSicher(state: State, einsatzstatus: Einsatzstatus): void {
    expect(state.screen).toBe("einsatzliste");
    expect(einsatzstatusOf(state)).toBe(einsatzstatus);
    expect(state.trupps[0]?.sicherheitstrupp).toBe(true);
    expect(isSicherShown(state, selectedTrupp(state))).toBe(true);
  }

  it("keeps its flag and SICHER through every Einsatzstatus", () => {
    let state = sicherheitstrupp();
    expectSicher(state, "bereitschaft");

    state = chooseItem(run(state, tickAt(6)), "truppEinsatz");
    expectSicher(state, "anmarsch");

    state = accept(run(state, tickAt(7)), "einsatzzielErreicht");
    expectSicher(state, "einsatzzielErreicht");

    state = run(accept(state, "rueckzugAntreten"), press("X"));
    expectSicher(state, "rueckmarsch");

    state = chooseItem(run(state, tickAt(8)), "truppBereitschaft");
    expectSicher(state, "bereitschaft");
  });
});

// timing-and-alarm-rules §5.5, 5.6, 5.7
describe("the Rückzugsdruck", () => {
  function rueckzugsdruckOf(state: State): number | null {
    return rueckzugsdruckBar(selectedTrupp(state));
  }

  function estimateOf(state: State): number {
    return estimateFlaschendruckBar(selectedTrupp(state));
  }

  // §5.13: no Anmarschzeit yet
  it("is absent in Anmarsch", () => {
    expect(rueckzugsdruckOf(run(truppInAnmarsch(), tickAt(5)))).toBeNull();
  });

  // verification scenario V7: the estimate meets the Rückzugsdruck at the threshold
  it("is 150 bar after 5 min of Anmarsch, the estimate at R = 15:00", () => {
    let state = accept(
      run(truppInAnmarsch(), tickAt(5)),
      "einsatzzielErreicht",
    );
    expect(rueckzugsdruckOf(state)).toBe(150);
    state = run(state, tickAt(9, 54), press("OK"));
    expect(estimateOf(run(state, tickAt(14, 59)))).toBe(150);
    expect(estimateOf(run(state, tickAt(15)))).toBe(150);
    expect(restzeitOf(run(state, tickAt(15)))).toBe(minutes(15));
  });

  // verification scenario V7, rounding variant: 151.33 bar rounded down
  it("is rounded down to 151 bar after 5:04 of Anmarsch", () => {
    const editor = chooseItem(
      run(truppInAnmarsch(), tickAt(5, 4)),
      "einsatzzielErreicht",
    );
    const state = reduce(editor, press("OK"));
    expect(restzeitOf(state)).toBe(minutes(24, 30));
    expect(rueckzugsdruckOf(state)).toBe(151);
    expect(
      estimateOf(run(state, tickAt(9, 54), press("OK"), tickAt(14, 26))),
    ).toBe(151);
  });

  // verification scenario V6
  it("is 110 bar after 3 min of Anmarsch", () => {
    const state = accept(
      run(truppInAnmarsch(), tickAt(3)),
      "einsatzzielErreicht",
    );
    expect(rueckzugsdruckOf(state)).toBe(110);
  });

  // verification scenario V8: `t_res` scales with the 20-min Einsatzzeit
  it("is 110 bar after 2 min of Anmarsch with a 20-min Einsatzzeit", () => {
    const zwanzig = run(
      createInitialState(SESSION_START),
      hold(A1),
      press("Down"),
      press("OK"),
      press("OK"),
      hold(A2),
      press("OK"),
      press("OK"),
    );
    expect(zwanzig.trupps[0]?.einsatzzeitMs).toBe(minutes(20));
    const state = accept(run(zwanzig, tickAt(2)), "einsatzzielErreicht");
    expect(restzeitOf(state)).toBe(minutes(18));
    expect(rueckzugsdruckOf(state)).toBe(110);
    expect(
      estimateOf(run(state, tickAt(6, 36), press("OK"), tickAt(12, 40))),
    ).toBe(110);
  });

  // verification scenario V13: a new Anmarsch measures `t_A` again (§5.15)
  it("is cleared by Bereitschaft and measured again on the next Anmarsch", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(4)),
      "einsatzzielErreicht",
      160,
    );
    expect(rueckzugsdruckOf(state)).toBe(130);
    state = chooseItem(run(state, tickAt(8)), "truppBereitschaft");
    state = chooseItem(run(state, tickAt(14)), "truppEinsatz");
    expect(rueckzugsdruckOf(state)).toBeNull();
    state = run(state, tickAt(15, 54), press("OK"));
    state = accept(run(state, tickAt(16)), "einsatzzielErreicht");
    expect(rueckzugsdruckOf(state)).toBe(90);
  });

  // verification scenario V11: no `t_A` on the way straight back
  it("is absent after Anmarsch → Rückmarsch", () => {
    const state = accept(run(truppInAnmarsch(), tickAt(6)), "rueckzugAntreten");
    expect(rueckzugsdruckOf(state)).toBeNull();
  });
});
