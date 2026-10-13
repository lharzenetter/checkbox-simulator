import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Event, Key, State } from "../core/index";
import { screenModel, screenText } from "./screen-model";

// 12.04.17 11:11:00, the Uhrzeit in the Startdisplay figure (manual 5.2).
const FIGURE_UHRZEIT = Date.UTC(2017, 3, 12, 11, 11, 0);

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

const HLF_AT_F: Event = { type: "tallyHeld", tallyId: "1", name: "HLF AT-F" };
const HLF_AT_M: Event = { type: "tallyHeld", tallyId: "2", name: "HLF AT-M" };

function stateAfter(...events: readonly Event[]): State {
  return events.reduce(
    reduce,
    createInitialState({ now: FIGURE_UHRZEIT, realNow: 0 }),
  );
}

function tickBy(state: State, elapsedMs: number): State {
  return reduce(state, {
    type: "tick",
    now: state.now + elapsedMs,
    realNow: state.realNow + elapsedMs,
  });
}

// OK on S12 acknowledges the Alarm the tick fired and returns to the Einsatzliste.
function acknowledged(state: State): State {
  expect(state.screen).toBe("alarm");
  return reduce(state, press("OK"));
}

describe("S00 Aus", () => {
  // manual 5.12
  it("shows a blank display", () => {
    const model = screenModel(stateAfter());
    expect(model.layout).toBe("aus");
    expect(screenText(model)).toEqual([]);
  });
});

describe("S01 Startdisplay", () => {
  // manual 5.2, Startdisplay figure
  it("reads as in the figure", () => {
    expect(screenText(screenModel(stateAfter(press("Check"))))).toEqual([
      "FF-Musterstadt",
      "V04.02.23  #12345",
      "B1- + 88%",
      "12.04.17     11:11:00",
      "OK für SERVICE",
      "oder TALLY auflegen",
      "sonst Ende in  >  25",
    ]);
  });

  it("shows the running Uhrzeit", () => {
    const model = screenModel(tickBy(stateAfter(press("Check")), 3_000));
    expect(screenText(model)).toContain("12.04.17     11:11:03");
  });

  it("counts the Abschaltzeit down in whole seconds, rounding up", () => {
    const model = screenModel(tickBy(stateAfter(press("Check")), 15_500));
    expect(screenText(model)).toContain("sonst Ende in  >  10");
  });

  it("right-aligns a single-digit Abschaltzeit", () => {
    const model = screenModel(tickBy(stateAfter(press("Check")), 21_000));
    expect(screenText(model)).toContain("sonst Ende in  >   4");
  });
});

describe("S02 SERVICE", () => {
  // manual 5.2, SERVICE figure
  it("reads as in the figure, cursor on the first item", () => {
    const model = screenModel(stateAfter(press("Check"), press("OK")));
    expect(screenText(model)).toEqual([
      "SERVICE",
      "Einsatzprotokoll",
      "Zeit/Datum einstellen",
      "Kontrast",
      "Testprogramm",
    ]);
    expect(model).toMatchObject({ layout: "service", selectedIndex: 0 });
  });
});

describe("S03 Einsatzzeit wählen", () => {
  // manual 5.3, login figure; decided in "Define the key-by-screen navigation model"
  it("reads as in the figure with only 30 and 20 min, cursor on 30", () => {
    const model = screenModel(stateAfter(HLF_AT_F));
    expect(screenText(model)).toEqual([
      "Neuen Trupp anmelden:",
      "Wähle Einsatzzeit für",
      "Trupp Nr.: 01",
      "*HLF AT-F",
      "Einsatzzeit  30 min?",
      "Einsatzzeit  20 min?",
    ]);
    expect(model).toMatchObject({
      layout: "einsatzzeitWaehlen",
      selectedIndex: 0,
    });
  });

  // manual 5.3 step 3
  it("moves the cursor to 20 min on Down", () => {
    expect(screenModel(stateAfter(HLF_AT_F, press("Down")))).toMatchObject({
      items: ["Einsatzzeit  30 min?", "Einsatzzeit  20 min?"],
      selectedIndex: 1,
    });
  });

  // manual 5.3 step 5; decided in "Define the key-by-screen navigation model"
  it("turns the bottom line into `Langzeiteinsatz? OK` on OK at 20 min", () => {
    const model = screenModel(stateAfter(HLF_AT_F, press("Down"), press("OK")));
    expect(screenText(model)).toEqual([
      "Neuen Trupp anmelden:",
      "Wähle Einsatzzeit für",
      "Trupp Nr.: 01",
      "*HLF AT-F",
      "Einsatzzeit  30 min?",
      "Langzeiteinsatz? OK",
    ]);
    expect(model).toMatchObject({ selectedIndex: 1 });
  });
});

describe("S04 Anmeldefenster", () => {
  // manual 5.3, Anmeldefenster figure
  it("reads as in the figure, cursor on `Trupp OK Einsatz`", () => {
    const model = screenModel(stateAfter(HLF_AT_F, press("OK"), HLF_AT_M));
    expect(screenText(model)).toEqual([
      "Trupp 01   30 min",
      "*HLF AT-F",
      "*HLF AT-M",
      "Trupp OK Einsatz",
      "Trupp OK Bereitschaft",
      "Sicherheitstrupp OK",
      "Druck ändern",
    ]);
    expect(model).toMatchObject({ layout: "anmeldefenster", selectedIndex: 0 });
  });

  // manual 5.3, Anmeldefenster figure: the header carries the chosen Einsatzzeit
  it("heads a Langzeiteinsatz with its 20 min", () => {
    const model = screenModel(
      stateAfter(HLF_AT_F, press("Down"), press("OK"), press("OK")),
    );
    expect(screenText(model)[0]).toBe("Trupp 01   20 min");
  });

  // wrapping is decided for the Einsatzliste in "Define the key-by-screen navigation model";
  // the menus wrap the same way by ASSUMPTION
  it("moves the cursor with Up and Down, wrapping", () => {
    const anmeldefenster = [HLF_AT_F, press("OK"), HLF_AT_M] as const;
    expect(
      screenModel(stateAfter(...anmeldefenster, press("Down"), press("Down"))),
    ).toMatchObject({ selectedIndex: 2 });
    expect(
      screenModel(stateAfter(...anmeldefenster, press("Up"))),
    ).toMatchObject({ selectedIndex: 3 });
  });
});

describe("S08 Esz-Zeit ändern", () => {
  // manual 5.3.2, Druck ändern figure; decided in "Define the key-by-screen navigation model"
  it("reads as the Druck ändern figure, titled `Esz-Zeit ändern`", () => {
    const model = screenModel(
      stateAfter(
        HLF_AT_F,
        press("OK"),
        HLF_AT_M,
        press("Up"),
        press("OK"),
        press("Down"),
      ),
    );
    expect(screenText(model)).toEqual([
      "Esz-Zeit ändern",
      "Flasche: 300 bar",
      "Druck 295 bar",
      "Restzeit 00:29:30",
    ]);
    expect(model).toMatchObject({
      layout: "flaschendruckEditor",
      truppnummer: null,
      fillLevel: 295 / 300,
    });
  });
});

describe("S06 Anfangsdruck editor", () => {
  function anfangsdruckEditor(...keys: readonly Key[]): State {
    return stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("OK"),
      ...keys.map(press),
    );
  }

  // manual 5.3, S06 figure
  it("opens at the cylinder's 300 bar with the full Einsatzzeit", () => {
    const model = screenModel(anfangsdruckEditor());
    expect(screenText(model)).toEqual([
      "Trupp Nr.: 01",
      "Flasche: 300 bar",
      "Druck 300 bar",
      "Restzeit 00:30:00",
    ]);
    expect(model).toMatchObject({
      layout: "flaschendruckEditor",
      fillLevel: 1,
    });
  });

  // timing-and-alarm-rules §1.3; the S06 figure's 250 bar lies below the 270 bar floor (§1.6)
  it("shows the Restzeit the entered Anfangsdruck gives", () => {
    const model = screenModel(
      anfangsdruckEditor(...Array<Key>(10).fill("Down")),
    );
    expect(screenText(model)).toContain("Druck 270 bar");
    expect(screenText(model)).toContain("Restzeit 00:27:00");
  });

  it("fills the cylinder in proportion to the Flaschendruck, at most full", () => {
    expect(
      screenModel(anfangsdruckEditor("Down", "Down", "Down")),
    ).toMatchObject({ fillLevel: 285 / 300 });
    expect(screenModel(anfangsdruckEditor("Up"))).toMatchObject({
      fillLevel: 1,
    });
  });
});

describe("S07 Einsatzliste", () => {
  function einsatzliste(...keys: readonly Key[]): State {
    return stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("OK"),
      ...keys.map(press),
      press("OK"),
    );
  }

  function firstRestzeit(state: State): string | undefined {
    const model = screenModel(state);
    return model.layout === "einsatzliste"
      ? model.rows[0]?.restzeit
      : undefined;
  }

  // manual 5.3, Einsatzliste figure with one Trupp; decided in "Define the key-by-screen
  // navigation model"
  it("shows the new Trupp selected, in Anmarsch, with its Restzeit", () => {
    const model = screenModel(einsatzliste());
    expect(screenText(model)).toEqual([
      "FF-Musterstadt",
      "B1- + 11:11:00",
      "01 markiert  2× Anmarsch  00:30:00",
    ]);
    expect(model).toMatchObject({
      layout: "einsatzliste",
      rows: [
        {
          truppnummer: "01",
          selected: true,
          statussymbol: { einsatzstatus: "anmarsch", count: 2 },
          restzeit: "00:30:00",
        },
        null,
        null,
        null,
        null,
        null,
      ],
    });
  });

  // decided in "Decide what survives a page reload": the Uhrzeit runs on simulated time
  it("counts the Restzeit down and runs the Uhrzeit on", () => {
    const model = screenModel(tickBy(einsatzliste(), 61_000));
    expect(screenText(model)).toEqual([
      "FF-Musterstadt",
      "B1- + 11:12:01",
      "01 markiert  2× Anmarsch  00:28:59",
    ]);
  });

  it("shows a Restzeit in whole seconds, rounding up", () => {
    expect(firstRestzeit(tickBy(einsatzliste(), 500))).toBe("00:30:00");
  });

  // manual 5.5.3; decided in "Define the key-by-screen navigation model": `-0:00:10`
  it("drops the hour's leading digit from a negative Restzeit", () => {
    const overdue = tickBy(einsatzliste(), 30 * 60_000 + 10_000);
    expect(firstRestzeit(acknowledged(overdue))).toBe("-0:00:10");
  });

  it("shows 00:00:00, not a negative zero, within the first overdue second", () => {
    const overdue = tickBy(einsatzliste(), 30 * 60_000 + 500);
    expect(firstRestzeit(acknowledged(overdue))).toBe("00:00:00");
  });

  it("lists a second Trupp in its own row and selects it", () => {
    const state = stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("OK"),
      press("OK"),
      { type: "tallyHeld", tallyId: "5", name: "LF AT-F" },
      press("OK"),
      { type: "tallyHeld", tallyId: "6", name: "LF AT-M" },
      { type: "tallyHeld", tallyId: "7", name: "LF WT-F" },
      { type: "tallyHeld", tallyId: "8", name: "LF WT-M" },
      press("OK"),
      press("OK"),
    );
    expect(screenModel(state)).toMatchObject({
      rows: [
        { truppnummer: "01", selected: false },
        {
          truppnummer: "02",
          selected: true,
          statussymbol: { einsatzstatus: "anmarsch", count: 4 },
        },
        null,
        null,
        null,
        null,
      ],
    });
  });

  function sicherheitstrupp(): State {
    return stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("Down"),
      press("Down"),
      press("OK"),
      press("OK"),
    );
  }

  // manual 5.3.1 step 4, Einsatzliste figure item 8; timing-and-alarm-rules §9
  it("alternates SICHER with the Statussymbol of a Sicherheitstrupp every second", () => {
    expect(screenText(screenModel(sicherheitstrupp()))[2]).toBe(
      "01 markiert  SICHER  00:30:00",
    );
    expect(screenText(screenModel(tickBy(sicherheitstrupp(), 1_000)))[2]).toBe(
      "01 markiert  2× Bereitschaft  00:30:00",
    );
    expect(screenModel(tickBy(sicherheitstrupp(), 2_000))).toMatchObject({
      rows: [{ sicher: true }, null, null, null, null, null],
    });
  });

  // timing-and-alarm-rules §4.1
  it("shows a frozen Restzeit for a Trupp logged in to Bereitschaft", () => {
    const bereitschaft = stateAfter(
      HLF_AT_F,
      press("OK"),
      HLF_AT_M,
      press("Down"),
      press("OK"),
      press("Down"),
      press("OK"),
    );
    expect(screenModel(tickBy(bereitschaft, 5 * 60_000))).toMatchObject({
      rows: [
        {
          statussymbol: { einsatzstatus: "bereitschaft", count: 2 },
          sicher: false,
          restzeit: "00:29:30",
        },
        null,
        null,
        null,
        null,
        null,
      ],
    });
  });

  // timing-and-alarm-rules §4.1, 12.8
  it("shows a frozen Restzeit for a Sicherheitstrupp", () => {
    expect(firstRestzeit(tickBy(sicherheitstrupp(), 5 * 60_000))).toBe(
      "00:30:00",
    );
  });
});

describe("S13 ABMELDEN", () => {
  const TRUPP_01 = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
  ] as const;

  // manual 5.8, ABMELDEN figure
  it("reads as in the figure, with the member who held their Tally marked", () => {
    const model = screenModel(stateAfter(...TRUPP_01, HLF_AT_F));
    expect(model).toMatchObject({
      layout: "abmelden",
      atemschutztraeger: [
        { name: "*HLF AT-F", marked: true },
        { name: "*HLF AT-M", marked: false },
      ],
    });
    expect(screenText(model)).toEqual([
      "Trupp 01 ABMELDEN",
      "*HLF AT-F markiert",
      "*HLF AT-M",
      "OK  =  abmelden",
      " X  =  nicht abmelden",
    ]);
  });

  // manual 5.8 step 3
  it("marks every member who has held their Tally", () => {
    const model = screenModel(stateAfter(...TRUPP_01, HLF_AT_M, HLF_AT_F));
    expect(screenText(model).slice(1, 3)).toEqual([
      "*HLF AT-F markiert",
      "*HLF AT-M markiert",
    ]);
  });
});

describe("S11 Trupp-Ansicht", () => {
  const TRUPP_01 = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
  ] as const;

  // manual 3.2.3, Trupp-Ansicht figure; decided in "Define the key-by-screen navigation model"
  it("reads as in the figure, labelled `Ansicht`", () => {
    const model = screenModel(
      reduce(
        acknowledged(tickBy(stateAfter(...TRUPP_01), 15 * 60_000)),
        press("OK"),
      ),
    );
    expect(screenText(model)).toEqual([
      "Trupp 01 ANMARSCH",
      "*HLF AT-F",
      "*HLF AT-M",
      "Druck 150 bar",
      "Restzeit 00:15:00",
      "Ansicht",
    ]);
    expect(model).toMatchObject({ layout: "truppAnsicht", fillLevel: 0.5 });
  });

  // manual 3.2.2: the Trupp's Statussymbol, as on the Einsatzliste
  it("shows the Trupp's Statussymbol", () => {
    expect(
      screenModel(reduce(stateAfter(...TRUPP_01), press("OK"))),
    ).toMatchObject({
      statussymbol: { einsatzstatus: "anmarsch", count: 2 },
    });
  });

  // timing-and-alarm-rules §1.7: whole bar, rounded down
  it("shows the Aktueller Flaschendruck rounded down", () => {
    const model = screenModel(
      reduce(tickBy(stateAfter(...TRUPP_01), (6 * 60 + 3) * 1000), press("OK")),
    );
    expect(screenText(model)).toContain("Druck 239 bar");
  });

  // timing-and-alarm-rules §1.7: clamped at 0 once the Restzeit is negative
  it("shows 0 bar and the negative Restzeit once the Einsatzzeit is exceeded", () => {
    const model = screenModel(
      reduce(
        acknowledged(tickBy(stateAfter(...TRUPP_01), 31 * 60_000)),
        press("OK"),
      ),
    );
    expect(screenText(model)).toContain("Druck 0 bar");
    expect(screenText(model)).toContain("Restzeit -0:01:00");
    expect(model).toMatchObject({ fillLevel: 0 });
  });

  // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
  it("heads a Trupp in Bereitschaft with `BEREITSCHAFT`", () => {
    const model = screenModel(
      stateAfter(
        HLF_AT_F,
        press("OK"),
        HLF_AT_M,
        press("Down"),
        press("OK"),
        press("OK"),
        press("OK"),
      ),
    );
    expect(screenText(model)[0]).toBe("Trupp 01 BEREITSCHAFT");
  });
});

describe("S09 Trupp-Menü", () => {
  const TRUPP_MENUE = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
    press("OK"),
    press("OK"),
  ] as const;

  // manual 5.4, Trupp-Menü figure (ANMARSCH); decided in "Define the key-by-screen navigation
  // model", its Trupp-Menü table
  it("reads as the ANMARSCH figure, cursor on the first item", () => {
    const model = screenModel(stateAfter(...TRUPP_MENUE));
    expect(screenText(model)).toEqual([
      "Trupp 01 ANMARSCH",
      "*HLF AT-F",
      "*HLF AT-M",
      "Restzeit 00:30:00",
      "Trupp -> Einsatz",
      "Trupp -> Bereitschaft",
      "Einsatzziel erreicht",
      "Rückzug antreten",
    ]);
    expect(model).toMatchObject({ layout: "truppMenue", selectedIndex: 0 });
  });

  // decided in "Define the key-by-screen navigation model": the list scrolls past 4 lines
  it("scrolls to keep the cursor in view", () => {
    const model = screenModel(
      stateAfter(
        ...TRUPP_MENUE,
        ...Array.from({ length: 5 }, () => press("Down")),
      ),
    );
    expect(model).toMatchObject({
      items: [
        "Einsatzziel erreicht",
        "Rückzug antreten",
        "Druck ändern",
        "Attribute eintragen",
      ],
      selectedIndex: 3,
    });
  });

  // timing-and-alarm-rules §1.1
  it("shows the Restzeit running down", () => {
    const model = screenModel(tickBy(stateAfter(...TRUPP_MENUE), 5_000));
    expect(screenText(model)).toContain("Restzeit 00:29:55");
  });

  // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
  it("lists the Bereitschaft items under `BEREITSCHAFT`", () => {
    const model = screenModel(
      stateAfter(
        HLF_AT_F,
        press("OK"),
        HLF_AT_M,
        press("Down"),
        press("OK"),
        press("OK"),
        press("OK"),
        press("OK"),
      ),
    );
    expect(model).toMatchObject({
      title: "Trupp 01 BEREITSCHAFT",
      items: [
        "Trupp -> Einsatz",
        "Trupp -> Bereitschaft",
        "Druck ändern",
        "Attribute eintragen",
      ],
    });
  });
});

describe("S08 `Esz-Zeit ändern` from the Trupp-Menü", () => {
  // manual 5.6.4, Druck ändern figure; timing-and-alarm-rules §1.4, 1.7
  it("opens at the snapped estimate with the Restzeit it gives", () => {
    const model = screenModel(
      stateAfter(
        HLF_AT_F,
        press("OK"),
        HLF_AT_M,
        press("OK"),
        press("OK"),
        {
          type: "tick",
          now: FIGURE_UHRZEIT + (6 * 60 + 3) * 1000,
          realNow: (6 * 60 + 3) * 1000,
        },
        press("OK"),
        press("OK"),
        ...Array.from({ length: 4 }, () => press("Down")),
        press("OK"),
      ),
    );
    expect(screenText(model)).toEqual([
      "Esz-Zeit ändern",
      "Flasche: 300 bar",
      "Druck 235 bar",
      "Restzeit 00:23:30",
    ]);
    expect(model).toMatchObject({
      layout: "flaschendruckEditor",
      truppnummer: null,
    });
  });
});

describe("S12 Trupp ALARM", () => {
  const TRUPP_01 = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
  ] as const;

  // manual 5.5.3, ALARM figure; decided in "Decide how alarms are presented", point 1: no cause
  // text and no SICHER
  it("reads as in the figure at the first Alarmgrenze", () => {
    const model = screenModel(tickBy(stateAfter(...TRUPP_01), 594_000));
    expect(screenText(model)).toEqual([
      "Trupp 01 ALARM",
      "*HLF AT-F",
      "*HLF AT-M",
      "Druck 201 bar",
      "Restzeit 00:20:06",
      "Alarmende",
      "mit OK",
    ]);
    expect(model).toMatchObject({ layout: "alarm", fillLevel: 0.67 });
  });

  // manual 5.5.3, ALARM figure; timing-and-alarm-rules §1.2, 1.7
  it("shows the negative Restzeit and 0 bar while the Alarm stays unacknowledged", () => {
    const model = screenModel(
      tickBy(tickBy(stateAfter(...TRUPP_01), 30 * 60_000), 10_000),
    );
    expect(screenText(model)).toEqual([
      "Trupp 01 ALARM",
      "*HLF AT-F",
      "*HLF AT-M",
      "Druck 0 bar",
      "Restzeit -0:00:10",
      "Alarmende",
      "mit OK",
    ]);
    expect(model).toMatchObject({ fillLevel: 0 });
  });
});

describe("the Einsatzstatus screens", () => {
  const TRUPP_01 = [
    HLF_AT_F,
    press("OK"),
    HLF_AT_M,
    press("OK"),
    press("OK"),
  ] as const;

  function at(minutes: number): Event {
    return {
      type: "tick",
      now: FIGURE_UHRZEIT + minutes * 60_000,
      realNow: minutes * 60_000,
    };
  }

  // Opens the Trupp-Menü and moves down to the item.
  function truppMenueAt(downs: number): readonly Event[] {
    return [
      press("OK"),
      press("OK"),
      ...Array.from({ length: downs }, () => press("Down")),
    ];
  }

  // Einsatzziel erreicht at 5:00, accepted at 250 bar
  const EINSATZZIEL = [
    ...TRUPP_01,
    at(5),
    ...truppMenueAt(2),
    press("OK"),
    press("OK"),
  ] as const;

  // Anmarsch → Rückmarsch at 6:00, accepted at 240 bar
  const RUECKMARSCH = [
    ...TRUPP_01,
    at(6),
    ...truppMenueAt(3),
    press("OK"),
    press("OK"),
  ] as const;

  // manual 5.4 step 5, Esz-Ziel erreicht figure; decided in "Define the key-by-screen navigation
  // model", its pressure editor table
  it("titles the Einsatzziel erreicht editor `Esz-Ziel erreicht`", () => {
    const model = screenModel(
      stateAfter(...TRUPP_01, at(5), ...truppMenueAt(2), press("OK")),
    );
    expect(screenText(model)).toEqual([
      "Esz-Ziel erreicht",
      "Flasche: 300 bar",
      "Druck 250 bar",
      "Restzeit 00:25:00",
    ]);
    expect(model).toMatchObject({
      layout: "flaschendruckEditor",
      truppnummer: null,
    });
  });

  // manual 5.7; decided in "Define the key-by-screen navigation model", its pressure editor table
  it("titles the Rückzug antreten editor `Rückzug antreten`", () => {
    const model = screenModel(
      stateAfter(...TRUPP_01, at(6), ...truppMenueAt(3), press("OK")),
    );
    expect(screenText(model)[0]).toBe("Rückzug antreten");
  });

  // manual 5.6.2, Trupp-Menü figure (EINSATZ); decided in "Define the key-by-screen navigation
  // model", its Trupp-Menü table
  it("heads the Trupp-Menü at the Einsatzziel `EINSATZ` with its items", () => {
    const model = screenModel(stateAfter(...EINSATZZIEL, ...truppMenueAt(0)));
    expect(model).toMatchObject({
      layout: "truppMenue",
      title: "Trupp 01 EINSATZ",
      items: [
        "Trupp -> Einsatz",
        "Trupp -> Bereitschaft",
        "Rückzug antreten",
        "Druck ändern",
      ],
    });
  });

  // decided in "Define the key-by-screen navigation model", its Trupp-Menü table
  it("heads the Trupp-Menü in Rückmarsch `RÜCKMARSCH` with its items", () => {
    const model = screenModel(
      // the editor left the Trupp-Ansicht open, so one OK opens the Trupp-Menü
      stateAfter(...RUECKMARSCH, press("OK")),
    );
    expect(model).toMatchObject({
      layout: "truppMenue",
      title: "Trupp 01 RÜCKMARSCH",
      items: [
        "Trupp -> Einsatz",
        "Trupp -> Bereitschaft",
        "Druck ändern",
        "Attribute eintragen",
      ],
    });
  });

  // manual 5.7 step 5, RÜCKMARSCH figure; decided in "Define the key-by-screen navigation model":
  // the editor returns to the Trupp-Ansicht in RÜCKMARSCH; timing-and-alarm-rules §5.10
  it("shows the Trupp-Ansicht in `RÜCKMARSCH` without a Rückzugsdruck after Anmarsch", () => {
    const model = screenModel(stateAfter(...RUECKMARSCH));
    expect(screenText(model)).toEqual([
      "Trupp 01 RÜCKMARSCH",
      "*HLF AT-F",
      "*HLF AT-M",
      "Druck 240 bar",
      "Restzeit 00:24:00",
      "Ansicht",
    ]);
    expect(model).toMatchObject({
      statussymbol: { einsatzstatus: "rueckmarsch", count: 2 },
      rueckzugsdruck: null,
    });
  });

  // manual 3.2.3 item 9; timing-and-alarm-rules §5.7; verification scenario V7
  it("shows the Rückzugsdruck on the Trupp-Ansicht once the Einsatzziel is reached", () => {
    const model = screenModel(stateAfter(...EINSATZZIEL, press("OK")));
    expect(screenText(model)).toEqual([
      "Trupp 01 EINSATZ",
      "*HLF AT-F",
      "*HLF AT-M",
      "Druck 250 bar",
      "Restzeit 00:25:00",
      "Rückzugsdruck 150 bar",
      "Ansicht",
    ]);
    expect(model).toMatchObject({
      statussymbol: { einsatzstatus: "einsatzzielErreicht", count: 2 },
    });
  });

  // manual 3.2.3 item 9: the Anmarsch has no Anmarschzeit yet (timing-and-alarm-rules §5.13)
  it("shows no Rückzugsdruck on the Trupp-Ansicht in Anmarsch", () => {
    expect(screenModel(stateAfter(...TRUPP_01, press("OK")))).toMatchObject({
      rueckzugsdruck: null,
    });
  });

  // manual 3.2.2
  it("lists the Einsatzstatus of each Trupp on the Einsatzliste", () => {
    expect(screenText(screenModel(stateAfter(...EINSATZZIEL)))).toContain(
      "01 markiert  2× Einsatzziel erreicht  00:25:00",
    );
    expect(
      screenText(screenModel(stateAfter(...RUECKMARSCH, press("X")))),
    ).toContain("01 markiert  2× Rückmarsch  00:24:00");
  });
});
