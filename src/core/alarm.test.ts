import { describe, expect, it } from "vitest";
import {
  createInitialState,
  estimateFlaschendruckBar,
  alarmCycleMs,
  isAlarmActive,
  isAlarmLedLit,
  isAlarmSounding,
  reduce,
  rueckzugsdruckBar,
  selectedTrupp,
  truppMenueAktionen,
} from "./index";
import type { Event, Key, State, TruppMenueAktion } from "./index";

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

/**
 * Trupp 01 of A1 and A2, logged in to Anmarsch for 30 min at 300 bar, on the Einsatzliste once X
 * closes its Trupp-Ansicht.
 */
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

function presses(key: Key, count: number): readonly Event[] {
  return Array.from({ length: count }, () => press(key));
}

// The two OKs that silence, then end, the Alarm S12 shows: timing-and-alarm-rules §8.4.
function endAlarm(): readonly Event[] {
  return presses("OK", 2);
}

// Opens the Trupp-Menü from the Einsatzliste and chooses the item.
function chooseItem(state: State, aktion: TruppMenueAktion): State {
  const menue = reduce(state, press("OK"));
  const index = truppMenueAktionen(menue).indexOf(aktion);
  expect(index).toBeGreaterThanOrEqual(0);
  return run(menue, ...presses("Down", index), press("OK"));
}

// Chooses the item, moves the Flaschendruck editor to the value in [76] = [73] = 5 bar steps,
// then OK: "enter P" in the scenarios.
function enter(
  state: State,
  aktion: TruppMenueAktion,
  flaschendruckBar: number,
): State {
  const editor = chooseItem(state, aktion);
  const opened = editor.truppMenue?.draftFlaschendruckBar ?? 0;
  const steps = (flaschendruckBar - opened) / 5;
  return run(
    editor,
    ...presses(steps > 0 ? "Up" : "Down", Math.abs(steps)),
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
  expect(state.pendingAlarms[0]?.truppnummer).toBe(truppnummer);
}

// verification-scenarios V1 up to and including 00:00:00; timing-and-alarm-rules §1.1, 1.2, 1.7,
// 2.1, 2.2, 3.1, 5.5, 5.13, 8.1
describe("an untouched Trupp running out", () => {
  it("sounds at both Alarmgrenzen, the Rückzugsalarm at 50 bar and at 00:00:00, never in between", () => {
    let state = truppInAnmarsch();
    expect(restzeitOf(state)).toBe(30 * 60_000);

    state = reduce(state, tickAt(9, 53));
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe((20 * 60 + 7) * 1000);

    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe((20 * 60 + 6) * 1000);
    state = run(state, ...endAlarm());
    expectNoAlarm(state);

    state = reduce(state, tickAt(15));
    expect(restzeitOf(state)).toBe(15 * 60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(150);

    state = reduce(state, tickAt(19, 47));
    expectNoAlarm(state);
    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());

    // armed from login at the 50 bar Reservedruck (§5.13)
    state = reduce(state, tickAt(24, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(25));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(restzeitOf(state)).toBe(5 * 60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(50);
    state = run(state, ...endAlarm());

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
      ...endAlarm(),
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

// verification-scenarios V1 after 00:00:00; timing-and-alarm-rules §3.2, 3.3
describe("an overdue Trupp", () => {
  it("sounds every 5 min of Restzeit past 00:00:00, not 5 min after a late OK", () => {
    let state = run(
      truppInAnmarsch(),
      tickAt(9, 54),
      ...endAlarm(),
      tickAt(19, 48),
      ...endAlarm(),
      tickAt(25),
      ...endAlarm(),
      tickAt(30),
      tickAt(33),
      ...endAlarm(),
    );
    expectNoAlarm(state);

    state = reduce(state, tickAt(34, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(35));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-5 * 60_000);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(39, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(40));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-10 * 60_000);
  });

  // timing-and-alarm-rules §3.3: missed steps are not replayed
  it("sounds once for a tick that passes several steps", () => {
    const state = run(
      truppInAnmarsch(),
      tickAt(30),
      // both Alarmgrenzen, the Rückzugsalarm and Einsatzzeit erreicht, two OKs each
      ...presses("OK", 8),
      tickAt(41),
      ...endAlarm(),
      tickAt(44, 59),
    );
    expectNoAlarm(state);
    expectAlarmFor(reduce(state, tickAt(45)), 1);
  });
});

// verification-scenarios V5; timing-and-alarm-rules §3.3, 3.4, 5.14, 8.2
describe("a pressure entry of 0 bar", () => {
  it("sounds the Rückzugsalarm and Einsatzzeit erreicht on OK and the overdue repeats from there", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(8)),
      "flaschendruckAendern",
      0,
    );
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "rueckzugsalarm" },
      { truppnummer: 1, cause: "einsatzzeit" },
    ]);
    expect(restzeitOf(state)).toBe(0);
    // S12 took over from the Trupp-Ansicht the entry opened
    state = run(state, ...endAlarm(), ...endAlarm());
    expect(state.screen).toBe("truppAnsicht");

    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(12, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(13));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-5 * 60_000);
  });
});

// verification-scenarios V24; timing-and-alarm-rules §1.7, 3.6, 5.9
describe("a pressure entry on an overdue Trupp", () => {
  it("re-arms Einsatzzeit erreicht and the overdue repeats", () => {
    let state = run(
      truppInAnmarsch(),
      tickAt(9, 54),
      ...endAlarm(),
      tickAt(19, 48),
      ...endAlarm(),
      tickAt(25),
      ...endAlarm(),
      tickAt(30),
      ...endAlarm(),
      tickAt(35),
    );
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm(), tickAt(37));

    const editor = chooseItem(state, "flaschendruckAendern");
    expect(editor.truppMenue?.draftFlaschendruckBar).toBe(0);
    // 30 bar does not lift the estimate above the 50 bar Rückzugsdruck, so no Rückzugsalarm
    state = enter(state, "flaschendruckAendern", 30);
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(3 * 60_000);

    state = reduce(state, tickAt(39, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(40));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(0);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(44, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(45));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-5 * 60_000);
  });
});

// timing-and-alarm-rules §3.6 (ASSUMPTION in alarm.ts: exactly 00:00:00 counts as reached)
describe("accepting 0 bar on an overdue Trupp", () => {
  it("sounds nothing on OK and the next Alarm at −0:05:00", () => {
    let state = run(
      truppInAnmarsch(),
      tickAt(30),
      // both Alarmgrenzen, the Rückzugsalarm and Einsatzzeit erreicht, two OKs each
      ...presses("OK", 8),
      tickAt(35),
      ...endAlarm(),
      tickAt(37),
    );
    state = enter(state, "flaschendruckAendern", 0);
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(0);
    state = reduce(state, tickAt(41, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(42));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-5 * 60_000);
  });
});

// verification-scenarios V2, its Alarmgrenzen half; timing-and-alarm-rules §1.3, 2.2, 5.13
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

  it("sounds at the Alarmgrenzen on elapsed time, and the Rückzugsalarm and 00:00:00 on its Restzeit", () => {
    let state = truppAt270Bar();
    expect(restzeitOf(state)).toBe(27 * 60_000);

    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe((17 * 60 + 6) * 1000);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe((7 * 60 + 12) * 1000);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(21, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(22));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(restzeitOf(state)).toBe(5 * 60_000);
    state = run(state, ...endAlarm());

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
    state = run(state, ...endAlarm(), tickAt(13, 11));
    expectNoAlarm(state);
    state = reduce(state, tickAt(13, 12));
    expectAlarmFor(state, 1);
  });
});

// verification-scenarios V28; timing-and-alarm-rules §2.2, 2.6, 9 ([17], [65], [66])
describe("a 180-min Trupp", () => {
  function truppFor180Min(): State {
    return run(
      createInitialState(SESSION_START),
      hold(A1),
      press("Up"),
      press("OK"),
      press("OK"),
      hold(A2),
      press("OK"),
      press("OK"),
    );
  }

  it("sounds `ALARM 1` at 59:24 and `ALARM 2` at 118:48", () => {
    let state = run(truppFor180Min(), tickAt(59, 23));
    expectNoAlarm(state);
    state = reduce(state, tickAt(59, 24));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("alarmgrenze1");
    state = run(state, ...endAlarm(), tickAt(118, 47));
    expectNoAlarm(state);
    state = reduce(state, tickAt(118, 48));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("alarmgrenze2");
  });

  // timing-and-alarm-rules §5.5, 5.13: the 50 bar Reservedruck is worth 30:00 of 180 min
  it("sounds `RÜCKZUG` at 150:00, at 50 bar", () => {
    let state = run(
      truppFor180Min(),
      tickAt(59, 24),
      ...endAlarm(),
      tickAt(118, 48),
      ...endAlarm(),
      tickAt(149, 59),
    );
    expectNoAlarm(state);
    state = reduce(state, tickAt(150));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(restzeitOf(state)).toBe(30 * 60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(50);
  });
});

// verification-scenarios V12; timing-and-alarm-rules §4.1, 4.3, 4.4, 4.5, 4.6, 12.1, 12.4
describe("a Trupp logged in to Bereitschaft", () => {
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

  it("sounds every 5 min since its entry, not since a late OK, and never at its Alarmgrenzen", () => {
    let state = run(truppInBereitschaft(), tickAt(4, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(5));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(30 * 60_000);

    state = run(state, tickAt(7), ...endAlarm());
    state = reduce(state, tickAt(9, 54));
    expectNoAlarm(state);
    state = reduce(state, tickAt(9, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(10));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());

    state = chooseItem(run(state, tickAt(12)), "truppEinsatz");
    expect(state.trupps[0]?.einsatzstatus).toBe("anmarsch");
    expect(restzeitOf(state)).toBe(30 * 60_000);

    state = reduce(state, tickAt(15));
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(27 * 60_000);

    state = reduce(state, tickAt(21, 53));
    expectNoAlarm(state);
    state = reduce(state, tickAt(21, 54));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe((20 * 60 + 6) * 1000);
  });

  // timing-and-alarm-rules §4.7: only the Bereitschaft Alarm sounds, so §3.4 fires nothing here
  // (ASSUMPTION in alarm.ts: the passed point is dropped, not held)
  it("sounds no Einsatzzeit erreicht for a pressure entry of 0 bar", () => {
    let state = enter(
      run(truppInBereitschaft(), tickAt(2)),
      "flaschendruckAendern",
      0,
    );
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(0);
    state = reduce(state, tickAt(5));
    expectAlarmFor(state, 1);
  });

  // timing-and-alarm-rules §4.7, 5.9: the Rückzugsalarm pauses in Bereitschaft
  // (ASSUMPTION in alarm.ts: it stays armed and fires once the Trupp leaves Bereitschaft)
  it("sounds no Rückzugsalarm for an entry at the Rückzugsdruck until it leaves Bereitschaft", () => {
    let state = enter(
      run(truppInBereitschaft(), tickAt(2)),
      "flaschendruckAendern",
      50,
    );
    expectNoAlarm(state);
    state = run(state, tickAt(4, 59));
    expectNoAlarm(state);

    state = chooseItem(state, "truppEinsatz");
    expectNoAlarm(state);
    state = reduce(state, tickAt(5));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
  });
});

// verification-scenarios V13; timing-and-alarm-rules §4.1, 4.4, 4.5, 4.7, 5.7, 5.9
describe("a Trupp sent to Bereitschaft mid-Einsatz", () => {
  it("pauses its Alarms there, shifts them by the time it spent in Bereitschaft and keeps its Rückzugsdruck", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(4)),
      "einsatzzielErreicht",
      260,
    );
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(26 * 60_000);
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(80);

    state = chooseItem(run(state, press("X"), tickAt(8)), "truppBereitschaft");
    expect(restzeitOf(state)).toBe(22 * 60_000);
    state = reduce(state, tickAt(12, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(13));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(22 * 60_000);
    state = run(state, ...endAlarm());

    state = chooseItem(run(state, tickAt(14)), "truppEinsatz");
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(80);
    state = reduce(state, tickAt(15, 53));
    expectNoAlarm(state);
    state = reduce(state, tickAt(15, 54));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(25, 47));
    expectNoAlarm(state);
    state = reduce(state, tickAt(25, 48));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(27, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(28));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(restzeitOf(state)).toBe(8 * 60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(80);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(35, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(36));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(0);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(40, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(41));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-5 * 60_000);
  });
});

// verification-scenarios V14; timing-and-alarm-rules §3.3, 3.5, 4.4, 4.7
describe("an overdue 20-min Trupp in Bereitschaft", () => {
  it("pauses the overdue repeats and restarts the Bereitschaft interval on each entry", () => {
    let state = run(
      createInitialState(SESSION_START),
      hold(A1),
      press("Down"),
      press("OK"),
      press("OK"),
      hold(A2),
      press("OK"),
      press("OK"),
      tickAt(6, 36),
      ...endAlarm(),
      tickAt(13, 12),
      ...endAlarm(),
      tickAt(16, 40),
      ...endAlarm(),
      tickAt(20),
    );
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm(), tickAt(22));

    state = chooseItem(state, "truppBereitschaft");
    expect(restzeitOf(state)).toBe(-2 * 60_000);

    state = reduce(state, tickAt(25));
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(-2 * 60_000);
    state = reduce(state, tickAt(26, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(27));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());

    state = chooseItem(run(state, tickAt(28)), "truppEinsatz");
    expect(state.trupps[0]?.einsatzstatus).toBe("anmarsch");
    state = reduce(state, tickAt(30, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(31));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-5 * 60_000);
    state = run(state, ...endAlarm());

    state = chooseItem(run(state, tickAt(32)), "truppBereitschaft");
    expect(restzeitOf(state)).toBe(-6 * 60_000);
    state = reduce(state, tickAt(36, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(37));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());

    state = chooseItem(run(state, tickAt(38)), "truppEinsatz");
    state = reduce(state, tickAt(41, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(42));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-10 * 60_000);
  });
});

// decided in "Decide how alarms are presented", points 5 and 6
describe("S12 Trupp ALARM", () => {
  it("returns to the Einsatzliste with the Trupp selected after its second OK", () => {
    const state = run(truppInAnmarsch(), tickAt(9, 54), ...endAlarm());
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
    expect(run(alarm, hold(A1), ...endAlarm()).screen).toBe("einsatzliste");
  });

  it("takes over from a half-entered pressure and restores it unchanged after the second OK", () => {
    const editing = run(
      truppInAnmarsch(),
      tickAt(9),
      press("OK"),
      ...Array.from({ length: 3 }, () => press("Down")),
      press("OK"),
      press("Down"),
      press("Down"),
    );
    expect(editing.screen).toBe("truppFlaschendruckAendern");
    const draft = editing.truppMenue?.draftFlaschendruckBar;
    expect(draft).toBe(200);

    const alarm = reduce(editing, tickAt(9, 54));
    expect(alarm.screen).toBe("alarm");

    const restored = run(alarm, press("Down"), press("X"), ...endAlarm());
    expect(restored.screen).toBe("truppFlaschendruckAendern");
    expect(restored.truppMenue).toEqual(editing.truppMenue);
    expect(restored.selectedTruppnummer).toBe(1);
  });

  it("takes over from a login and restores it unchanged after the second OK", () => {
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
    const restored = run(loggingIn, tickAt(9, 54), ...endAlarm());
    expect(restored.screen).toBe("anmeldefenster");
    expect(restored.login).toEqual(loggingIn.login);
  });

  it("does not let the Trupp-Ansicht time out behind it", () => {
    const restored = run(
      enter(run(truppInAnmarsch(), tickAt(9, 50)), "flaschendruckAendern", 200),
      tickAt(9, 54),
      tickAt(10, 30),
      ...endAlarm(),
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
    const state = run(truppInAnmarsch(), tickAt(9, 54), ...endAlarm());
    expect(isAlarmLedLit(state)).toBe(false);
  });
});

// verification-scenarios V6; timing-and-alarm-rules §2.3, 3.5, 5.9, 12.2
describe("V6: Alarms in every Einsatzstatus", () => {
  // Opens the Trupp-Menü, chooses the item and accepts the editor's value with OK.
  function accept(state: State, downs: number): State {
    return run(
      state,
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
    state = run(state, ...endAlarm());

    // Rückzug antreten is the Einsatzziel erreicht menu's third item
    state = accept(run(state, tickAt(12)), 2);
    expect(state.trupps[0]?.einsatzstatus).toBe("rueckmarsch");
    expect(restzeitOf(state)).toBe(18 * 60_000);
    state = reduce(state, press("X"));

    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());

    // the estimate meets the 60 bar Rückzugsdruck, and then the Reservedruck, in Rückmarsch
    // (ASSUMPTION in alarm.ts: Rückmarsch suppresses the Rückzugsalarm)
    state = reduce(state, tickAt(24));
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(6 * 60_000);
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(60);
    state = reduce(state, tickAt(25));
    expectNoAlarm(state);

    state = reduce(state, tickAt(30));
    expectAlarmFor(state, 1);
    expect(state.trupps[0]?.einsatzstatus).toBe("rueckmarsch");
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(35));
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe(-5 * 60_000);
  });
});

// verification-scenarios V20; timing-and-alarm-rules §8.2, 8.4, 8.5
describe("V20: later Alarms of one Trupp", () => {
  it("queue behind its pending Alarm, each ended by its own two OKs", () => {
    let state = run(truppInAnmarsch(), tickAt(9, 54));
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "alarmgrenze1" },
    ]);

    state = reduce(state, tickAt(19, 48));
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "alarmgrenze1" },
      { truppnummer: 1, cause: "alarmgrenze2" },
    ]);

    state = run(state, tickAt(19, 49), ...endAlarm());
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "alarmgrenze2" },
    ]);

    state = run(state, tickAt(19, 50), ...endAlarm());
    expectNoAlarm(state);
  });

  // a slow device or a long frame passes both Alarmgrenzen in one tick
  it("queue in firing order when one tick passes both Alarmgrenzen, and need four OKs", () => {
    const state = run(truppInAnmarsch(), tickAt(9), tickAt(20));
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "alarmgrenze1" },
      { truppnummer: 1, cause: "alarmgrenze2" },
    ]);
    expect(run(state, ...presses("OK", 3)).screen).toBe("alarm");
    expectNoAlarm(run(state, ...presses("OK", 4)));
  });
});

// timing-and-alarm-rules §8.2: one tick, several Trupps
describe("Alarms fired in one tick", () => {
  const B1 = { tallyId: "b1", name: "HLF WT-F" };
  const B2 = { tallyId: "b2", name: "HLF WT-M" };

  it("queue in the order their thresholds were reached, across Trupps", () => {
    const state = run(
      truppInAnmarsch(),
      tickAt(0, 30),
      hold(B1),
      press("OK"),
      hold(B2),
      press("OK"),
      press("OK"),
      tickAt(9),
      tickAt(20),
    );
    // Trupp 01 at 9:54 and 19:48, Trupp 02 at 10:24; its 20:18 lies past the tick
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "alarmgrenze1" },
      { truppnummer: 2, cause: "alarmgrenze1" },
      { truppnummer: 1, cause: "alarmgrenze2" },
    ]);
  });

  it("queue the Rückzugsalarm before Einsatzzeit erreicht when one entry fires both", () => {
    const state = enter(
      run(truppInAnmarsch(), tickAt(5)),
      "einsatzzielErreicht",
      0,
    );
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "rueckzugsalarm" },
      { truppnummer: 1, cause: "einsatzzeit" },
    ]);
  });
});

// verification-scenarios V27; timing-and-alarm-rules §8.1, 8.4
describe("V27: the two OKs of an Alarm", () => {
  const B1 = { tallyId: "b1", name: "HLF WT-F" };

  it("silence the signal with the first OK and end the Alarm with the second", () => {
    let state = run(truppInAnmarsch(), tickAt(9, 54));
    expectAlarmFor(state, 1);
    expect(isAlarmLedLit(state)).toBe(true);

    state = run(state, tickAt(10), press("OK"));
    expect(isAlarmSounding(state)).toBe(false);
    expect(isAlarmLedLit(state)).toBe(false);
    expect(state.screen).toBe("alarm");
    expect(restzeitOf(state)).toBe(20 * 60_000);

    state = reduce(state, tickAt(10, 5));
    expect(restzeitOf(state)).toBe((19 * 60 + 55) * 1000);
    const silenced = state;
    state = run(state, press("Up"), press("Down"), press("X"), hold(B1));
    expect(state).toBe(silenced);

    state = run(state, tickAt(10, 10), press("OK"));
    expectNoAlarm(state);
    expect(state.screen).toBe("einsatzliste");
    expect(state.selectedTruppnummer).toBe(1);
  });

  // decided in "Correct the simulator against the real Checkbox": the speed stays locked at 1×
  // until the second OK, so the Alarm stays active while silenced
  it("keep the Alarm active until the second OK", () => {
    const alarm = run(truppInAnmarsch(), tickAt(9, 54));
    expect(isAlarmActive(truppInAnmarsch())).toBe(false);
    expect(isAlarmActive(alarm)).toBe(true);
    expect(isAlarmActive(run(alarm, press("OK")))).toBe(true);
    expect(isAlarmActive(run(alarm, ...endAlarm()))).toBe(false);
  });
});

// verification-scenarios V21; timing-and-alarm-rules §8.1, 8.2; decided in "Decide how alarms are
// presented", points 4–6
describe("V21: Alarms of several Trupps", () => {
  const B1 = { tallyId: "b1", name: "HLF WT-F" };
  const B2 = { tallyId: "b2", name: "HLF WT-M" };

  // the first OK stopped the signal, so the next Alarm's wail starts afresh
  it("start the next Alarm's siren and LED cycle when the second OK shows it", () => {
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

    const next = run(midCycle, press("OK"), press("OK"));
    expectAlarmFor(next, 2);
    expect(alarmCycleMs(next)).toBe(0);
    expect(isAlarmLedLit(next)).toBe(true);
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

    // Trupp 01 → Druck ändern, the Trupp-Menü's fourth item, opens at 200; Down to 180, no OK
    state = run(
      state,
      tickAt(9, 50),
      press("Up"),
      press("OK"),
      ...Array.from({ length: 3 }, () => press("Down")),
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
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "alarmgrenze1" },
      { truppnummer: 2, cause: "alarmgrenze1" },
    ]);

    state = run(state, tickAt(10, 30), ...endAlarm());
    expectAlarmFor(state, 2);

    state = run(state, tickAt(10, 31), ...endAlarm());
    expectNoAlarm(state);
    expect(state.screen).toBe("truppFlaschendruckAendern");
    expect(state.truppMenue).toEqual(editing.truppMenue);
    expect(state.selectedTruppnummer).toBe(1);
  });
});

// verification-scenarios V7; timing-and-alarm-rules §5.3, 5.5, 5.7, 5.11
describe("V7: the Rückzugsalarm on the normal path", () => {
  it("fires once when the estimate falls to the Rückzugsdruck of 300 → 240 bar, 120 bar", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(6)),
      "einsatzzielErreicht",
      240,
    );
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(24 * 60_000);
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(120);

    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm());
    state = reduce(state, tickAt(17, 59));
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe((12 * 60 + 1) * 1000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(120);

    state = reduce(state, tickAt(18));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(restzeitOf(state)).toBe(12 * 60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(120);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(18, 1));
    expectNoAlarm(state);
    state = reduce(state, tickAt(19, 47));
    expectNoAlarm(state);
    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm(), tickAt(29, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(30));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("einsatzzeit");
  });

  // timing-and-alarm-rules §8.2: later Alarms queue behind a pending one
  it("queues behind a still pending Alarm and does not fire again after its OKs", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(6)),
      "einsatzzielErreicht",
      240,
    );
    state = run(state, tickAt(9, 54), tickAt(18));
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "alarmgrenze1" },
      { truppnummer: 1, cause: "rueckzugsalarm" },
    ]);
    state = run(state, ...endAlarm(), ...endAlarm());
    expectNoAlarm(state);
    state = reduce(state, tickAt(19, 47));
    expectNoAlarm(state);
  });
});

// verification-scenarios V25; timing-and-alarm-rules §5.7
describe("V25: the Rückzugsdruck", () => {
  it("is the 50 bar Reservedruck from login until Einsatzziel erreicht", () => {
    expect(rueckzugsdruckBar(selectedTrupp(truppInAnmarsch()))).toBe(50);
  });

  it("never falls below the Reservedruck: 300 → 280 bar gives 50 bar, not 40", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(2)),
      "einsatzzielErreicht",
      280,
    );
    expect(restzeitOf(state)).toBe(28 * 60_000);
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(50);

    state = run(
      state,
      tickAt(9, 54),
      ...endAlarm(),
      tickAt(19, 48),
      ...endAlarm(),
      tickAt(24, 59),
    );
    expectNoAlarm(state);
    state = reduce(state, tickAt(25));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(restzeitOf(state)).toBe(5 * 60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(50);
    state = run(state, ...endAlarm(), tickAt(30));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("einsatzzeit");
  });

  it.each([
    [275, 50],
    [270, 60],
  ])(
    "is %i bar at Einsatzziel erreicht → %i bar",
    (flaschendruckBar, expected) => {
      const state = enter(
        run(truppInAnmarsch(), tickAt(2)),
        "einsatzzielErreicht",
        flaschendruckBar,
      );
      expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(expected);
    },
  );
});

// verification-scenarios V8; timing-and-alarm-rules §5.5 (the threshold scales with `T`), 5.7
describe("V8: the Rückzugsalarm of a 20-min Trupp", () => {
  it("fires at the 60 bar Rückzugsdruck, worth 4:00 of the 20-min Einsatzzeit", () => {
    let state = run(
      createInitialState(SESSION_START),
      hold(A1),
      press("Down"),
      press("OK"),
      press("OK"),
      hold(A2),
      press("OK"),
      press("OK"),
    );
    expect(restzeitOf(state)).toBe(20 * 60_000);
    state = enter(
      run(state, press("X"), tickAt(2)),
      "einsatzzielErreicht",
      270,
    );
    expect(restzeitOf(state)).toBe(18 * 60_000);
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(60);

    state = reduce(state, tickAt(6, 36));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm(), tickAt(13, 12));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm(), tickAt(15, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(16));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(restzeitOf(state)).toBe(4 * 60_000);
    expect(estimateFlaschendruckBar(selectedTrupp(state))).toBe(60);
  });
});

// verification-scenarios V9; timing-and-alarm-rules §5.7, 5.14
describe("V9: an estimate already at the Rückzugsdruck at Einsatzziel erreicht", () => {
  it("fires the Rückzugsalarm as OK confirms the entry, and only once", () => {
    let state = run(
      chooseItem(run(truppInAnmarsch(), tickAt(8)), "einsatzzielErreicht"),
      press("X"),
    );
    expectNoAlarm(state);
    expect(state.trupps[0]?.einsatzstatus).toBe("anmarsch");

    state = enter(
      run(state, press("X"), press("X")),
      "einsatzzielErreicht",
      200,
    );
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(state.trupps[0]?.einsatzstatus).toBe("einsatzzielErreicht");
    expect(restzeitOf(state)).toBe(20 * 60_000);
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(200);
    state = run(state, ...endAlarm());

    state = reduce(state, tickAt(9, 53));
    expectNoAlarm(state);
    state = reduce(state, tickAt(9, 54));
    expectAlarmFor(state, 1);
    state = run(state, ...endAlarm(), tickAt(19, 47));
    expectNoAlarm(state);
    state = reduce(state, tickAt(19, 48));
    expectAlarmFor(state, 1);
    // up to the Einsatzzeit erreicht at R = 00:00:00
    state = run(state, ...endAlarm(), tickAt(27, 59));
    expectNoAlarm(state);
  });

  // as the user saw on the device: the Rückzugsdruck is not capped at P_N
  it("fires the Rückzugsalarm on OK for 300 → 150 bar, a Rückzugsdruck of 300 bar", () => {
    const state = enter(
      run(truppInAnmarsch(), tickAt(3)),
      "einsatzzielErreicht",
      150,
    );
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(300);
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "rueckzugsalarm" },
    ]);
  });
});

// verification-scenarios V10; timing-and-alarm-rules §1.5, 5.9, 5.14
describe("V10: a pressure entry across the Rückzugsdruck", () => {
  it("fires the Rückzugsalarm on OK, and only a raise above the Rückzugsdruck re-arms it", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(5)),
      "einsatzzielErreicht",
      250,
    );
    expect(rueckzugsdruckBar(selectedTrupp(state))).toBe(100);
    state = enter(run(state, tickAt(7)), "flaschendruckAendern", 95);
    expectAlarmFor(state, 1);
    expect(restzeitOf(state)).toBe((9 * 60 + 30) * 1000);
    state = run(state, ...endAlarm());

    state = enter(run(state, tickAt(7, 30)), "flaschendruckAendern", 105);
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe((10 * 60 + 30) * 1000);

    state = reduce(state, tickAt(7, 59));
    expectNoAlarm(state);
    state = reduce(state, tickAt(8));
    expectAlarmFor(state, 1);
    expect(state.pendingAlarms[0]?.cause).toBe("rueckzugsalarm");
    expect(restzeitOf(state)).toBe(10 * 60_000);
    state = run(state, ...endAlarm());

    state = enter(run(state, tickAt(8, 30)), "flaschendruckAendern", 90);
    expectNoAlarm(state);
    expect(restzeitOf(state)).toBe(9 * 60_000);
    state = reduce(state, tickAt(9, 53));
    expectNoAlarm(state);
  });
});
