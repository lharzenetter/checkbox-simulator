import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "./index";
import type { Event, Key, State } from "./index";

// The use cases of the Notausschaltung are scenarios in acceptance/scenarios/notausschaltung.ts;
// these hold what a scenario cannot state, as its Keys go down and up together.

const SESSION_START = { now: 1_000_000, realNow: 500 };

// [03] 33 % of the 30 min Einsatzzeit; timing-and-alarm-rules §2
const ALARMGRENZE_1_MS = 594_000;

const A1 = { tallyId: "a1", name: "HLF AT-F" };
const A2 = { tallyId: "a2", name: "HLF AT-M" };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

function release(key: Key): Event {
  return { type: "keyReleased", key };
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

// Trupp 01 of A1 and A2, logged in to Anmarsch, on the Einsatzliste once X closes its Trupp-Ansicht.
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

describe("holding X and Check on the Einsatzliste", () => {
  // manual 5.9 step 2
  it("measures a new hold from the moment both keys are held again", () => {
    const holding = run(truppInAnmarsch(), press("X"), press("Check"));
    const rehold = run(
      holding,
      tickAfter(holding, 3_000),
      release("X"),
      press("X"),
    );
    const early = reduce(rehold, tickAfter(rehold, 3_999));
    expect(early.screen).toBe("einsatzliste");
    expect(reduce(early, tickAfter(early, 1)).screen).toBe(
      "notausschaltungAuswahl",
    );
  });

  // decided in "Decide how alarms are presented", point 4: S12 takes over from any screen
  it("drops the hold when an Alarm takes over", () => {
    const holding = run(
      truppInAnmarsch(),
      tickAfter(truppInAnmarsch(), ALARMGRENZE_1_MS - 2_000),
      press("X"),
      press("Check"),
    );
    expect(holding.screen).toBe("einsatzliste");
    const alarm = reduce(holding, tickAfter(holding, 2_000));
    expect(alarm.screen).toBe("alarm");
    const acknowledged = run(alarm, press("OK"), press("OK"));
    expect(reduce(acknowledged, tickAfter(acknowledged, 2_000)).screen).toBe(
      "einsatzliste",
    );
  });
});
