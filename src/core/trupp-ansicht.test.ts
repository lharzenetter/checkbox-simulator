import { describe, expect, it } from "vitest";
import { createInitialState, reduce, truppMenueAktionen } from "./index";
import type { Event, Key, State } from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

const A1 = { tallyId: "a1", name: "HLF AT-F" };
const A2 = { tallyId: "a2", name: "HLF AT-M" };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
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

/** Trupp 01 of A1 and A2 on its Anfangsdruck editor, about to log in to Anmarsch. */
function anfangsdruckEditor(): State {
  return run(
    createInitialState(SESSION_START),
    hold(A1),
    press("OK"),
    hold(A2),
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
    press("X"),
  );
}

/** Trupp 01 of A1 and A2, logged in to Anmarsch, on the Einsatzliste. */
function truppInAnmarsch(): State {
  return run(anfangsdruckEditor(), press("OK"), press("X"));
}

/** The Trupp in Anmarsch reports Einsatzziel erreicht at the estimate; back on the Einsatzliste. */
function truppAtEinsatzziel(state: State): State {
  return run(
    state,
    press("OK"),
    press("Down"),
    press("Down"),
    press("OK"),
    press("OK"),
    press("X"),
  );
}

/** The Trupp at the Einsatzziel turns back at the estimate; back on the Einsatzliste. */
function truppInRueckmarsch(state: State): State {
  return run(
    state,
    press("OK"),
    press("Down"),
    press("Down"),
    press("OK"),
    press("OK"),
    press("X"),
  );
}

describe("the Trupp-Menü", () => {
  function truppMenue(state: State): State {
    return reduce(state, press("OK"));
  }

  // decided in "Correct the simulator against the real Checkbox", navigation
  it("opens for the selected Trupp on OK on the Einsatzliste", () => {
    const state = truppMenue(truppInAnmarsch());
    expect(state.screen).toBe("truppMenue");
    expect(state.selectedTruppnummer).toBe(1);
  });

  // decided in "Correct the simulator against the real Checkbox", navigation: no Rückzug antreten
  // straight from Anmarsch
  it("offers the Anmarsch items", () => {
    expect(truppMenueAktionen(truppMenue(truppInAnmarsch()))).toEqual([
      "truppEinsatz",
      "truppBereitschaft",
      "einsatzzielErreicht",
      "flaschendruckAendern",
      "attributeEintragen",
    ]);
  });

  // decided in "Correct the simulator against the real Checkbox", navigation
  it("offers the Einsatzziel erreicht items", () => {
    expect(
      truppMenueAktionen(truppMenue(truppAtEinsatzziel(truppInAnmarsch()))),
    ).toEqual([
      "truppEinsatz",
      "truppBereitschaft",
      "rueckzugAntreten",
      "flaschendruckAendern",
      "attributeEintragen",
    ]);
  });

  // decided in "Correct the simulator against the real Checkbox", navigation
  it("offers the Rückmarsch items", () => {
    expect(
      truppMenueAktionen(
        truppMenue(truppInRueckmarsch(truppAtEinsatzziel(truppInAnmarsch()))),
      ),
    ).toEqual([
      "truppEinsatz",
      "truppBereitschaft",
      "flaschendruckAendern",
      "attributeEintragen",
    ]);
  });

  // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
  it("offers the Bereitschaft items", () => {
    expect(truppMenueAktionen(truppMenue(truppInBereitschaft()))).toEqual([
      "truppEinsatz",
      "truppBereitschaft",
      "flaschendruckAendern",
      "attributeEintragen",
    ]);
  });

  // decided in "Define the key-by-screen navigation model": the cursor starts on the first item
  it("opens with the cursor on the first item", () => {
    expect(truppMenue(truppInAnmarsch()).truppMenue?.aktion).toBe(
      "truppEinsatz",
    );
  });

  // ASSUMPTION in the reducer: the cursor wraps, as on the Einsatzliste ("Define the key-by-screen
  // navigation model")
  it("moves the cursor with Up and Down, wrapping", () => {
    const menue = truppMenue(truppInAnmarsch());
    expect(run(menue, press("Down"), press("Down")).truppMenue?.aktion).toBe(
      "einsatzzielErreicht",
    );
    expect(run(menue, press("Up")).truppMenue?.aktion).toBe(
      "attributeEintragen",
    );
  });

  // decided in "Correct the simulator against the real Checkbox", navigation
  it("returns to the Einsatzliste on X", () => {
    const state = reduce(truppMenue(truppInAnmarsch()), press("X"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.truppMenue).toBeNull();
  });

  // decided in "Define the key-by-screen navigation model": shown but inert
  it("does nothing on OK on `Attribute eintragen`", () => {
    const attribute = run(truppMenue(truppInAnmarsch()), press("Up"));
    expect(reduce(attribute, press("OK"))).toEqual(attribute);
  });
});

/** From the Einsatzliste to `Esz-Zeit ändern` of a Trupp in Anmarsch. */
const DRUCK_AENDERN: readonly Event[] = [
  press("OK"),
  ...Array.from({ length: 3 }, () => press("Down")),
  press("OK"),
];

function restzeitMs(state: State): number | undefined {
  return state.trupps[0]?.restzeitMs;
}

function realTickAfter(state: State, elapsedMs: number): Event {
  return {
    type: "tick",
    now: state.now,
    realNow: state.realNow + elapsedMs,
  };
}

describe("`Druck ändern` on the Trupp-Menü", () => {
  // verification scenario V3; timing-and-alarm-rules §1.4, 1.7
  it("opens at the estimate snapped down to the 5 bar grid and resets the Restzeit on OK", () => {
    const editor = run(truppInAnmarsch(), tickAt(6, 3), ...DRUCK_AENDERN);
    expect(editor.screen).toBe("truppFlaschendruckAendern");
    expect(editor.truppMenue?.draftFlaschendruckBar).toBe(235);
    const entered = run(
      editor,
      ...Array.from({ length: 5 }, () => press("Down")),
      press("OK"),
    );
    expect(entered.screen).toBe("truppAnsicht");
    expect(entered.truppMenue).toBeNull();
    expect(restzeitMs(entered)).toBe(21 * 60_000);
    expect(restzeitMs(run(entered, tickAt(9, 54)))).toBe((17 * 60 + 9) * 1000);
  });

  // verification scenario V4; timing-and-alarm-rules §1.4, 1.5, 1.8
  it("raises the Flaschendruck in 5 bar steps up to 330 bar", () => {
    // two OKs end the first Alarmgrenze's Alarm at 9:54
    const opened = run(
      truppInAnmarsch(),
      tickAt(10),
      press("OK"),
      press("OK"),
      ...DRUCK_AENDERN,
    );
    expect(opened.truppMenue?.draftFlaschendruckBar).toBe(200);

    const raised = run(opened, press("Up"), press("OK"));
    expect(restzeitMs(raised)).toBe((20 * 60 + 30) * 1000);

    // the Trupp-Ansicht shown at 10:00 has closed by 11:00
    const kept = run(raised, tickAt(11), ...DRUCK_AENDERN, press("X"));
    expect(kept.screen).toBe("truppMenue");
    expect(kept.truppMenue).toEqual({
      aktion: "flaschendruckAendern",
      draftFlaschendruckBar: null,
    });
    expect(restzeitMs(kept)).toBe((19 * 60 + 30) * 1000);

    // the Trupp-Menü left open at 11:00 has timed out by 12:00
    const ceiling = run(
      kept,
      tickAt(12),
      ...DRUCK_AENDERN,
      ...Array.from({ length: 40 }, () => press("Up")),
    );
    expect(ceiling.truppMenue?.draftFlaschendruckBar).toBe(330);
    expect(restzeitMs(reduce(ceiling, press("OK")))).toBe(33 * 60_000);
  });

  // verification scenario V5
  it("lowers the Flaschendruck to 0 bar and no further", () => {
    const editor = run(
      truppInAnmarsch(),
      ...DRUCK_AENDERN,
      ...Array.from({ length: 70 }, () => press("Down")),
    );
    expect(editor.truppMenue?.draftFlaschendruckBar).toBe(0);
    expect(restzeitMs(reduce(editor, press("OK")))).toBe(0);
  });

  // timing-and-alarm-rules §1.7: the estimate is clamped at 0
  it("opens at 0 bar once the Restzeit is negative", () => {
    // two OKs each end the three Alarms that fired on the way
    const editor = run(
      truppInAnmarsch(),
      tickAt(31),
      ...Array.from({ length: 6 }, () => press("OK")),
      ...DRUCK_AENDERN,
    );
    expect(editor.truppMenue?.draftFlaschendruckBar).toBe(0);
  });

  // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
  it("is offered to a Trupp in Bereitschaft", () => {
    const editor = run(
      truppInBereitschaft(),
      press("OK"),
      press("Down"),
      press("Down"),
      press("OK"),
    );
    expect(editor.screen).toBe("truppFlaschendruckAendern");
    expect(editor.truppMenue?.draftFlaschendruckBar).toBe(300);
  });

  // decided in "Define the key-by-screen navigation model": a Tally is ignored in pressure editors
  it("ignores a Tally and Check", () => {
    const editor = run(truppInAnmarsch(), ...DRUCK_AENDERN);
    expect(reduce(editor, hold({ tallyId: "c1", name: "X" }))).toBe(editor);
    expect(reduce(editor, press("Check"))).toBe(editor);
  });
});

// decided in "Correct the simulator against the real Checkbox", navigation
describe("the Trupp-Ansicht", () => {
  // X on an editor keeps the old Flaschendruck and returns to the Trupp-Menü, so no Trupp-Ansicht
  it("is not shown when an editor is left with X", () => {
    const state = run(truppInAnmarsch(), ...DRUCK_AENDERN, press("X"));
    expect(state.screen).toBe("truppMenue");
  });

  it.each([
    {
      entry: "Druck ändern",
      from: truppInAnmarsch,
      keys: DRUCK_AENDERN,
    },
    {
      entry: "Einsatzziel erreicht",
      from: truppInAnmarsch,
      keys: [press("OK"), press("Down"), press("Down"), press("OK")],
    },
    {
      entry: "Rückzug antreten",
      from: () => truppAtEinsatzziel(truppInAnmarsch()),
      keys: [press("OK"), press("Down"), press("Down"), press("OK")],
    },
    // ASSUMPTION in the reducer: after the login entry too
    { entry: "the login", from: anfangsdruckEditor, keys: [] },
  ])("is shown for the Trupp after OK on $entry", ({ from, keys }) => {
    const state = run(from(), ...keys, press("OK"));
    expect(state.screen).toBe("truppAnsicht");
    expect(state.selectedTruppnummer).toBe(1);
    expect(state.truppMenue).toBeNull();
  });

  function ansicht(): State {
    return run(truppInAnmarsch(), ...DRUCK_AENDERN, press("OK"));
  }

  // timing-and-alarm-rules §9.1: 5 s of real time
  it("returns to the Einsatzliste after 5 s", () => {
    const state = ansicht();
    expect(reduce(state, realTickAfter(state, 4_999)).screen).toBe(
      "truppAnsicht",
    );
    expect(reduce(state, realTickAfter(state, 5_000)).screen).toBe(
      "einsatzliste",
    );
  });

  // timing-and-alarm-rules §9.1
  it("runs on real time, not on the sped-up simulated time", () => {
    const state = ansicht();
    const tick: Event = {
      type: "tick",
      now: state.now + 40_000,
      realNow: state.realNow + 4_000,
    };
    expect(reduce(state, tick).screen).toBe("truppAnsicht");
  });

  it.each<Key>(["Up", "Down", "OK", "X", "Check"])(
    "returns to the Einsatzliste on %s, changing nothing else",
    (key) => {
      const state = ansicht();
      const closed = reduce(state, press(key));
      expect(closed.screen).toBe("einsatzliste");
      expect(closed.trupps).toBe(state.trupps);
      expect(closed.selectedTruppnummer).toBe(1);
    },
  );
});

// timing-and-alarm-rules §9 [13], 9.1: 15 s idle, on real time
describe("the [13] timeout", () => {
  function menue(): State {
    return reduce(truppInAnmarsch(), press("OK"));
  }

  it("returns from the Trupp-Menü to the Einsatzliste after 15 s idle", () => {
    const state = menue();
    expect(reduce(state, realTickAfter(state, 14_999)).screen).toBe(
      "truppMenue",
    );
    const timedOut = reduce(state, realTickAfter(state, 15_000));
    expect(timedOut.screen).toBe("einsatzliste");
    expect(timedOut.truppMenue).toBeNull();
  });

  it("runs on real time, not on the sped-up simulated time", () => {
    const state = menue();
    const tick: Event = {
      type: "tick",
      now: state.now + 60_000,
      realNow: state.realNow + 6_000,
    };
    expect(reduce(state, tick).screen).toBe("truppMenue");
  });

  it("restarts on every key press", () => {
    const state = menue();
    const later = run(state, realTickAfter(state, 10_000), press("Down"));
    expect(reduce(later, realTickAfter(later, 14_999)).screen).toBe(
      "truppMenue",
    );
    expect(reduce(later, realTickAfter(later, 15_000)).screen).toBe(
      "einsatzliste",
    );
  });

  it("restarts on a key press that does nothing", () => {
    const state = menue();
    const later = run(state, realTickAfter(state, 10_000), press("Check"));
    expect(reduce(later, realTickAfter(later, 14_999)).screen).toBe(
      "truppMenue",
    );
  });
});

// decided in "Define the key-by-screen navigation model", its "Tally on Check" table
describe.each([
  { screen: "Trupp-Ansicht", keys: [...DRUCK_AENDERN, press("OK")] },
  { screen: "Trupp-Menü", keys: [press("OK")] },
])("a Tally on Check on the $screen", ({ keys }) => {
  function opened(): State {
    return run(truppInAnmarsch(), ...keys);
  }

  it("starts a login for an Atemschutzträger in no Trupp", () => {
    const state = reduce(opened(), hold({ tallyId: "b1", name: "LF AT-F" }));
    expect(state.screen).toBe("einsatzzeitWaehlen");
    expect(state.truppMenue).toBeNull();
  });

  it("opens ABMELDEN for a member of a running Trupp", () => {
    const state = reduce(opened(), hold(A2));
    expect(state.screen).toBe("abmelden");
    expect(state.truppMenue).toBeNull();
  });
});
