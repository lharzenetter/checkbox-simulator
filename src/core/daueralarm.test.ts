import { describe, expect, it } from "vitest";
import {
  alarmCycleMs,
  alarmTrupp,
  createInitialState,
  isAlarmLedLit,
  isAlarmSounding,
  reduce,
} from "./index";
import type { Event, Key, State } from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

const A1 = { tallyId: "a1", name: "HLF AT-F" };
const A2 = { tallyId: "a2", name: "HLF AT-M" };
const B1 = { tallyId: "b1", name: "HLF WT-F" };
const B2 = { tallyId: "b2", name: "HLF WT-M" };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

function release(key: Key): Event {
  return { type: "keyReleased", key };
}

function tickAfter(state: State, elapsedMs: number): Event {
  return {
    type: "tick",
    now: state.now + elapsedMs,
    realNow: state.realNow + elapsedMs,
  };
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

// verification scenario V18; timing-and-alarm-rules §7.1, 7.3, 7.4, 12.7
describe("V18: the logoff Daueralarm", () => {
  it("does not sound while ABMELDEN only waits", () => {
    const state = run(truppInAnmarsch(), hold(A1));
    expect(state.screen).toBe("abmelden");
    expect(isAlarmSounding(state)).toBe(false);
  });

  it("starts on OK with a member unmarked, and ABMELDEN stays", () => {
    const state = run(truppInAnmarsch(), hold(A1), press("OK"));
    expect(state.screen).toBe("abmelden");
    expect(isAlarmSounding(state)).toBe(true);
  });

  it("keeps sounding on a second OK", () => {
    const state = run(truppInAnmarsch(), hold(A1), press("OK"), press("OK"));
    expect(state.screen).toBe("abmelden");
    expect(isAlarmSounding(state)).toBe(true);
  });

  it("stops once every member is marked, and ABMELDEN waits for OK", () => {
    const state = run(truppInAnmarsch(), hold(A1), press("OK"), hold(A2));
    expect(isAlarmSounding(state)).toBe(false);
    expect(state.screen).toBe("abmelden");
    expect(state.trupps).toHaveLength(1);

    const loggedOff = reduce(state, press("OK"));
    expect(loggedOff.screen).toBe("einsatzliste");
    expect(loggedOff.trupps).toHaveLength(0);
  });

  describe("from its start", () => {
    function daueralarm(): State {
      return run(truppInAnmarsch(), hold(A1), press("OK"));
    }

    it("stops on X, and the Trupp runs on in its Einsatzstatus with the marks cleared", () => {
      const before = daueralarm();
      const state = reduce(before, press("X"));
      expect(isAlarmSounding(state)).toBe(false);
      expect(state.screen).toBe("einsatzliste");
      expect(state.logoff).toBeNull();
      expect(state.trupps).toEqual(before.trupps);

      const later = reduce(state, tickAfter(state, 1_000));
      expect(later.trupps[0]?.restzeitMs).toBe(
        (before.trupps[0]?.restzeitMs ?? 0) - 1_000,
      );
    });

    it("restarts on OK again after X with a member still missing", () => {
      const state = run(daueralarm(), press("X"), hold(A1), press("OK"));
      expect(state.screen).toBe("abmelden");
      expect(isAlarmSounding(state)).toBe(true);
    });

    // manual 5.9; the hold works from the Einsatzliste only (decided in "Define the key-by-screen
    // navigation model"), so X takes the Daueralarm's screen away before Check joins it
    it("stops for a Notausschaltung of the Trupp, which ends it", () => {
      const leaving = run(daueralarm(), press("X"), press("Check"));
      expect(isAlarmSounding(leaving)).toBe(false);

      const holding = run(
        leaving,
        release("X"),
        release("Check"),
        press("X"),
        press("Check"),
      );
      const state = run(
        holding,
        tickAfter(holding, 4_000),
        press("OK"),
        press("OK"),
      );
      expect(state.trupps).toHaveLength(0);
      expect(isAlarmSounding(state)).toBe(false);
    });

    it("lets the Restzeit keep running while it sounds", () => {
      const before = daueralarm();
      const state = reduce(before, tickAfter(before, 60_000));
      expect(state.trupps[0]?.restzeitMs).toBe(
        (before.trupps[0]?.restzeitMs ?? 0) - 60_000,
      );
      expect(isAlarmSounding(state)).toBe(true);
    });
  });
});

// verification scenario V19; timing-and-alarm-rules §7.2, 7.5, 7.6
describe("V19: the login Daueralarm", () => {
  /** The Anmeldefenster for 30 min with only A1 joined. */
  function anmeldefenster(): State {
    return run(createInitialState(SESSION_START), hold(A1), press("OK"));
  }

  it("does not sound while the Anmeldefenster only waits", () => {
    expect(isAlarmSounding(anmeldefenster())).toBe(false);
  });

  it("starts on `Trupp OK Einsatz` + OK with one member, and the Anmeldefenster stays", () => {
    const state = reduce(anmeldefenster(), press("OK"));
    expect(state.screen).toBe("anmeldefenster");
    expect(isAlarmSounding(state)).toBe(true);
  });

  it("keeps sounding on a second OK", () => {
    const state = run(anmeldefenster(), press("OK"), press("OK"));
    expect(state.screen).toBe("anmeldefenster");
    expect(isAlarmSounding(state)).toBe(true);
  });

  it("stops once the second member joins, and the Anmeldefenster waits for OK", () => {
    const state = run(anmeldefenster(), press("OK"), hold(A2));
    expect(isAlarmSounding(state)).toBe(false);
    expect(state.screen).toBe("anmeldefenster");

    const loggedIn = run(state, press("OK"), press("OK"));
    expect(loggedIn.screen).toBe("einsatzliste");
    expect(loggedIn.trupps[0]?.einsatzstatus).toBe("anmarsch");
  });

  // decided in "Decide when a Daueralarm starts and ends": only [07] members or X end it, and no
  // Tally joins on the Flaschendruck editor ("Define the key-by-screen navigation model")
  it("keeps sounding while `Druck ändern` is open and after it returns", () => {
    const editor = run(anmeldefenster(), press("OK"), press("Up"), press("OK"));
    expect(editor.screen).toBe("flaschendruckAendern");
    expect(isAlarmSounding(editor)).toBe(true);

    const back = reduce(editor, press("OK"));
    expect(back.screen).toBe("anmeldefenster");
    expect(isAlarmSounding(back)).toBe(true);
  });

  it("stops on X, which throws the login away and frees the Truppnummer", () => {
    const state = run(anmeldefenster(), press("OK"), press("X"));
    expect(isAlarmSounding(state)).toBe(false);
    expect(state.login).toBeNull();
    expect(reduce(state, hold(A2)).login?.truppnummer).toBe(1);
  });
});

// verification scenario V22; timing-and-alarm-rules §8.2; decided in "Decide how alarms are
// presented", points 4 and 5
describe("V22: an Alarm during a Daueralarm", () => {
  // Trupp 01 logged in at 0:00 and Trupp 02 at 0:30; Trupp 01's G1 acknowledged; at 10:00 Trupp
  // 01's logoff Daueralarm sounds on ABMELDEN.
  function logoffDaueralarm(): State {
    return run(
      truppInAnmarsch(),
      tickAt(0, 30),
      hold(B1),
      press("OK"),
      hold(B2),
      press("OK"),
      press("OK"),
      tickAt(9, 54),
      press("OK"),
      tickAt(10),
      hold(A1),
      press("OK"),
    );
  }

  it("lets S12 for another Trupp interrupt ABMELDEN", () => {
    const state = reduce(logoffDaueralarm(), tickAt(10, 24));
    expect(state.screen).toBe("alarm");
    expect(alarmTrupp(state).truppnummer).toBe(2);
    expect(isAlarmSounding(state)).toBe(true);
  });

  it("returns to ABMELDEN after OK, with the Daueralarm still sounding", () => {
    const state = run(
      logoffDaueralarm(),
      tickAt(10, 24),
      tickAt(10, 25),
      press("OK"),
    );
    expect(state.screen).toBe("abmelden");
    expect(state.logoff?.markedTallyIds).toEqual([A1.tallyId]);
    expect(isAlarmSounding(state)).toBe(true);
  });

  it("does not let OK on S12 silence the Daueralarm behind it", () => {
    const state = run(
      logoffDaueralarm(),
      tickAt(10, 24),
      press("OK"),
      press("OK"),
    );
    expect(state.screen).toBe("abmelden");
    expect(isAlarmSounding(state)).toBe(true);
  });

  // decided in "Decide how alarms are presented", point 4: the signal runs while anything is
  // pending or a Daueralarm is active, so S12 taking over must not restart the siren's wail
  it("keeps the siren and the LED in the Daueralarm's rhythm while S12 is in front", () => {
    const daueralarm = run(
      logoffDaueralarm(),
      press("X"),
      hold(A1),
      tickAfter(logoffDaueralarm(), 100),
      press("OK"),
    );
    const interrupted = reduce(daueralarm, tickAt(10, 24));
    expect(interrupted.screen).toBe("alarm");
    expect(alarmCycleMs(interrupted)).toBe(400);
    expect(alarmCycleMs(reduce(interrupted, press("OK")))).toBe(400);
  });
});

// decided in "Decide how alarms are presented", point 2: a Daueralarm sounds and looks like an
// Alarm, so the LED blinks in step with the siren from the moment it starts
describe("the red LED during a Daueralarm", () => {
  function atRealTime(state: State, realElapsedMs: number): State {
    return reduce(state, tickAfter(state, realElapsedMs));
  }

  it("is lit as the Daueralarm starts, however long ABMELDEN was open, and blinks every 250 ms", () => {
    const abmelden = run(truppInAnmarsch(), hold(A1));
    const daueralarm = reduce(atRealTime(abmelden, 300), press("OK"));
    expect(alarmCycleMs(daueralarm)).toBe(0);
    expect(isAlarmLedLit(daueralarm)).toBe(true);
    expect(isAlarmLedLit(atRealTime(daueralarm, 250))).toBe(false);
    expect(isAlarmLedLit(atRealTime(daueralarm, 500))).toBe(true);
  });

  it("is dark once the Daueralarm stops", () => {
    const state = run(truppInAnmarsch(), hold(A1), press("OK"), hold(A2));
    expect(isAlarmLedLit(state)).toBe(false);
  });
});
