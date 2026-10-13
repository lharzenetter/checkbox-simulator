import { describe, expect, it } from "vitest";
import {
  createInitialState,
  estimateFlaschendruckBar,
  alarmCycleMs,
  isAlarmLedLit,
  isAlarmSounding,
  reduce,
  selectedTrupp,
} from "./index";
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

/** Trupp 01 of A1 and A2, logged in to Anmarsch for 30 min at 300 bar, on the Einsatzliste. */
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

describe("the Alarmgrenzen", () => {
  // verification-scenarios V1; timing-and-alarm-rules §2.2, 2.6
  it("fire the first Alarmgrenze at 9:54 of a 30-min Einsatzzeit", () => {
    const before = run(truppInAnmarsch(), tickAt(9, 53));
    expect(isAlarmSounding(before)).toBe(false);
    const at = reduce(before, tickAt(9, 54));
    expect(isAlarmSounding(at)).toBe(true);
    expect(at.screen).toBe("alarm");
  });
});

function restzeitOf(state: State): number | undefined {
  return state.trupps[0]?.restzeitMs;
}

function expectNoAlarm(state: State): void {
  expect(isAlarmSounding(state)).toBe(false);
  expect(state.screen).not.toBe("alarm");
}

function expectAlarmFor(state: State, truppnummer: number): void {
  expect(isAlarmSounding(state)).toBe(true);
  expect(state.screen).toBe("alarm");
  expect(state.pendingAlarms).toEqual([truppnummer]);
}

// verification-scenarios V1 up to and including 00:00:00; timing-and-alarm-rules §1.1, 1.2, 1.7,
// 2.1, 2.2, 3.1, 5.13, 8.1
describe("an untouched Trupp running out", () => {
  it("sounds at both Alarmgrenzen and at 00:00:00, never in between", () => {
    let state = truppInAnmarsch();
    expect(restzeitOf(state)).toBe(30 * 60_000);

    state = reduce(state, tickAt(9, 53));
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe((20 * 60 + 7) * 1000);

    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe((20 * 60 + 6) * 1000);
    state = reduce(state, press("OK"));
    expectNoAlarm(state);

    state = reduce(state, tickAt(15));
    expect(restzeitOf(state)).toBe(15 * 60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(150);

    state = reduce(state, tickAt(19, 47));
    expectNoAlarm(state);
    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);
    state = reduce(state, press("OK"));

    // no Rückzugsalarm at any point: Anmarsch has no Anmarschzeit (§5.13)
    state = reduce(state, tickAt(29, 59));
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(1000);

    state = reduce(state, tickAt(30));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(0);

    state = reduce(state, tickAt(31));
    expect(restzeitOf(state)).toBe(-60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(0);
  });

  // timing-and-alarm-rules §2.3: each Alarmgrenze once per Einsatz
  it("does not sound again after OK while the Restzeit runs on", () => {
    const state = run(
      truppInAnmarsch(),
      tickAt(9, 54),
      press("OK"),
      tickAt(10),
      tickAt(15),
    );
    expectNoAlarm(state);
  });

  // decided in "Decide how alarms are presented", point 3: an Alarm sounds until OK
  it("keeps sounding until OK", () => {
    const state = run(truppInAnmarsch(), tickAt(9, 54), tickAt(12));
    expectAlarmFor(state, 1);
  });

  // decided in "Decide how alarms are presented", point 1: S12 is live
  it("keeps the Restzeit running while the Alarm sounds", () => {
    const state = run(truppInAnmarsch(), tickAt(9, 54), tickAt(12));
    expect(restzeitOf(state)).toBe(18 * 60_000);
  });
});

// verification-scenarios V2, its Alarmgrenzen half; timing-and-alarm-rules §1.3, 2.2
describe("a Trupp logged in at 270 bar", () => {
  function truppAt270Bar(): State {
    return run(
      createInitialState(SESSION_START),
      hold(A1),
      press("OK"),
      hold(A2),
      press("OK"),
      ...Array.from({ length: 6 }, () => press("Down")),
      press("OK"),
    );
  }

  it("sounds at the Alarmgrenzen on elapsed time and at 00:00:00 on its Restzeit", () => {
    let state = truppAt270Bar();
    expect(restzeitOf(state)).toBe(27 * 60_000);

    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe((17 * 60 + 6) * 1000);
    state = reduce(state, press("OK"));

    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe((7 * 60 + 12) * 1000);
    state = reduce(state, press("OK"));

    state = reduce(state, tickAt(26, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(27));
    expectAlarmFor(state, 1);
  });
});

// verification-scenarios, derived constants; timing-and-alarm-rules §2.6
describe("a 20-min Trupp", () => {
  function truppFor20Min(): State {
    return run(
      createInitialState(SESSION_START),
      hold(A1),
      press("Down"),
      press("OK"),
      press("OK"),
      hold(A2),
      press("OK"),
      press("OK"),
    );
  }

  it("sounds at 6:36 and 13:12", () => {
    let state = run(truppFor20Min(), tickAt(6, 35));
    expectNoAlarm(state);
    state = reduce(state, tickAt(6, 36));
    expectAlarmFor(state, 1);
    state = run(state, press("OK"), tickAt(13, 11));
    expectNoAlarm(state);
    state = reduce(state, tickAt(13, 12));
    expectAlarmFor(state, 1);
  });
});

// timing-and-alarm-rules §4.1, 4.5, 4.7: Bereitschaft holds the running time and the Restzeit
describe("a Trupp in Bereitschaft", () => {
  it("does not reach its Alarmgrenzen", () => {
    const state = run(
      createInitialState(SESSION_START),
      hold(A1),
      press("OK"),
      hold(A2),
      press("Down"),
      press("OK"),
      press("OK"),
      tickAt(31),
    );
    expectNoAlarm(state);
  });
});

// decided in "Decide how alarms are presented", points 5 and 6
describe("S12 Trupp ALARM", () => {
  it("returns to the Einsatzliste with the Trupp selected after OK", () => {
    const state = run(truppInAnmarsch(), tickAt(9, 54), press("OK"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.selectedTruppnummer).toBe(1);
  });

  it.each<Key>(["Up", "Down", "X", "Check"])("ignores %s", (key) => {
    const alarm = run(truppInAnmarsch(), tickAt(9, 54));
    expect(reduce(alarm, press(key))).toBe(alarm);
  });

  it("ignores a Tally and does not buffer it", () => {
    const alarm = run(truppInAnmarsch(), tickAt(9, 54));
    expect(reduce(alarm, hold(A1))).toBe(alarm);
    expect(run(alarm, hold(A1), press("OK")).screen).toBe("einsatzliste");
  });

  it("takes over from a half-entered pressure and restores it unchanged after OK", () => {
    const editing = run(
      truppInAnmarsch(),
      tickAt(9),
      press("OK"),
      press("OK"),
      ...Array.from({ length: 4 }, () => press("Down")),
      press("OK"),
      press("Down"),
      press("Down"),
    );
    expect(editing.screen).toBe("truppFlaschendruckAendern");
    const draft = editing.truppMenue?.draftFlaschendruckBar;
    expect(draft).toBe(200);

    const alarm = reduce(editing, tickAt(9, 54));
    expect(alarm.screen).toBe("alarm");

    const restored = run(alarm, press("Down"), press("X"), press("OK"));
    expect(restored.screen).toBe("truppFlaschendruckAendern");
    expect(restored.truppMenue).toEqual(editing.truppMenue);
    expect(restored.selectedTruppnummer).toBe(1);
  });

  it("takes over from a login and restores it unchanged after OK", () => {
    const B1 = { tallyId: "b1", name: "HLF WT-F" };
    const B2 = { tallyId: "b2", name: "HLF WT-M" };
    const loggingIn = run(
      truppInAnmarsch(),
      tickAt(9),
      hold(B1),
      press("OK"),
      hold(B2),
      press("Down"),
    );
    const restored = run(loggingIn, tickAt(9, 54), press("OK"));
    expect(restored.screen).toBe("anmeldefenster");
    expect(restored.login).toEqual(loggingIn.login);
  });

  it("does not let the Trupp-Ansicht time out behind it", () => {
    const restored = run(
      truppInAnmarsch(),
      tickAt(9, 50),
      press("OK"),
      tickAt(9, 54),
      tickAt(10, 30),
      press("OK"),
    );
    expect(restored.screen).toBe("truppAnsicht");
  });
});

// decided in "Decide how alarms are presented", points 2 and 8: the LED blinks in step with the
// siren, on real time, so the speed control does not change its rate
describe("the red LED", () => {
  function atRealTime(state: State, realElapsedMs: number): State {
    return reduce(state, {
      type: "tick",
      now: state.now + realElapsedMs * 10,
      realNow: state.realNow + realElapsedMs,
    });
  }

  it("is dark while no Alarm sounds", () => {
    expect(isAlarmLedLit(truppInAnmarsch())).toBe(false);
  });

  it("is lit as the Alarm starts and blinks every 250 ms of real time", () => {
    const alarm = run(truppInAnmarsch(), tickAt(9, 54));
    expect(isAlarmLedLit(alarm)).toBe(true);
    const dark = atRealTime(alarm, 250);
    expect(isAlarmLedLit(dark)).toBe(false);
    expect(isAlarmLedLit(atRealTime(dark, 250))).toBe(true);
  });

  // the siren starts its wail this far into the cycle, so it stays in step with the LED
  it("tells how far the Alarm is into its 500 ms wail cycle", () => {
    const alarm = run(truppInAnmarsch(), tickAt(9, 54));
    expect(alarmCycleMs(alarm)).toBe(0);
    expect(alarmCycleMs(atRealTime(alarm, 300))).toBe(300);
    expect(alarmCycleMs(atRealTime(alarm, 1_120))).toBe(120);
  });

  it("is dark again after OK", () => {
    const state = run(truppInAnmarsch(), tickAt(9, 54), press("OK"));
    expect(isAlarmLedLit(state)).toBe(false);
  });
});

// verification-scenarios V6 up to 30:00; timing-and-alarm-rules §2.3, 3.5, 5.9, 12.2. The overdue
// repeat at 35:00 comes with issue #33 ("Repeat overdue and Bereitschaft Alarms").
describe("V6: Alarms in every Einsatzstatus", () => {
  // Opens the Trupp-Menü, chooses the item and accepts the editor's value with OK.
  function accept(state: State, downs: number): State {
    return run(
      state,
      press("OK"),
      press("OK"),
      ...Array.from({ length: downs }, () => press("Down")),
      press("OK"),
      press("OK"),
    );
  }

  it("sounds at the Alarmgrenzen and at 00:00:00 in Einsatzziel erreicht and in Rückmarsch", () => {
    // Einsatzziel erreicht is the Anmarsch menu's third item
    let state = accept(run(truppInAnmarsch(), tickAt(3)), 2);
    expect(state.trupps[0]?.einsatzstatus).toBe("einsatzzielErreicht");
    expect(restzeitOf(state)).toBe(27 * 60_000);

    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);
    state = reduce(state, press("OK"));

    // Rückzug antreten is the Einsatzziel erreicht menu's third item
    state = accept(run(state, tickAt(12)), 2);
    expect(state.trupps[0]?.einsatzstatus).toBe("rueckmarsch");
    expect(restzeitOf(state)).toBe(18 * 60_000);
    state = reduce(state, press("X"));

    // R = 11:00 = 2·t_A + t_res: Rückmarsch will suppress the Rückzugsalarm here (§5.9); until
    // issue #34 ("Fire the Rückzugsalarm") brings it, this only checks no other Alarm fires
    state = reduce(state, tickAt(19));
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(11 * 60_000);

    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);
    state = reduce(state, press("OK"));

    state = reduce(state, tickAt(30));
    expectAlarmFor(state, 1);
    expect(state.trupps[0]?.einsatzstatus).toBe("rueckmarsch");
  });
});

// verification-scenarios V20; timing-and-alarm-rules §8.2
describe("V20: later Alarms of one Trupp", () => {
  it("merge into its pending Alarm", () => {
    let state = run(truppInAnmarsch(), tickAt(9, 54));
    expectAlarmFor(state, 1);

    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);

    state = reduce(state, press("OK"));
    expectNoAlarm(state);
  });

  // a slow device or a long frame passes both Alarmgrenzen in one tick
  it("merge when one tick passes both Alarmgrenzen", () => {
    const state = run(truppInAnmarsch(), tickAt(9), tickAt(20));
    expectAlarmFor(state, 1);
    expectNoAlarm(reduce(state, press("OK")));
  });
});

// verification-scenarios V21; timing-and-alarm-rules §8.1, 8.2; decided in "Decide how alarms are
// presented", points 4–6
describe("V21: Alarms of several Trupps", () => {
  const B1 = { tallyId: "b1", name: "HLF WT-F" };
  const B2 = { tallyId: "b2", name: "HLF WT-M" };

  // the siren runs while anything is pending, so acknowledging one Trupp must not restart its wail
  it("keep the siren and the LED in rhythm when an OK leaves another Alarm pending", () => {
    const queued = run(
      truppInAnmarsch(),
      tickAt(0, 30),
      hold(B1),
      press("OK"),
      hold(B2),
      press("OK"),
      press("OK"),
      tickAt(9, 54),
      tickAt(10, 24),
    );
    const midCycle = reduce(queued, {
      type: "tick",
      now: queued.now + 100,
      realNow: queued.realNow + 100,
    });
    expect(alarmCycleMs(midCycle)).toBe(100);

    const next = reduce(midCycle, press("OK"));
    expectAlarmFor(next, 2);
    expect(alarmCycleMs(next)).toBe(100);
  });

  it("queue first in, first out, and return to the interrupted screen after the last OK", () => {
    let state = run(
      truppInAnmarsch(),
      tickAt(0, 30),
      hold(B1),
      press("OK"),
      hold(B2),
      press("OK"),
      press("OK"),
    );
    expect(state.trupps.map((trupp) => trupp.truppnummer)).toEqual([1, 2]);

    // Trupp 01 → Druck ändern, the Trupp-Menü's fifth item, opens at 200; Down to 180, no OK
    state = run(
      state,
      tickAt(9, 50),
      press("Up"),
      press("OK"),
      press("OK"),
      ...Array.from({ length: 4 }, () => press("Down")),
      press("OK"),
    );
    expect(state.screen).toBe("truppFlaschendruckAendern");
    expect(state.truppMenue?.draftFlaschendruckBar).toBe(200);
    state = run(state, ...Array.from({ length: 4 }, () => press("Down")));
    const editing = state;
    expect(editing.truppMenue?.draftFlaschendruckBar).toBe(180);

    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);

    state = reduce(state, tickAt(10));
    const alarm = state;
    state = run(state, press("Up"), press("Down"), press("X"), hold(B1));
    expect(state).toBe(alarm);

    state = reduce(state, tickAt(10, 24));
    expect(state.screen).toBe("alarm");
    expect(state.pendingAlarms).toEqual([1, 2]);

    state = run(state, tickAt(10, 30), press("OK"));
    expectAlarmFor(state, 2);

    state = run(state, tickAt(10, 31), press("OK"));
    expectNoAlarm(state);
    expect(state.screen).toBe("truppFlaschendruckAendern");
    expect(state.truppMenue).toEqual(editing.truppMenue);
    expect(state.selectedTruppnummer).toBe(1);
  });
});
