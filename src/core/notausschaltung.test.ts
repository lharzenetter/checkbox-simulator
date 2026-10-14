import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "./index";
import type { Event, Key, State } from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

// [03] 33 % of the 30 min Einsatzzeit; timing-and-alarm-rules §2
const ALARMGRENZE_1_MS = 594_000;

const A1 = { tallyId: "a1", name: "HLF AT-F" };
const A2 = { tallyId: "a2", name: "HLF AT-M" };
const B1 = { tallyId: "b1", name: "LF AT-F" };
const B2 = { tallyId: "b2", name: "LF AT-M" };

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

// 10× speed, verification scenario V23
function tickAtTenfoldAfter(state: State, realElapsedMs: number): Event {
  return {
    type: "tick",
    now: state.now + 10 * realElapsedMs,
    realNow: state.realNow + realElapsedMs,
  };
}

function tickAfter(state: State, elapsedMs: number): Event {
  return {
    type: "tick",
    now: state.now + elapsedMs,
    realNow: state.realNow + elapsedMs,
  };
}

// Trupp 01 of A1 and A2, logged in to Anmarsch, on the Einsatzliste.
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

// Trupp 01 of A1 and A2 in Anmarsch and Trupp 02 of B1 and B2 in Bereitschaft; 02 is marked.
function zweiTrupps(): State {
  return run(
    truppInAnmarsch(),
    hold(B1),
    press("OK"),
    hold(B2),
    press("Down"),
    press("OK"),
    press("OK"),
  );
}

// S14, opened by holding X and Check for 4 s on the Einsatzliste.
function notausschaltungAuswahl(einsatzliste = truppInAnmarsch()): State {
  const holding = run(einsatzliste, press("X"), press("Check"));
  return run(
    holding,
    tickAfter(holding, 4_000),
    release("X"),
    release("Check"),
  );
}

describe("holding X and Check on the Einsatzliste", () => {
  // manual 5.9 step 2; verification scenario V23: 4 s real, not 0.4 s, at 10×
  it("opens the Notausschaltung after 4 real seconds at 10×", () => {
    const holding = run(truppInAnmarsch(), press("X"), press("Check"));
    const early = reduce(holding, tickAtTenfoldAfter(holding, 3_999));
    expect(early.screen).toBe("einsatzliste");
    const held = reduce(early, tickAtTenfoldAfter(early, 1));
    expect(held.screen).toBe("notausschaltungAuswahl");
  });

  // manual 5.9 step 2: X and Check held together
  it("does nothing when X or Check is released early", () => {
    const holding = run(truppInAnmarsch(), press("X"), press("Check"));
    const almost = reduce(holding, tickAtTenfoldAfter(holding, 3_000));
    const released = reduce(almost, release("Check"));
    const later = reduce(released, tickAtTenfoldAfter(released, 5_000));
    expect(later.screen).toBe("einsatzliste");
  });

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

  // manual 5.9 step 2
  it("does nothing while only X is held", () => {
    const holding = reduce(truppInAnmarsch(), press("X"));
    expect(reduce(holding, tickAfter(holding, 10_000)).screen).toBe(
      "einsatzliste",
    );
  });

  // ASSUMPTION in reduce: S14 opens on the marked Trupp ("Define the key-by-screen navigation
  // model"), so without one the hold does nothing
  it("does nothing on an empty Einsatzliste", () => {
    const empty = run(
      truppInAnmarsch(),
      hold(A1),
      hold(A2),
      press("OK"),
      press("X"),
      press("Check"),
    );
    expect(empty.trupps).toEqual([]);
    expect(reduce(empty, tickAfter(empty, 4_000)).screen).toBe("einsatzliste");
  });

  // decided in "Decide how alarms are presented", point 6: the Alarm is acknowledged first
  it("does nothing on Trupp ALARM", () => {
    const alarm = reduce(
      truppInAnmarsch(),
      tickAfter(truppInAnmarsch(), ALARMGRENZE_1_MS),
    );
    expect(alarm.screen).toBe("alarm");
    const holding = run(alarm, press("X"), press("Check"));
    expect(reduce(holding, tickAfter(holding, 4_000)).screen).toBe("alarm");
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
    const acknowledged = reduce(alarm, press("OK"));
    expect(reduce(acknowledged, tickAfter(acknowledged, 2_000)).screen).toBe(
      "einsatzliste",
    );
  });
});

describe("S14 Notausschaltung – Auswahl", () => {
  // decided in "Define the key-by-screen navigation model"
  it("starts with the cursor on the marked Trupp", () => {
    expect(notausschaltungAuswahl().notausschaltung).toBe("markierterTrupp");
  });

  // manual 5.9 step 3
  it("moves the cursor with Up and Down, wrapping", () => {
    const state = notausschaltungAuswahl();
    expect(reduce(state, press("Down")).notausschaltung).toBe("alleTrupps");
    expect(reduce(state, press("Up")).notausschaltung).toBe("zurueck");
  });

  // manual 5.9 step 3; decided in "Define the key-by-screen navigation model"
  it("returns to the Einsatzliste on `-> zurueck`, the Trupp unchanged", () => {
    const auswahl = notausschaltungAuswahl();
    const state = run(auswahl, press("Up"), press("OK"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.notausschaltung).toBeNull();
    expect(state.trupps).toEqual(auswahl.trupps);
  });

  // manual 5.9 step 4
  it.each([
    ["the marked Trupp", 0],
    ["all Trupps", 1],
  ])("asks for confirmation when %s is chosen", (_, downs) => {
    const state = run(
      notausschaltungAuswahl(),
      ...Array.from({ length: downs }, () => press("Down")),
      press("OK"),
    );
    expect(state.screen).toBe("notausschaltungBestaetigung");
  });

  // ASSUMPTION in reduce: X is inert on S14, which only `-> zurueck` leaves
  it.each<Key>(["X", "Check"])("ignores %s", (key) => {
    const state = notausschaltungAuswahl();
    expect(reduce(state, press(key))).toBe(state);
  });

  // decided in "Define the key-by-screen navigation model", its "Tally on Check" table
  it("ignores Tallys", () => {
    const state = notausschaltungAuswahl();
    expect(reduce(state, hold(A1))).toBe(state);
  });

  // decided in "Decide how alarms are presented", points 4 and 5: S12 takes over and the last OK
  // returns to the interrupted screen
  it("returns to the same choice for the same Trupp after an Alarm interrupts it", () => {
    const auswahl = reduce(notausschaltungAuswahl(zweiTrupps()), press("Down"));
    // Trupp 02's first Bereitschaft Alarm (timing-and-alarm-rules §4.3)
    const alarm = reduce(auswahl, tickAfter(auswahl, 5 * 60_000));
    expect(alarm.screen).toBe("alarm");
    const back = reduce(alarm, press("OK"));
    expect(back.screen).toBe("notausschaltungAuswahl");
    expect(back.notausschaltung).toBe("alleTrupps");
    expect(back.selectedTruppnummer).toBe(2);
  });
});

describe("S15 Notausschaltung – Bestätigung", () => {
  // manual 5.9 steps 4–5, p. 31
  it("ends the marked Trupp on OK and writes its Einsatzprotokoll", () => {
    const auswahl = notausschaltungAuswahl(zweiTrupps());
    const state = run(auswahl, press("OK"), press("OK"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.notausschaltung).toBeNull();
    expect(state.trupps.map((trupp) => trupp.truppnummer)).toEqual([1]);
    expect(state.selectedTruppnummer).toBe(1);
    expect(state.einsatzprotokolle).toEqual([
      {
        einsatznummer: 1,
        truppnummer: 2,
        einsatzzeitMs: 30 * 60_000,
        atemschutztraeger: [B1, B2],
        einsatzstatus: "bereitschaft",
        sicherheitstrupp: false,
        loggedInAtMs: SESSION_START.now,
        loggedOffAtMs: SESSION_START.now + 4_000,
        davonAktivMs: 0,
        notausschaltung: true,
      },
    ]);
  });

  // manual 5.9 steps 3–5, p. 31: an Einsatzprotokoll for every Trupp ended
  it("ends every Trupp on `-> alle Trupps` and writes their Einsatzprotokolle", () => {
    const auswahl = notausschaltungAuswahl(zweiTrupps());
    const state = run(auswahl, press("Down"), press("OK"), press("OK"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.trupps).toEqual([]);
    expect(state.selectedTruppnummer).toBeNull();
    expect(
      state.einsatzprotokolle.map(
        ({ truppnummer, einsatznummer, notausschaltung }) => ({
          truppnummer,
          einsatznummer,
          notausschaltung,
        }),
      ),
    ).toEqual([
      { truppnummer: 1, einsatznummer: 1, notausschaltung: true },
      { truppnummer: 2, einsatznummer: 2, notausschaltung: true },
    ]);
  });

  // manual p. 34: the empty Einsatzliste then switches off after the Abschaltzeit
  it("leaves an empty Einsatzliste that switches off after the Abschaltzeit", () => {
    const ended = run(notausschaltungAuswahl(), press("OK"), press("OK"));
    expect(reduce(ended, tickAfter(ended, 25_000)).screen).toBe("aus");
  });

  // manual 5.9 step 5; decided in "Define the key-by-screen navigation model"
  it.each<Key>(["Up", "Down", "X", "Check"])(
    "cancels on %s, the Trupp unchanged",
    (key) => {
      const bestaetigung = reduce(notausschaltungAuswahl(), press("OK"));
      const state = reduce(bestaetigung, press(key));
      expect(state.screen).toBe("einsatzliste");
      expect(state.notausschaltung).toBeNull();
      expect(state.trupps).toEqual(bestaetigung.trupps);
      expect(state.einsatzprotokolle).toEqual([]);
    },
  );

  // decided in "Define the key-by-screen navigation model", its "Tally on Check" table
  it("ignores Tallys", () => {
    const state = reduce(notausschaltungAuswahl(), press("OK"));
    expect(reduce(state, hold(A1))).toBe(state);
  });

  // timing-and-alarm-rules §7.4: lands with the logoff Daueralarm, #36
  it.todo("ends a running logoff Daueralarm for the Trupp");
});
