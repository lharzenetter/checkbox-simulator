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

// Trupp 01 of A1 and A2, logged in as Sicherheitstrupp for 30 min at 300 bar, on the
// Einsatzliste once X closes its Trupp-Ansicht.
function sicherheitstrupp(): State {
  return run(
    createInitialState(SESSION_START),
    hold(A1),
    press("OK"),
    hold(A2),
    ...presses("Down", 2),
    press("OK"),
    press("OK"),
    press("X"),
  );
}

// Opens the Trupp-Menü from the Einsatzliste and chooses the item.
function chooseItem(state: State, aktion: TruppMenueAktion): State {
  const menue = reduce(state, press("OK"));
  const index = truppMenueAktionen(menue).indexOf(aktion);
  expect(index).toBeGreaterThanOrEqual(0);
  return run(menue, ...presses("Down", index), press("OK"));
}

function truppOf(state: State) {
  const trupp = state.trupps[0];
  if (trupp === undefined) {
    throw new Error("Trupp 01 is not logged in");
  }
  return trupp;
}

// timing-and-alarm-rules §4.3, 12.8
describe("a Sicherheitstrupp in Bereitschaft", () => {
  it("never sounds the Bereitschaft Alarm after 5, 10, … min", () => {
    let state = sicherheitstrupp();
    for (const minute of [5, 10, 15, 20, 25, 30, 60]) {
      state = reduce(state, tickAt(minute));
      expect(state.screen).toBe("einsatzliste");
      expect(state.pendingAlarms).toEqual([]);
    }
  });
});

// timing-and-alarm-rules §12.8; the real-device photo sicherheitstrupp-deaktivieren.jpeg
describe("`Trupp -> Einsatz` on a Sicherheitstrupp", () => {
  function deaktivierenAsked(): State {
    return chooseItem(run(sicherheitstrupp(), tickAt(2)), "truppEinsatz");
  }

  it("asks `Sicherheitstrupp deaktivieren?` over the Trupp-Menü before sending it in", () => {
    const state = deaktivierenAsked();
    expect(state.screen).toBe("truppMenue");
    expect(state.truppMenue?.sicherheitstruppDeaktivierenShown).toBe(true);
    expect(truppOf(state).einsatzstatus).toBe("bereitschaft");
  });

  it("sends it in still a Sicherheitstrupp on X", () => {
    const state = reduce(deaktivierenAsked(), press("X"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.truppMenue).toBeNull();
    expect(truppOf(state).einsatzstatus).toBe("anmarsch");
    expect(truppOf(state).sicherheitstrupp).toBe(true);
  });

  it("sends it in as an ordinary Trupp on OK", () => {
    const state = reduce(deaktivierenAsked(), press("OK"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.truppMenue).toBeNull();
    expect(truppOf(state).einsatzstatus).toBe("anmarsch");
    expect(truppOf(state).sicherheitstrupp).toBe(false);
  });

  // ASSUMPTION in reduce.ts: every other key is ignored while the box shows
  it("ignores Up, Down and Check while the box shows", () => {
    const asked = deaktivierenAsked();
    for (const key of ["Up", "Down", "Check"] as const) {
      expect(reduce(asked, press(key))).toEqual(asked);
    }
  });

  // ASSUMPTION in reduce.ts, taken in issue #52
  it("ignores a Tally held to Check while the box shows", () => {
    const asked = deaktivierenAsked();
    const A3 = { tallyId: "a3", name: "TLF AT-F" };
    expect(reduce(asked, hold(A3))).toBe(asked);
    expect(reduce(asked, hold(A1))).toBe(asked);
  });

  // timing-and-alarm-rules §12.8; ASSUMPTION in reduce.ts
  it("asks again each time it leaves Bereitschaft while still flagged", () => {
    let state = reduce(deaktivierenAsked(), press("X"));
    state = chooseItem(run(state, tickAt(4)), "truppBereitschaft");
    state = chooseItem(run(state, tickAt(6)), "truppEinsatz");
    expect(state.truppMenue?.sicherheitstruppDeaktivierenShown).toBe(true);
    expect(truppOf(state).einsatzstatus).toBe("bereitschaft");
  });

  // timing-and-alarm-rules §9 [13]; ASSUMPTION in reduce.ts, taken in issue #52
  it("closes the box with the Trupp-Menü after 15 s without a key, the Trupp still in Bereitschaft", () => {
    const asked = deaktivierenAsked();
    let state = reduce(asked, tickAt(2, 14));
    expect(state.truppMenue?.sicherheitstruppDeaktivierenShown).toBe(true);
    state = reduce(state, tickAt(2, 15));
    expect(state.screen).toBe("einsatzliste");
    expect(state.truppMenue).toBeNull();
    expect(truppOf(state).einsatzstatus).toBe("bereitschaft");
    expect(truppOf(state).sicherheitstrupp).toBe(true);
  });

  // timing-and-alarm-rules §8.2, 8.4: S12 takes over from any screen and gives it back unchanged
  it("shows the box again after an Alarm that interrupted it", () => {
    const B1 = { tallyId: "b1", name: "TLF AT-F" };
    const B2 = { tallyId: "b2", name: "TLF AT-M" };
    // Trupp 02 in Anmarsch reaches its first Alarmgrenze at 9:54 into its Einsatz
    const zweiterTrupp = run(
      sicherheitstrupp(),
      hold(B1),
      press("OK"),
      hold(B2),
      press("OK"),
      press("OK"),
      press("X"),
      press("Up"),
    );
    const asked = run(zweiterTrupp, tickAt(9, 50), press("OK"), press("OK"));
    expect(asked.truppMenue?.sicherheitstruppDeaktivierenShown).toBe(true);

    const interrupted = reduce(asked, tickAt(9, 54));
    expect(interrupted.screen).toBe("alarm");
    const resumed = run(interrupted, press("OK"), press("OK"));
    expect(resumed.screen).toBe("truppMenue");
    expect(resumed.truppMenue?.sicherheitstruppDeaktivierenShown).toBe(true);
    expect(reduce(resumed, press("X")).trupps[0]?.einsatzstatus).toBe(
      "anmarsch",
    );
  });

  it("does not ask an ordinary Trupp", () => {
    let state = reduce(deaktivierenAsked(), press("OK"));
    state = chooseItem(run(state, tickAt(4)), "truppBereitschaft");
    state = chooseItem(run(state, tickAt(6)), "truppEinsatz");
    expect(state.screen).toBe("einsatzliste");
    expect(truppOf(state).einsatzstatus).toBe("anmarsch");
  });

  // timing-and-alarm-rules §4.3, 4.4
  it("gives a deactivated Trupp the Bereitschaft Alarm on its next Bereitschaft", () => {
    let state = reduce(deaktivierenAsked(), press("OK"));
    state = chooseItem(run(state, tickAt(4)), "truppBereitschaft");
    state = reduce(state, tickAt(8, 59));
    expect(state.pendingAlarms).toEqual([]);
    state = reduce(state, tickAt(9));
    expect(state.screen).toBe("alarm");
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "bereitschaft" },
    ]);
  });

  it("keeps a Trupp sent in as Sicherheitstrupp without the Bereitschaft Alarm", () => {
    let state = reduce(deaktivierenAsked(), press("X"));
    state = chooseItem(run(state, tickAt(4)), "truppBereitschaft");
    state = run(state, tickAt(9), tickAt(14));
    expect(state.screen).toBe("einsatzliste");
    expect(state.pendingAlarms).toEqual([]);
  });
});
