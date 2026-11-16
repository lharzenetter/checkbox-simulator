import { describe, expect, it } from "vitest";
import {
  createInitialState,
  reduce,
  rueckzugsdruckBar,
  selectedTrupp,
  truppMenueAktionen,
} from "./index";
import type {
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

function restzeitOf(state: State): number | undefined {
  return state.trupps[0]?.restzeitMs;
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

// The Rückzugsalarm across Bereitschaft; #66 states it as scenarios.
describe("`Trupp -> Einsatz` from Bereitschaft", () => {
  // verification scenario V26; timing-and-alarm-rules §4.6, 5.9, 12.4
  it("suppresses the Rückzugsalarm of a Trupp restored to Rückmarsch", () => {
    const einsatzziel = run(
      enter(run(truppInAnmarsch(), tickAt(3)), "einsatzzielErreicht", 270),
      press("X"),
    );
    const rueckmarsch = run(
      enter(run(einsatzziel, tickAt(5)), "rueckzugAntreten", 250),
      press("X"),
    );
    let state = chooseItem(run(rueckmarsch, tickAt(6)), "truppBereitschaft");
    state = chooseItem(run(state, tickAt(9)), "truppEinsatz");

    // OK ALARM 1 at 12:54 and ALARM 2 at 22:48; R = 6:00 at 27:00 is the Rückzugsdruck, but
    // Rückmarsch suppresses the Rückzugsalarm (timing-and-alarm-rules §5.9)
    state = run(
      state,
      tickAt(12, 54),
      press("OK"),
      press("OK"),
      tickAt(22, 48),
      press("OK"),
      press("OK"),
    );
    state = run(state, tickAt(27));
    expect(restzeitOf(state)).toBe(minutes(6));
    expect(state.pendingAlarms).toEqual([]);
  });

  // timing-and-alarm-rules §4.6, 5.9
  it("keeps a Rückzugsalarm that fired before Bereitschaft fired", () => {
    // 300 → 160 bar gives a Rückzugsdruck of 280 bar, so the Rückzugsalarm fires on OK
    // (timing-and-alarm-rules §5.7, 5.14)
    let state = enter(
      run(truppInAnmarsch(), tickAt(4)),
      "einsatzzielErreicht",
      160,
    );
    expect(state.pendingAlarms).toEqual([
      { truppnummer: 1, cause: "rueckzugsalarm" },
    ]);
    state = run(state, press("OK"), press("OK"));
    state = chooseItem(run(state, tickAt(8)), "truppBereitschaft");

    // the Bereitschaft Alarm at 13:00 (timing-and-alarm-rules §4.3)
    state = run(state, tickAt(13), press("OK"), press("OK"));
    state = chooseItem(run(state, tickAt(14)), "truppEinsatz");
    expect(state.trupps[0]?.rueckzugsalarmArmed).toBe(false);
    expect(run(state, tickAt(15)).pendingAlarms).toEqual([]);
  });
});

// timing-and-alarm-rules §5.7, 5.13, 5.15
describe("the Rückzugsdruck", () => {
  function rueckzugsdruckOf(state: State): number {
    return rueckzugsdruckBar(selectedTrupp(state));
  }

  // §5.13: the Reservedruck until Einsatzziel erreicht
  it("is the 50 bar Reservedruck in Anmarsch", () => {
    expect(rueckzugsdruckOf(run(truppInAnmarsch(), tickAt(5)))).toBe(50);
  });

  // verification scenario V6: 300 → 270 bar
  it("is twice the Anmarschdruck, 60 bar for an Anmarschdruck of 30 bar", () => {
    const state = accept(
      run(truppInAnmarsch(), tickAt(3)),
      "einsatzzielErreicht",
    );
    expect(rueckzugsdruckOf(state)).toBe(60);
  });

  // verification scenario V8: in pressure, so the Einsatzzeit does not change it
  it("is 60 bar for an Anmarschdruck of 30 bar with a 20-min Einsatzzeit", () => {
    const zwanzig = run(
      createInitialState(SESSION_START),
      hold(A1),
      press("Down"),
      press("OK"),
      press("OK"),
      hold(A2),
      press("OK"),
      press("OK"),
      press("X"),
    );
    expect(zwanzig.trupps[0]?.einsatzzeitMs).toBe(minutes(20));
    const state = accept(run(zwanzig, tickAt(2)), "einsatzzielErreicht");
    expect(restzeitOf(state)).toBe(minutes(18));
    expect(rueckzugsdruckOf(state)).toBe(60);
  });

  // §5.15: the Anmarschdruck always runs from the Anfangsdruck
  it("measures the Anmarschdruck from an Anfangsdruck of 270 bar", () => {
    const at270Bar = run(
      createInitialState(SESSION_START),
      hold(A1),
      press("OK"),
      hold(A2),
      press("OK"),
      ...Array.from({ length: 6 }, () => press("Down")),
      press("OK"),
      press("X"),
    );
    expect(restzeitOf(at270Bar)).toBe(minutes(27));
    const state = enter(run(at270Bar, tickAt(2)), "einsatzzielErreicht", 220);
    expect(rueckzugsdruckOf(state)).toBe(100);
  });

  // verification scenario V13
  it("is kept through Bereitschaft", () => {
    let state = enter(
      run(truppInAnmarsch(), tickAt(4)),
      "einsatzzielErreicht",
      260,
    );
    expect(rueckzugsdruckOf(state)).toBe(80);
    state = chooseItem(run(state, press("X"), tickAt(8)), "truppBereitschaft");
    expect(rueckzugsdruckOf(state)).toBe(80);
    // the Bereitschaft Alarm at 13:00 (timing-and-alarm-rules §4.3)
    state = run(state, tickAt(13), press("OK"), press("OK"));
    state = chooseItem(run(state, tickAt(14)), "truppEinsatz");
    expect(rueckzugsdruckOf(state)).toBe(80);
  });
});
