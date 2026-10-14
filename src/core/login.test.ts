import { describe, expect, it } from "vitest";
import { createInitialState, isSicherShown, reduce } from "./index";
import type { Event, Key, State } from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

const A1 = { tallyId: "a1", name: "HLF AT-F" };
const A2 = { tallyId: "a2", name: "HLF AT-M" };
const B1 = { tallyId: "b1", name: "LF AT-F" };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

function hold(tally: { tallyId: string; name: string }): Event {
  return { type: "tallyHeld", ...tally };
}

function aus(): State {
  return createInitialState(SESSION_START);
}

describe("starting a login", () => {
  // decided in "Define the key-by-screen navigation model"
  it("opens Einsatzzeit wählen when a Tally is held to Check while Aus", () => {
    const state = run(aus(), hold(A1));
    expect(state.screen).toBe("einsatzzeitWaehlen");
    expect(state.login).toMatchObject({
      truppnummer: 1,
      atemschutztraeger: [A1],
    });
  });

  it("opens Einsatzzeit wählen from the Startdisplay", () => {
    expect(run(aus(), press("Check"), hold(A1)).screen).toBe(
      "einsatzzeitWaehlen",
    );
  });

  it("ignores a Tally on SERVICE", () => {
    const service = run(aus(), press("Check"), press("OK"));
    expect(reduce(service, hold(A1))).toBe(service);
  });
});

describe("Einsatzzeit wählen", () => {
  // decided in "Define the key-by-screen navigation model"
  it("opens the Anmeldefenster for 30 min on OK", () => {
    const state = run(aus(), hold(A1), press("OK"));
    expect(state.screen).toBe("anmeldefenster");
    expect(state.login?.einsatzzeitMs).toBe(30 * 60_000);
  });

  // manual 5.3 step 5, timing-and-alarm-rules §8.3: a Langzeiteinsatz needs a second OK
  it("asks for the Langzeiteinsatz on OK at 20 min and opens the Anmeldefenster on a second OK", () => {
    const asking = run(aus(), hold(A1), press("Down"), press("OK"));
    expect(asking.screen).toBe("einsatzzeitWaehlen");
    expect(asking.login?.awaitingLangzeiteinsatzOk).toBe(true);
    const state = reduce(asking, press("OK"));
    expect(state.screen).toBe("anmeldefenster");
    expect(state.login?.einsatzzeitMs).toBe(20 * 60_000);
  });

  // decided in "Define the key-by-screen navigation model"
  it("goes back to the choice on X at the Langzeiteinsatz question", () => {
    const state = run(aus(), hold(A1), press("Down"), press("OK"), press("X"));
    expect(state.screen).toBe("einsatzzeitWaehlen");
    expect(state.login).toMatchObject({
      einsatzzeitMs: 20 * 60_000,
      awaitingLangzeiteinsatzOk: false,
    });
  });

  // decided in "Define the key-by-screen navigation model"
  it("moves between 30 and 20 min with Up and Down", () => {
    expect(run(aus(), hold(A1), press("Down")).login?.einsatzzeitMs).toBe(
      20 * 60_000,
    );
    expect(
      run(aus(), hold(A1), press("Down"), press("Up")).login?.einsatzzeitMs,
    ).toBe(30 * 60_000);
  });

  // decided in "Define the key-by-screen navigation model"
  it("discards the login on X and returns to the Startdisplay", () => {
    const state = run(aus(), hold(A1), press("X"));
    expect(state.screen).toBe("startdisplay");
    expect(state.login).toBeNull();
  });

  // decided in "Define the key-by-screen navigation model"
  it("ignores a Tally", () => {
    const state = run(aus(), hold(A1));
    expect(reduce(state, hold(A2))).toBe(state);
  });
});

describe("the Anmeldefenster", () => {
  function anmeldefenster(): State {
    return run(aus(), hold(A1), press("OK"));
  }

  // manual 5.3 step 6
  it("adds each further Tally held to Check as an Atemschutzträger", () => {
    const state = run(anmeldefenster(), hold(A2), hold(B1));
    expect(state.login?.atemschutztraeger).toEqual([A1, A2, B1]);
  });

  // decided in "Define the key-by-screen navigation model"
  it("ignores a Tally that is already in the Trupp", () => {
    const state = run(anmeldefenster(), hold(A2));
    expect(reduce(state, hold(A1))).toBe(state);
  });

  // manual 5.3 step 6: at most six Atemschutzträger on V04
  it("ignores a seventh Atemschutzträger", () => {
    const six = run(
      anmeldefenster(),
      ...["2", "3", "4", "5", "6"].map((id) => hold({ tallyId: id, name: id })),
    );
    expect(reduce(six, hold({ tallyId: "7", name: "7" }))).toBe(six);
  });

  // decided in "Define the key-by-screen navigation model"
  it("opens the Anfangsdruck editor at 300 bar on `Trupp OK Einsatz` + OK", () => {
    const state = run(anmeldefenster(), hold(A2), press("OK"));
    expect(state.screen).toBe("anfangsdruckEditor");
    expect(state.login?.anfangsdruckBar).toBe(300);
  });

  // manual 9.1 [07]: a Trupp needs at least two Atemschutzträger; OK starts the login Daueralarm
  // instead, covered with V19
  it("does not confirm a Trupp of one", () => {
    const state = reduce(anmeldefenster(), press("OK"));
    expect(state.screen).toBe("anmeldefenster");
    expect(state.login?.atemschutztraeger).toHaveLength(1);
  });

  // decided in "Define the key-by-screen navigation model"
  it("throws the login away on X without asking", () => {
    const state = run(anmeldefenster(), hold(A2), press("X"));
    expect(state.screen).toBe("startdisplay");
    expect(state.login).toBeNull();
  });

  // decided in "Define the key-by-screen navigation model": the Truppnummer is freed
  it("gives the discarded Truppnummer to the next login", () => {
    const einsatzliste = loggedIn(aus(), [A1, A2]);
    const discarded = run(einsatzliste, hold(B1), press("OK"), press("X"));
    expect(discarded.screen).toBe("einsatzliste");
    expect(discarded.selectedTruppnummer).toBe(1);
    expect(reduce(discarded, hold(B1)).login?.truppnummer).toBe(2);
  });

  // decided in "Define the key-by-screen navigation model": the members are discarded
  it("lets a discarded Atemschutzträger start a new login", () => {
    const discarded = run(anmeldefenster(), hold(A2), press("X"));
    expect(reduce(discarded, hold(A2)).screen).toBe("einsatzzeitWaehlen");
  });
});

describe("Trupp OK Bereitschaft", () => {
  // timing-and-alarm-rules §12.1; decided in "Define the key-by-screen navigation model"
  it("logs the Trupp in, in Bereitschaft, after the Anfangsdruck", () => {
    const state = run(
      aus(),
      hold(A1),
      press("OK"),
      hold(A2),
      press("Down"),
      press("OK"),
    );
    expect(state.screen).toBe("anfangsdruckEditor");
    const einsatzliste = run(state, press("Down"), press("OK"));
    expect(einsatzliste.trupps[0]).toMatchObject({
      einsatzstatus: "bereitschaft",
      sicherheitstrupp: false,
      restzeitMs: (30 * 60_000 * 295) / 300,
    });
  });

  // timing-and-alarm-rules §4.1
  it("keeps the Restzeit while the Trupp is in Bereitschaft", () => {
    const einsatzliste = run(
      aus(),
      hold(A1),
      press("OK"),
      hold(A2),
      press("Down"),
      press("OK"),
      press("OK"),
    );
    expect(tickBy(einsatzliste, 10 * 60_000).trupps[0]?.restzeitMs).toBe(
      30 * 60_000,
    );
  });
});

describe("Sicherheitstrupp OK", () => {
  function sicherheitstrupp(): State {
    return run(
      aus(),
      hold(A1),
      press("OK"),
      hold(A2),
      press("Down"),
      press("Down"),
      press("OK"),
      press("OK"),
    );
  }

  // timing-and-alarm-rules §12.8
  it("logs a Sicherheitstrupp in, in Bereitschaft", () => {
    expect(sicherheitstrupp().trupps[0]).toMatchObject({
      einsatzstatus: "bereitschaft",
      sicherheitstrupp: true,
    });
  });

  function sicherShownAfter(
    state: State,
    realElapsedMs: number,
    speed: number,
  ): boolean {
    const later = reduce(state, {
      type: "tick",
      now: state.now + realElapsedMs * speed,
      realNow: state.realNow + realElapsedMs,
    });
    const [trupp] = later.trupps;
    if (trupp === undefined) {
      throw new Error("No Trupp logged in");
    }
    return isSicherShown(later, trupp);
  }

  // manual 5.3.1 step 4; timing-and-alarm-rules §9 (1 s / 1 s), §9.1 (real time)
  it("alternates SICHER with the Statussymbol every real second at every speed", () => {
    for (const speed of [1, 10]) {
      expect(sicherShownAfter(sicherheitstrupp(), 0, speed)).toBe(true);
      expect(sicherShownAfter(sicherheitstrupp(), 999, speed)).toBe(true);
      expect(sicherShownAfter(sicherheitstrupp(), 1_000, speed)).toBe(false);
      expect(sicherShownAfter(sicherheitstrupp(), 1_999, speed)).toBe(false);
      expect(sicherShownAfter(sicherheitstrupp(), 2_000, speed)).toBe(true);
    }
  });

  // manual 5.3.1 step 4; timing-and-alarm-rules §12.8
  it("never shows SICHER for a Trupp that is not a Sicherheitstrupp", () => {
    const bereitschaft = run(
      aus(),
      hold(A1),
      press("OK"),
      hold(A2),
      press("Down"),
      press("OK"),
      press("OK"),
    );
    expect(sicherShownAfter(bereitschaft, 0, 1)).toBe(false);
  });

  // timing-and-alarm-rules §4.1, 12.8
  it("keeps the Restzeit", () => {
    expect(tickBy(sicherheitstrupp(), 10 * 60_000).trupps[0]?.restzeitMs).toBe(
      30 * 60_000,
    );
  });
});

describe("Druck ändern on the Anmeldefenster", () => {
  function flaschendruckAendern(): State {
    return run(
      aus(),
      hold(A1),
      press("OK"),
      hold(A2),
      press("Up"),
      press("OK"),
    );
  }

  // decided in "Define the key-by-screen navigation model"
  it("opens the Flaschendruck editor at the Anfangsdruck", () => {
    const state = flaschendruckAendern();
    expect(state.screen).toBe("flaschendruckAendern");
    expect(state.login?.draftFlaschendruckBar).toBe(300);
  });

  // decided in "Define the key-by-screen navigation model"
  it("keeps the changed Flaschendruck as the Anfangsdruck on OK", () => {
    const anmeldefenster = run(
      flaschendruckAendern(),
      press("Down"),
      press("Down"),
      press("OK"),
    );
    expect(anmeldefenster.screen).toBe("anmeldefenster");
    expect(anmeldefenster.login?.anfangsdruckBar).toBe(290);
    const editor = run(
      anmeldefenster,
      press("Up"),
      press("Up"),
      press("Up"),
      press("OK"),
    );
    expect(editor.screen).toBe("anfangsdruckEditor");
    expect(editor.login?.anfangsdruckBar).toBe(290);
  });

  // decided in "Define the key-by-screen navigation model"
  it("returns unchanged on X", () => {
    const state = run(flaschendruckAendern(), press("Down"), press("X"));
    expect(state.screen).toBe("anmeldefenster");
    expect(state.login?.anfangsdruckBar).toBe(300);
  });

  // manual 9.1 [76]–[78]; timing-and-alarm-rules §1.6
  it("stays between 270 and 330 bar", () => {
    function draftAfter(key: Key): number | null | undefined {
      return run(flaschendruckAendern(), ...Array<Key>(20).fill(key).map(press))
        .login?.draftFlaschendruckBar;
    }
    expect(draftAfter("Down")).toBe(270);
    expect(draftAfter("Up")).toBe(330);
  });

  // decided in "Define the key-by-screen navigation model"
  it("ignores a Tally", () => {
    const state = flaschendruckAendern();
    expect(reduce(state, hold(B1))).toBe(state);
  });
});

describe("the Anfangsdruck editor", () => {
  function anfangsdruckEditor(): State {
    return run(aus(), hold(A1), press("OK"), hold(A2), press("OK"));
  }

  function anfangsdruckAfter(...keys: readonly Key[]): number | undefined {
    return run(anfangsdruckEditor(), ...keys.map(press)).login?.anfangsdruckBar;
  }

  // manual 9.1 [76]
  it("changes the Anfangsdruck in 5-bar steps", () => {
    expect(anfangsdruckAfter("Down")).toBe(295);
    expect(anfangsdruckAfter("Up", "Up")).toBe(310);
  });

  // verification-scenarios V2; timing-and-alarm-rules §1.6
  it("stops at 270 bar going down and at 330 bar going up", () => {
    expect(anfangsdruckAfter(...Array<Key>(20).fill("Down"))).toBe(270);
    expect(anfangsdruckAfter(...Array<Key>(20).fill("Up"))).toBe(330);
  });

  // decided in "Define the key-by-screen navigation model"
  it("returns to the Anmeldefenster on X, keeping the Atemschutzträger", () => {
    const state = run(anfangsdruckEditor(), press("Down"), press("X"));
    expect(state.screen).toBe("anmeldefenster");
    expect(state.trupps).toEqual([]);
    expect(state.login).toMatchObject({
      truppnummer: 1,
      atemschutztraeger: [A1, A2],
      anmeldeaktion: "truppOkEinsatz",
      anfangsdruckBar: 295,
    });
  });

  // decided in "Define the key-by-screen navigation model"
  it("logs the Trupp in on OK and shows it selected on the Einsatzliste", () => {
    const state = run(anfangsdruckEditor(), press("OK"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.login).toBeNull();
    expect(state.selectedTruppnummer).toBe(1);
    expect(state.trupps).toEqual([
      {
        truppnummer: 1,
        einsatzzeitMs: 30 * 60_000,
        atemschutztraeger: [A1, A2],
        einsatzstatus: "anmarsch",
        sicherheitstrupp: false,
        restzeitMs: 30 * 60_000,
        runningTimeMs: 0,
        timeInBereitschaftMs: 0,
        anmarschBeganAtRunningTimeMs: 0,
        anmarschzeitMs: null,
        rueckzugsalarmArmed: false,
        loggedInAtMs: SESSION_START.now,
      },
    ]);
  });

  // verification-scenarios V2; timing-and-alarm-rules §1.3
  it("scales the initial Restzeit by the Anfangsdruck", () => {
    function restzeitAt(...keys: readonly Key[]): number | undefined {
      return run(anfangsdruckEditor(), ...keys.map(press), press("OK"))
        .trupps[0]?.restzeitMs;
    }
    expect(restzeitAt(...Array<Key>(6).fill("Down"))).toBe(27 * 60_000);
    expect(restzeitAt(...Array<Key>(6).fill("Up"))).toBe(33 * 60_000);
  });
});

function loggedIn(
  state: State,
  atemschutztraeger: readonly { tallyId: string; name: string }[],
  ...anfangsdruckKeys: readonly Key[]
): State {
  const [first, ...rest] = atemschutztraeger;
  if (first === undefined) {
    throw new Error("A login needs a Tally");
  }
  return run(
    state,
    hold(first),
    press("OK"),
    ...rest.map(hold),
    press("OK"),
    ...anfangsdruckKeys.map(press),
    press("OK"),
  );
}

function tickBy(state: State, elapsedMs: number): State {
  return reduce(state, {
    type: "tick",
    now: state.now + elapsedMs,
    realNow: state.realNow + elapsedMs,
  });
}

describe("the Restzeit", () => {
  // timing-and-alarm-rules §1.1
  it("counts down one second per second of simulated time", () => {
    const einsatzliste = loggedIn(aus(), [A1, A2]);
    const later = reduce(einsatzliste, {
      type: "tick",
      now: einsatzliste.now + 60_000,
      realNow: einsatzliste.realNow + 6_000,
    });
    expect(later.trupps[0]?.restzeitMs).toBe(29 * 60_000);
  });

  // timing-and-alarm-rules §1.2
  it("keeps counting below zero", () => {
    const einsatzliste = loggedIn(aus(), [A1, A2]);
    expect(tickBy(einsatzliste, 31 * 60_000).trupps[0]?.restzeitMs).toBe(
      -60_000,
    );
  });

  // verification-scenarios V2
  it("reaches −0:05:00 at 32:00 after an Anfangsdruck of 270 bar", () => {
    const einsatzliste = loggedIn(
      aus(),
      [A1, A2],
      ...Array<Key>(6).fill("Down"),
    );
    expect(tickBy(einsatzliste, 32 * 60_000).trupps[0]?.restzeitMs).toBe(
      -5 * 60_000,
    );
  });

  // verification-scenarios V2
  it("reaches 17:06 at 9:54 after an Anfangsdruck of 270 bar", () => {
    const einsatzliste = loggedIn(
      aus(),
      [A1, A2],
      ...Array<Key>(6).fill("Down"),
    );
    expect(
      tickBy(einsatzliste, (9 * 60 + 54) * 1000).trupps[0]?.restzeitMs,
    ).toBe((17 * 60 + 6) * 1000);
  });

  it("does not switch the Einsatzliste to Aus", () => {
    const einsatzliste = loggedIn(aus(), [A1, A2]);
    expect(tickBy(einsatzliste, 60_000).screen).toBe("einsatzliste");
  });
});

describe("a second login", () => {
  const C1 = { tallyId: "c1", name: "LF AT-M" };

  // decided in "Define the key-by-screen navigation model"
  it("starts from the Einsatzliste with the next free Truppnummer", () => {
    const state = run(loggedIn(aus(), [A1, A2]), hold(B1));
    expect(state.screen).toBe("einsatzzeitWaehlen");
    expect(state.login?.truppnummer).toBe(2);
  });

  it("selects the new Trupp and keeps the first one running", () => {
    const first = tickBy(loggedIn(aus(), [A1, A2]), 60_000);
    const second = tickBy(loggedIn(first, [B1, C1]), 60_000);
    expect(second.selectedTruppnummer).toBe(2);
    expect(second.trupps.map((trupp) => trupp.restzeitMs)).toEqual([
      28 * 60_000,
      29 * 60_000,
    ]);
  });

  // decided in "Define the key-by-screen navigation model"
  it("is not joined by an Atemschutzträger of a running Trupp", () => {
    const anmeldefenster = run(
      loggedIn(aus(), [A1, A2]),
      hold(B1),
      press("OK"),
    );
    expect(reduce(anmeldefenster, hold(A2))).toBe(anmeldefenster);
  });

  // manual 9.1 [72]; decided in "Define the key-by-screen navigation model"
  it("is not started while six Trupps run", () => {
    const sixTrupps = [1, 2, 3, 4, 5, 6].reduce(
      (state, index) =>
        loggedIn(state, [
          { tallyId: `${String(index)}a`, name: "a" },
          { tallyId: `${String(index)}b`, name: "b" },
        ]),
      aus(),
    );
    expect(sixTrupps.trupps).toHaveLength(6);
    expect(reduce(sixTrupps, hold(B1))).toBe(sixTrupps);
  });
});

describe("a 20-min Trupp", () => {
  // timing-and-alarm-rules §1.3: Restzeit = T × P_0 / P_N
  it("starts with a Restzeit of 20 × P_0 / 300 min", () => {
    const einsatzliste = run(
      aus(),
      hold(A1),
      press("Down"),
      press("OK"),
      press("OK"),
      hold(A2),
      press("OK"),
      ...Array<Key>(6).fill("Down").map(press),
      press("OK"),
    );
    expect(einsatzliste.trupps[0]).toMatchObject({
      einsatzzeitMs: 20 * 60_000,
      restzeitMs: 18 * 60_000,
    });
  });
});

describe("the Einsatzliste", () => {
  const C1 = { tallyId: "c1", name: "c1" };
  const C2 = { tallyId: "c2", name: "c2" };
  const D1 = { tallyId: "d1", name: "d1" };

  function threeTrupps(): State {
    return loggedIn(loggedIn(loggedIn(aus(), [A1, A2]), [B1, C1]), [C2, D1]);
  }

  // decided in "Define the key-by-screen navigation model"
  it("moves the selection down through occupied rows only, wrapping", () => {
    const einsatzliste = threeTrupps();
    expect(einsatzliste.selectedTruppnummer).toBe(3);
    expect(reduce(einsatzliste, press("Down")).selectedTruppnummer).toBe(1);
    expect(
      run(einsatzliste, press("Down"), press("Down")).selectedTruppnummer,
    ).toBe(2);
    expect(reduce(einsatzliste, press("Up")).selectedTruppnummer).toBe(2);
  });

  // Until logoff exists, an empty row between Trupps is set up by hand.
  it("skips empty rows", () => {
    const three = threeTrupps();
    const gap: State = {
      ...three,
      trupps: three.trupps.filter((trupp) => trupp.truppnummer !== 2),
    };
    expect(reduce(gap, press("Up")).selectedTruppnummer).toBe(1);
    expect(run(gap, press("Up"), press("Up")).selectedTruppnummer).toBe(3);
  });

  // decided in "Define the key-by-screen navigation model"
  it("does nothing on X alone", () => {
    const einsatzliste = loggedIn(aus(), [A1, A2]);
    const state = reduce(einsatzliste, press("X"));
    expect(state.screen).toBe("einsatzliste");
    expect(state.trupps).toBe(einsatzliste.trupps);
    expect(state.selectedTruppnummer).toBe(einsatzliste.selectedTruppnummer);
  });
});
