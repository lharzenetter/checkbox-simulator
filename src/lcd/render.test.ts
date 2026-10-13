import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Einsatzstatus, Event, Key } from "../core/index";
import type { Framebuffer } from "./framebuffer";
import { LCD_HEIGHT, LCD_WIDTH, renderScreen } from "./render";
import { screenModel } from "./screen-model";
import type { ScreenModel } from "./screen-model";

// 12.04.17 11:11:00, the Uhrzeit in the Startdisplay figure (manual 5.2).
const FIGURE_UHRZEIT = Date.UTC(2017, 3, 12, 11, 11, 0);

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

const HLF_AT_F: Event = { type: "tallyHeld", tallyId: "1", name: "HLF AT-F" };
const HLF_AT_M: Event = { type: "tallyHeld", tallyId: "2", name: "HLF AT-M" };
const LOGIN = [HLF_AT_F, press("OK"), HLF_AT_M, press("OK")] as const;

function framebufferAfter(...events: readonly Event[]): Framebuffer {
  const state = events.reduce(
    reduce,
    createInitialState({ now: FIGURE_UHRZEIT, realNow: 0 }),
  );
  return renderScreen(screenModel(state));
}

function toAscii(framebuffer: Framebuffer): string {
  const rows: string[] = [];
  for (let y = 0; y < framebuffer.height; y++) {
    let row = "";
    for (let x = 0; x < framebuffer.width; x++) {
      row += framebuffer.pixels[y * framebuffer.width + x] === 1 ? "#" : ".";
    }
    rows.push(row);
  }
  return `\n${rows.join("\n")}\n`;
}

describe("the LCD framebuffer", () => {
  it("is about 128 × 128 pixels", () => {
    const framebuffer = framebufferAfter();
    expect([framebuffer.width, framebuffer.height]).toEqual([
      LCD_WIDTH,
      LCD_HEIGHT,
    ]);
    expect(framebuffer.pixels).toHaveLength(128 * 128);
  });

  // manual 5.12
  it("is blank while the Checkbox is Aus", () => {
    const framebuffer = framebufferAfter();
    expect(framebuffer.pixels.every((pixel) => pixel === 0)).toBe(true);
    expect(toAscii(framebuffer)).toMatchSnapshot();
  });

  // manual 5.2, Startdisplay figure
  it("draws the Startdisplay", () => {
    expect(toAscii(framebufferAfter(press("Check")))).toMatchSnapshot();
  });

  // manual 5.2, SERVICE figure
  it("draws the SERVICE menu", () => {
    expect(
      toAscii(framebufferAfter(press("Check"), press("OK"))),
    ).toMatchSnapshot();
  });

  // manual 5.3, login figure
  it("draws Einsatzzeit wählen", () => {
    expect(toAscii(framebufferAfter(HLF_AT_F))).toMatchSnapshot();
  });

  // manual 5.3, Anmeldefenster figure
  it("draws the Anmeldefenster", () => {
    expect(
      toAscii(framebufferAfter(HLF_AT_F, press("OK"), HLF_AT_M)),
    ).toMatchSnapshot();
  });

  // manual 5.3, S06 figure; its 250 bar lies below the 270 bar floor, so this draws 270
  it("draws the Anfangsdruck editor", () => {
    const tenStepsDown = Array.from({ length: 10 }, () => press("Down"));
    expect(
      toAscii(framebufferAfter(...LOGIN, ...tenStepsDown)),
    ).toMatchSnapshot();
  });

  // manual 5.3, Einsatzliste figure with one Trupp
  it("draws the Einsatzliste with one Trupp in Anmarsch", () => {
    expect(toAscii(framebufferAfter(...LOGIN, press("OK")))).toMatchSnapshot();
  });

  // manual 3.2.2: more than three Atemschutzträger show as a count
  it("draws the Einsatzliste with a second Trupp of four", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          { type: "tallyHeld", tallyId: "5", name: "LF AT-F" },
          press("OK"),
          { type: "tallyHeld", tallyId: "6", name: "LF AT-M" },
          { type: "tallyHeld", tallyId: "7", name: "LF WT-F" },
          { type: "tallyHeld", tallyId: "8", name: "LF WT-M" },
          press("OK"),
          press("OK"),
          {
            type: "tick",
            now: FIGURE_UHRZEIT + 31 * 60_000,
            realNow: 31 * 60_000,
          },
          // one OK per Trupp acknowledges the Alarms the tick fired
          press("OK"),
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.3.2, Druck ändern figure
  it("draws Esz-Zeit ändern", () => {
    expect(
      toAscii(
        framebufferAfter(
          HLF_AT_F,
          press("OK"),
          HLF_AT_M,
          press("Up"),
          press("OK"),
          ...Array.from({ length: 10 }, () => press("Down")),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 3.2.2: Bereitschaft (G, K) and SICHER, with the Sicherheitstrupp in its SICHER phase
  it("draws the Einsatzliste with Trupps in Bereitschaft and a Sicherheitstrupp", () => {
    expect(
      toAscii(
        framebufferAfter(
          HLF_AT_F,
          press("OK"),
          HLF_AT_M,
          press("Down"),
          press("OK"),
          press("OK"),
          { type: "tallyHeld", tallyId: "5", name: "LF AT-F" },
          press("OK"),
          { type: "tallyHeld", tallyId: "6", name: "LF AT-M" },
          { type: "tallyHeld", tallyId: "7", name: "LF WT-F" },
          { type: "tallyHeld", tallyId: "8", name: "LF WT-M" },
          press("Down"),
          press("OK"),
          press("OK"),
          { type: "tallyHeld", tallyId: "3", name: "HLF WT-F" },
          press("OK"),
          { type: "tallyHeld", tallyId: "4", name: "HLF WT-M" },
          press("Down"),
          press("Down"),
          press("OK"),
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.8, ABMELDEN figure: the member who held their Tally is drawn inverse
  it("draws ABMELDEN with one member marked", () => {
    expect(
      toAscii(framebufferAfter(...LOGIN, press("OK"), HLF_AT_F)),
    ).toMatchSnapshot();
  });

  // manual 3.2.3, Trupp-Ansicht figure, at its 00:16:00
  it("draws the Trupp-Ansicht", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          {
            type: "tick",
            now: FIGURE_UHRZEIT + 14 * 60_000,
            realNow: 14 * 60_000,
          },
          // acknowledges the first Alarmgrenze's Alarm
          press("OK"),
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 3.2.3; issue #40: the widest Statussymbol, three in Bereitschaft, clears the names
  it("draws the Trupp-Ansicht of a Trupp of three in Bereitschaft", () => {
    expect(
      toAscii(
        framebufferAfter(
          HLF_AT_F,
          press("OK"),
          HLF_AT_M,
          { type: "tallyHeld", tallyId: "3", name: "HLF WT-F" },
          press("Down"),
          press("OK"),
          press("OK"),
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.4, Trupp-Menü figure (ANMARSCH)
  it("draws the Trupp-Menü of a Trupp in Anmarsch", () => {
    expect(
      toAscii(
        framebufferAfter(...LOGIN, press("OK"), press("OK"), press("OK")),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.6.4, Druck ändern figure, opened from the Trupp-Menü
  it("draws Esz-Zeit ändern from the Trupp-Menü", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          {
            type: "tick",
            now: FIGURE_UHRZEIT + 5 * 60_000,
            realNow: 5 * 60_000,
          },
          press("OK"),
          press("OK"),
          ...Array.from({ length: 4 }, () => press("Down")),
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.5.3, ALARM figure, at its -00:00:10
  it("draws S12 Trupp ALARM with a negative Restzeit", () => {
    expect(
      toAscii(
        framebufferAfter(...LOGIN, press("OK"), {
          type: "tick",
          now: FIGURE_UHRZEIT + 30 * 60_000 + 10_000,
          realNow: 30 * 60_000 + 10_000,
        }),
      ),
    ).toMatchSnapshot();
  });

  // manual 3.2.2: Einsatzziel erreicht (H, L) and Rückmarsch (I, M)
  it("draws the Einsatzliste with Trupps at their Einsatzziel and in Rückmarsch", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          ...TO_EINSATZZIEL,
          { type: "tallyHeld", tallyId: "5", name: "LF AT-F" },
          press("OK"),
          { type: "tallyHeld", tallyId: "6", name: "LF AT-M" },
          { type: "tallyHeld", tallyId: "7", name: "LF WT-F" },
          { type: "tallyHeld", tallyId: "8", name: "LF WT-M" },
          press("OK"),
          press("OK"),
          ...TO_EINSATZZIEL,
          { type: "tallyHeld", tallyId: "3", name: "HLF WT-F" },
          press("OK"),
          { type: "tallyHeld", tallyId: "4", name: "HLF WT-M" },
          press("OK"),
          press("OK"),
          ...TO_RUECKMARSCH,
          press("X"),
          { type: "tallyHeld", tallyId: "9", name: "TLF AT-F" },
          press("OK"),
          { type: "tallyHeld", tallyId: "10", name: "TLF AT-M" },
          { type: "tallyHeld", tallyId: "11", name: "TLF WT-F" },
          { type: "tallyHeld", tallyId: "12", name: "TLF WT-M" },
          press("OK"),
          press("OK"),
          ...TO_RUECKMARSCH,
          press("X"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 3.2.3, Trupp-Ansicht figure, with its Rückzugsdruck (item 9)
  it("draws the Trupp-Ansicht at the Einsatzziel with the Rückzugsdruck", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          {
            type: "tick",
            now: FIGURE_UHRZEIT + 5 * 60_000,
            realNow: 5 * 60_000,
          },
          ...TO_EINSATZZIEL,
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.7 step 5, RÜCKMARSCH figure
  it("draws the Trupp-Ansicht in RÜCKMARSCH", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          {
            type: "tick",
            now: FIGURE_UHRZEIT + 5 * 60_000,
            realNow: 5 * 60_000,
          },
          ...TO_EINSATZZIEL,
          press("OK"),
          press("OK"),
          press("Down"),
          press("Down"),
          press("OK"),
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.6.2, Trupp-Menü figure (EINSATZ)
  it("draws the Trupp-Menü of a Trupp at its Einsatzziel", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          ...TO_EINSATZZIEL,
          press("OK"),
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.4 step 5, Esz-Ziel erreicht figure
  it("draws Esz-Ziel erreicht", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          press("OK"),
          press("OK"),
          press("Down"),
          press("Down"),
          press("OK"),
          press("Down"),
        ),
      ),
    ).toMatchSnapshot();
  });

  // manual 5.9 step 2, right figure, with the inverse bar on the marked Trupp
  it("draws Notausschaltung – Auswahl", () => {
    expect(
      toAscii(framebufferAfter(...LOGIN, press("OK"), ...NOTAUSSCHALTUNG)),
    ).toMatchSnapshot();
  });

  // manual 5.9 step 4, left figure
  it("draws Notausschaltung – Bestätigung", () => {
    expect(
      toAscii(
        framebufferAfter(
          ...LOGIN,
          press("OK"),
          ...NOTAUSSCHALTUNG,
          press("OK"),
        ),
      ),
    ).toMatchSnapshot();
  });
});

// The core logs in Trupps of two or more, so the rows are set on the screen model to reach every
// layout.
function einsatzlisteWith(
  einsatzstatus: Einsatzstatus,
  counts: readonly number[],
): ScreenModel {
  const model = screenModel(
    [...LOGIN, press("OK")].reduce(
      reduce,
      createInitialState({ now: FIGURE_UHRZEIT, realNow: 0 }),
    ),
  );
  if (model.layout !== "einsatzliste") {
    throw new Error(`expected the Einsatzliste, got ${model.layout}`);
  }
  return {
    ...model,
    rows: counts.map((count, index) => ({
      truppnummer: `0${String(index + 1)}`,
      selected: false,
      sicher: false,
      statussymbol: { einsatzstatus, count },
      restzeit: "00:30:00",
    })),
  };
}

// manual 3.2.2, F–M, at one, two and three Atemschutzträger and the form for more than three
describe("every Statussymbol layout", () => {
  it.each([
    ["Bereitschaft", "bereitschaft"],
    ["Anmarsch", "anmarsch"],
    // issue #40: the house holds at most two Atemschutzträger
    ["Einsatzziel erreicht", "einsatzzielErreicht"],
    ["Rückmarsch", "rueckmarsch"],
  ] as const)("draws %s", (_, einsatzstatus) => {
    expect(
      toAscii(renderScreen(einsatzlisteWith(einsatzstatus, [1, 2, 3, 4]))),
    ).toMatchSnapshot();
  });
});

// The core keeps a Trupp's Flaschendruck within its cylinder, so the fill level is set on the
// screen model to reach both limits.
function truppAnsichtWith(fillLevel: number): ScreenModel {
  const model = screenModel(
    [...LOGIN, press("OK"), press("OK")].reduce(
      reduce,
      createInitialState({ now: FIGURE_UHRZEIT, realNow: 0 }),
    ),
  );
  if (model.layout !== "truppAnsicht") {
    throw new Error(`expected the Trupp-Ansicht, got ${model.layout}`);
  }
  return { ...model, fillLevel };
}

// manual 3.2.3; issue #41: the shoulder and base stay solid at both fill limits
describe("the Trupp-Ansicht's cylinder", () => {
  // manual 5.5.3, p. 24: the body is empty
  it("draws an empty cylinder", () => {
    expect(toAscii(renderScreen(truppAnsichtWith(0)))).toMatchSnapshot();
  });

  // manual 5.4, p. 22: the dither reaches the shoulder
  it("draws a full cylinder", () => {
    expect(toAscii(renderScreen(truppAnsichtWith(1)))).toMatchSnapshot();
  });
});

// X and Check held together on the Einsatzliste for 4 s (manual 5.9 step 2).
const NOTAUSSCHALTUNG: readonly Event[] = [
  press("X"),
  press("Check"),
  { type: "tick", now: FIGURE_UHRZEIT + 4_000, realNow: 4_000 },
];

// From the Einsatzliste: Trupp-Ansicht, Trupp-Menü, `Einsatzziel erreicht`, accept.
const TO_EINSATZZIEL = [
  press("OK"),
  press("OK"),
  press("Down"),
  press("Down"),
  press("OK"),
  press("OK"),
] as const;

// From the Einsatzliste: Trupp-Ansicht, Trupp-Menü, `Rückzug antreten`, accept; it ends on the
// Trupp-Ansicht.
const TO_RUECKMARSCH = [
  press("OK"),
  press("OK"),
  press("Down"),
  press("Down"),
  press("Down"),
  press("OK"),
  press("OK"),
] as const;
