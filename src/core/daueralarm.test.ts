import { describe, expect, it } from "vitest";
import {
  alarmCycleMs,
  createInitialState,
  isAlarmLedLit,
  isAlarmSounding,
  reduce,
} from "./index";
import type { Event, Key, State } from "./index";

// The use cases of the Daueralarme are scenarios in acceptance/scenarios/daueralarm.ts; this file
// keeps what the screen can't show: the Notausschaltung's end of it and the siren's rhythm.

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

// verification scenario V18, variant Notausschaltung; timing-and-alarm-rules §7.4
describe("V18: the logoff Daueralarm", () => {
  // manual 5.9; the hold works from the Einsatzliste only (decided in "Define the key-by-screen
  // navigation model"), so X takes the Daueralarm's screen away before Check joins it
  it("stops for a Notausschaltung of the Trupp, which ends it", () => {
    const daueralarm = run(truppInAnmarsch(), hold(A1), press("OK"));
    const leaving = run(daueralarm, press("X"), press("Check"));
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
});

// verification scenario V22; decided in "Decide how alarms are presented", point 4: the signal
// runs while anything is pending or a Daueralarm is active, so S12 taking over must not restart
// the siren's wail
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
      press("OK"),
      tickAt(10),
      hold(A1),
      press("OK"),
    );
  }

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
});
