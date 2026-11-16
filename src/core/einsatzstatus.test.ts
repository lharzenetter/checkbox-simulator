import { describe, expect, it } from "vitest";
import { createInitialState, reduce, truppMenueAktionen } from "./index";
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

// Trupp 01 of A1 and A2, logged in for 30 min at 300 bar with the chosen Anmeldeaktion, on the
// Einsatzliste once X closes its Trupp-Ansicht.
function loggedIn(anmeldeaktionDowns: number): State {
  return run(
    createInitialState(SESSION_START),
    hold(A1),
    press("OK"),
    hold(A2),
    ...presses("Down", anmeldeaktionDowns),
    press("OK"),
    press("OK"),
    press("X"),
  );
}

function truppInAnmarsch(): State {
  return loggedIn(0);
}

// Opens the Trupp-Menü from the Einsatzliste and chooses the item.
function chooseItem(state: State, aktion: TruppMenueAktion): State {
  const menue = reduce(state, press("OK"));
  const index = truppMenueAktionen(menue).indexOf(aktion);
  expect(index).toBeGreaterThanOrEqual(0);
  return run(menue, ...presses("Down", index), press("OK"));
}

// Chooses the item, then OK in the Flaschendruck editor it opens: "accept" in the scenarios. It
// ends on the Trupp-Ansicht, or on S12 when the entry fires an Alarm.
function accept(state: State, aktion: TruppMenueAktion): State {
  return reduce(chooseItem(state, aktion), press("OK"));
}

// The Anmarschzeit shows only as the Trupp-Ansicht's time-split bar, not as text, so the
// scenarios can't state that it runs from the login.
describe("the Anmarschzeit", () => {
  // verification scenario V15; timing-and-alarm-rules §12.5: `Trupp -> Einsatz` in Anmarsch does
  // not restart it
  it("runs from the login through `Trupp -> Einsatz` in Anmarsch", () => {
    const state = chooseItem(run(truppInAnmarsch(), tickAt(3)), "truppEinsatz");
    expect(
      accept(run(state, tickAt(5)), "einsatzzielErreicht").trupps[0]
        ?.anmarschzeitMs,
    ).toBe(minutes(5));
  });

  // timing-and-alarm-rules §4.6, 5.4, 12.4
  it("resumes after Bereitschaft with the time counted so far", () => {
    let state = chooseItem(
      run(truppInAnmarsch(), tickAt(4)),
      "truppBereitschaft",
    );
    // OK the Bereitschaft Alarm at 9:00 (timing-and-alarm-rules §4.3)
    state = run(state, tickAt(9), press("OK"), press("OK"));
    state = chooseItem(run(state, tickAt(10)), "truppEinsatz");

    state = accept(run(state, tickAt(12)), "einsatzzielErreicht");
    expect(state.trupps[0]?.anmarschzeitMs).toBe(minutes(6));
  });
});
