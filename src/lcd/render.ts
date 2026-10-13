import { assertNever } from "../core/index";
import { CHARACTER_PITCH } from "./font";
import {
  createFramebuffer,
  drawBitmap,
  drawCenteredText,
  drawRightAlignedText,
  drawText,
  fillRect,
  setPixel,
  strokeRect,
  textWidth,
} from "./framebuffer";
import type { Framebuffer } from "./framebuffer";
import { SICHER } from "./screen-model";
import type { ScreenModel, TimeSplit } from "./screen-model";
import { drawStatussymbol, statussymbolWidth } from "./statussymbol";

// Estimated from the manual's figures (LCD screen catalogue, "Character grid").
/** The LCD's width in pixels. */
export const LCD_WIDTH = 128;
/** The LCD's height in pixels. */
export const LCD_HEIGHT = 128;

const LINE_PITCH = 10;

/** Draws a screen model into a fresh 1-bit framebuffer. */
export function renderScreen(model: ScreenModel): Framebuffer {
  const framebuffer = createFramebuffer(LCD_WIDTH, LCD_HEIGHT);
  switch (model.layout) {
    case "aus":
      break;
    case "startdisplay":
      drawStartdisplay(framebuffer, model);
      break;
    case "service":
      drawService(framebuffer, model);
      break;
    case "einsatzzeitWaehlen":
      drawMenuScreen(
        framebuffer,
        model.title,
        model.items,
        model.selectedIndex,
      );
      drawLines(framebuffer, model.prompt, 14);
      drawLines(framebuffer, model.atemschutztraeger, 36);
      break;
    case "anmeldefenster":
      drawMenuScreen(
        framebuffer,
        model.title,
        model.items,
        model.selectedIndex,
      );
      drawLines(framebuffer, model.atemschutztraeger, 14);
      break;
    case "flaschendruckEditor":
      drawFlaschendruckEditor(framebuffer, model);
      break;
    case "einsatzliste":
      drawEinsatzliste(framebuffer, model);
      break;
    case "truppAnsicht":
      drawTruppAnsicht(framebuffer, model);
      break;
    case "truppMenue":
      drawTruppMenue(framebuffer, model);
      break;
    case "alarm":
      drawAlarm(framebuffer, model);
      break;
    case "abmelden":
      drawAbmelden(framebuffer, model);
      break;
    case "notausschaltungAuswahl":
      drawNotausschaltungAuswahl(framebuffer, model);
      break;
    case "notausschaltungBestaetigung":
      drawNotausschaltungBestaetigung(framebuffer, model);
      break;
    default:
      assertNever(model);
  }
  return framebuffer;
}

function drawStartdisplay(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "startdisplay" }>,
): void {
  drawCenteredText(framebuffer, model.feuerwehrname, 2);
  drawDoubleFrame(framebuffer, 12, 41);
  drawLogo(framebuffer, 19);
  drawCenteredText(framebuffer, model.versionszeile, 38);
  drawBatteryLine(framebuffer, model, 57);
  drawText(framebuffer, model.datumUhrzeit, 1, 68);
  fillRect(framebuffer, 0, 78, LCD_WIDTH, 1);
  model.hinweis.forEach((line, index) => {
    drawText(framebuffer, line, 1, 82 + index * LINE_PITCH);
  });
  drawText(framebuffer, model.abschaltzeitzeile, 1, 82 + 2 * LINE_PITCH + 2);
}

function drawService(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "service" }>,
): void {
  drawDoubleFrame(framebuffer, 1, 30);
  drawCenteredText(framebuffer, model.title, 13);
  model.items.forEach((item, index) => {
    const y = 36 + index * LINE_PITCH;
    const selected = index === model.selectedIndex;
    // The SERVICE figure's bar ends just after the item's text (manual 5.2).
    if (selected) {
      fillRect(framebuffer, 0, y - 1, textWidth(item) + 3, LINE_PITCH);
    }
    drawText(framebuffer, item, 1, y, { inverse: selected });
  });
}

// The login screens of manual 5.3: a title over a rule, a body, and the choices below a second
// rule with a full-width selection bar, as the figures draw it.
const MENU_RULE_Y = 77;

function drawMenuScreen(
  framebuffer: Framebuffer,
  title: string,
  items: readonly string[],
  selectedIndex: number,
): void {
  drawText(framebuffer, title, 1, 2);
  fillRect(framebuffer, 0, 11, LCD_WIDTH, 1);
  fillRect(framebuffer, 0, MENU_RULE_Y, LCD_WIDTH, 1);
  items.forEach((item, index) => {
    const y = MENU_RULE_Y + 4 + index * LINE_PITCH;
    const selected = index === selectedIndex;
    if (selected) {
      fillRect(framebuffer, 0, y - 1, LCD_WIDTH, LINE_PITCH);
    }
    drawText(framebuffer, item, 1, y, { inverse: selected });
  });
}

// Laid out after the ABMELDEN figure (manual 5.8): names under the title, marked ones on an
// inverse bar, and the key legend below a rule at the bottom.
function drawAbmelden(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "abmelden" }>,
): void {
  drawText(framebuffer, model.title, 1, 2);
  model.atemschutztraeger.forEach((row, index) => {
    const y = 13 + index * LINE_PITCH;
    if (row.marked) {
      fillRect(framebuffer, 0, y - 1, LCD_WIDTH, LINE_PITCH);
    }
    drawText(framebuffer, row.name, 1, y, { inverse: row.marked });
  });
  fillRect(framebuffer, 0, 99, LCD_WIDTH, 1);
  drawLines(framebuffer, model.hinweis, 104);
}

// Laid out after the Notausschaltung – Auswahl figure (manual 5.9 step 2): the title on an inverse
// band, the prompt below it and the three choices further down, with a full-width selection bar
// (decided in "Define the key-by-screen navigation model").
// ASSUMPTION: `->` is drawn as one arrow cell, so `-> markierten Trupp 01` fits the 21 columns as
// the figure squeezes it in (LCD screen catalogue, S14, "Character grid"); the screen model keeps
// the device's text.
const NOTAUSSCHALTUNG_ITEMS_Y = 72;

const ARROW = ["..#..", "...#.", "#####", "...#.", "..#.."];

function drawNotausschaltungAuswahl(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "notausschaltungAuswahl" }>,
): void {
  fillRect(framebuffer, 0, 8, LCD_WIDTH, 12);
  drawText(
    framebuffer,
    model.title,
    Math.floor((LCD_WIDTH - textWidth(model.title)) / 2),
    10,
    { inverse: true },
  );
  drawLines(framebuffer, model.prompt, 30);
  model.items.forEach((item, index) => {
    const y = NOTAUSSCHALTUNG_ITEMS_Y + index * LINE_PITCH;
    const selected = index === model.selectedIndex;
    if (selected) {
      fillRect(framebuffer, 0, y - 1, LCD_WIDTH, LINE_PITCH);
    }
    drawArrow(framebuffer, 1, y + 1, selected);
    drawText(framebuffer, item.replace(/^->/, ""), 1 + CHARACTER_PITCH, y, {
      inverse: selected,
    });
  });
}

function drawArrow(
  framebuffer: Framebuffer,
  x: number,
  y: number,
  inverse: boolean,
): void {
  ARROW.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      if (row.charAt(column) === "#") {
        setPixel(framebuffer, x + column, y + rowIndex, !inverse);
      }
    }
  });
}

// Laid out after the Notausschaltung – Bestätigung figure (manual 5.9 step 4): the centred title
// over a rule, the centred question, and the key hints left-aligned below.
function drawNotausschaltungBestaetigung(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "notausschaltungBestaetigung" }>,
): void {
  drawCenteredText(framebuffer, model.title, 10);
  fillRect(framebuffer, 0, 23, LCD_WIDTH, 1);
  model.frage.forEach((line, index) => {
    drawCenteredText(framebuffer, line, 31 + index * LINE_PITCH);
  });
  drawText(framebuffer, model.bestaetigen, 1, 72);
  drawLines(framebuffer, model.abbrechen, 92);
}

// Laid out after the Trupp-Menü figures (manual 5.4, 5.6.2): names under the title, the Restzeit
// between two rules, and four item lines at the bottom with a full-width selection bar.
const TRUPP_MENUE_ITEMS_Y = LCD_HEIGHT - 4 * LINE_PITCH;

function drawTruppMenue(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "truppMenue" }>,
): void {
  drawText(framebuffer, model.title, 1, 2);
  drawLines(framebuffer, model.atemschutztraeger, 13);
  const restzeitY = TRUPP_MENUE_ITEMS_Y - 12;
  fillRect(framebuffer, 0, restzeitY - 3, LCD_WIDTH, 1);
  drawBitmap(framebuffer, CLOCK, 1, restzeitY);
  drawText(framebuffer, model.restzeit, 13, restzeitY);
  fillRect(framebuffer, 0, TRUPP_MENUE_ITEMS_Y - 3, LCD_WIDTH, 1);
  model.items.forEach((item, index) => {
    const y = TRUPP_MENUE_ITEMS_Y + index * LINE_PITCH;
    const selected = index === model.selectedIndex;
    if (selected) {
      fillRect(framebuffer, 0, y - 1, LCD_WIDTH, LINE_PITCH);
    }
    drawText(framebuffer, item, 1, y, { inverse: selected });
  });
}

// Laid out after the Trupp-Ansicht figure (manual 3.2.3): the S06 cylinder and time-split bar on
// the left, the values on the right of a divider, and the `Ansicht` button at the bottom.
const ANSICHT_DIVIDER_X = 64;

// manual 3.2.3: the `Ansicht` button spans the value boxes' columns and ends level with the
// cylinder's base, set in from the divider, the right edge and the bottom.
// ASSUMPTION: a 1 px light gap between the frame and the inverse bar, which the figure is too
// coarse to show, and a bar one row taller than the figure's, for our taller font (issue #42).
const ANSICHT_BUTTON_X = ANSICHT_DIVIDER_X + 2;
const ANSICHT_BUTTON_WIDTH = 58;
const ANSICHT_BUTTON_HEIGHT = 13;

function drawTruppAnsicht(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "truppAnsicht" }>,
): void {
  drawTruppPanels(framebuffer, model);
  // ASSUMPTION: the Statussymbol, which the figure does not draw, sits right of the names, as
  // issue #30 asks, leaving its box to the Rückzugsdruck (manual 3.2.3 item 9).
  drawStatussymbol(
    framebuffer,
    model.statussymbol,
    LCD_WIDTH - 1 - statussymbolWidth(model.statussymbol),
    17,
  );
  drawAnsichtButton(framebuffer, model.label);
}

// The selected soft-key label: an inverse bar inside a frame (manual 3.2.3).
function drawAnsichtButton(framebuffer: Framebuffer, label: string): void {
  const top = CYLINDER_Y + CYLINDER.length - ANSICHT_BUTTON_HEIGHT;
  strokeRect(
    framebuffer,
    ANSICHT_BUTTON_X,
    top,
    ANSICHT_BUTTON_WIDTH,
    ANSICHT_BUTTON_HEIGHT,
  );
  const barWidth = ANSICHT_BUTTON_WIDTH - 4;
  fillRect(
    framebuffer,
    ANSICHT_BUTTON_X + 2,
    top + 2,
    barWidth,
    ANSICHT_BUTTON_HEIGHT - 4,
  );
  drawText(
    framebuffer,
    label,
    ANSICHT_BUTTON_X + 2 + Math.floor((barWidth - textWidth(label)) / 2),
    top + 3,
    { inverse: true },
  );
}

// Laid out after the ALARM figure (manual 5.5.3): the Trupp-Ansicht with `Alarmende mit OK` in
// place of the `Ansicht` label.
function drawAlarm(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "alarm" }>,
): void {
  drawTruppPanels(framebuffer, model);
  model.prompt.forEach((line, index) => {
    drawText(
      framebuffer,
      line,
      Math.floor((ANSICHT_DIVIDER_X + 1 + LCD_WIDTH - textWidth(line)) / 2),
      107 + index * LINE_PITCH,
    );
  });
}

// Traced from the Trupp-Ansicht and ALARM figures (manual 3.2.3, 5.5.3, 5.7), on the figures'
// columns.
// ASSUMPTION: where the trace wavered by a pixel the shape was made symmetric (issue #41).
const FLASCHE = [
  "..##..",
  "..##..",
  ".####.",
  "######",
  "######",
  "######",
  "######",
  "######",
  "######",
  "######",
  ".####.",
];

// The device's clock is square, so it keeps its 11th row (issue #41).
const RESTZEIT_CLOCK = [
  "....###....",
  "..##.####..",
  ".#...#####.",
  ".#...#####.",
  "#....######",
  "#....######",
  "#.....#####",
  ".#.....###.",
  ".#......##.",
  "..##...##..",
  "....###....",
];

// The ↓↑ over the time-split bar and over the Rückzugsdruck box.
const RUECKZUG_ARROWS = [
  "..#....#..",
  "..#...###.",
  "..#..#####",
  "..#....#..",
  "..#....#..",
  "..#....#..",
  "#####..#..",
  ".###...#..",
  "..#....#..",
];

// The Flaschendruck box is one row higher and the Restzeit box two rows lower than the figures'
// rows, to fit the gap under the clock (issue #42).
const FLASCHENDRUCK_BOX_Y = 48;
const RESTZEIT_BOX_Y = 73;
const RUECKZUGSDRUCK_BOX_Y = 94;

// The parts the Trupp-Ansicht and ALARM figures share (manual 3.2.3, 5.5.3).
function drawTruppPanels(
  framebuffer: Framebuffer,
  model: {
    readonly title: string;
    readonly atemschutztraeger: readonly string[];
    readonly flaschendruck: string;
    readonly restzeit: string;
    readonly fillLevel: number;
    readonly rueckzugsdruck: string | null;
    readonly timeSplit: TimeSplit | null;
  },
): void {
  drawText(framebuffer, model.title, 1, 2);
  fillRect(framebuffer, 0, 11, LCD_WIDTH, 1);
  // ASSUMPTION: only the two names the figure has room for are drawn; a larger Trupp's further
  // Atemschutzträger are left off (LCD screen catalogue, S11).
  drawLines(framebuffer, model.atemschutztraeger.slice(0, 2), 13);
  fillRect(framebuffer, 0, 32, LCD_WIDTH, 1);
  fillRect(framebuffer, ANSICHT_DIVIDER_X, 33, 1, LCD_HEIGHT - 33);
  drawCylinder(framebuffer, model.fillLevel);
  drawTimeSplitBar(framebuffer, model.timeSplit);
  drawBitmap(framebuffer, RUECKZUG_ARROWS, 4, 41);
  drawValueBox(framebuffer, model.flaschendruck, FLASCHENDRUCK_BOX_Y);
  drawPictogramOnBox(framebuffer, FLASCHE, 95, FLASCHENDRUCK_BOX_Y);
  drawValueBox(framebuffer, model.restzeit, RESTZEIT_BOX_Y);
  // manual 3.2.3: a blank row separates the clock from the box, whose border stays closed
  drawBitmap(
    framebuffer,
    RESTZEIT_CLOCK,
    92,
    RESTZEIT_BOX_Y - RESTZEIT_CLOCK.length - 1,
  );
  // manual 3.2.3 item 9, 5.5.3: the box is drawn empty until there is a Rückzugsdruck
  drawValueBox(framebuffer, model.rueckzugsdruck ?? "", RUECKZUGSDRUCK_BOX_Y);
  drawPictogramOnBox(framebuffer, RUECKZUG_ARROWS, 93, RUECKZUGSDRUCK_BOX_Y);
}

// The pictogram's bottom row sits on the box's top border, which is left open 2 px either side
// of it (manual 3.2.3, 5.5.3, 5.7).
function drawPictogramOnBox(
  framebuffer: Framebuffer,
  pictogram: readonly string[],
  x: number,
  boxY: number,
): void {
  const width = pictogram[0]?.length ?? 0;
  fillRect(framebuffer, x - 2, boxY, width + 4, 1, false);
  drawBitmap(framebuffer, pictogram, x, boxY - pictogram.length + 1);
}

function drawLines(
  framebuffer: Framebuffer,
  lines: readonly string[],
  y: number,
): void {
  lines.forEach((line, index) => {
    drawText(framebuffer, line, 1, y + index * LINE_PITCH);
  });
}

// Laid out after the S06 figure (manual 5.3).
const VALUE_BOX_X = 66;
// ASSUMPTION: the box keeps its 58 px, wider than the figures' 53 px, because our font is wider
// than the device's and a negative Restzeit such as `-00:00:10` must still fit (issue #41).
const VALUE_BOX_WIDTH = 58;
const VALUE_BOX_HEIGHT = 11;

function drawFlaschendruckEditor(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "flaschendruckEditor" }>,
): void {
  const right = VALUE_BOX_X + VALUE_BOX_WIDTH - 4;
  if (model.truppnummer === null) {
    drawCenteredText(framebuffer, model.title, 6);
  } else {
    drawText(framebuffer, model.title, 8, 6);
    drawRightAlignedText(framebuffer, model.truppnummer, right, 6);
  }
  drawText(framebuffer, "Flasche:", 8, 25);
  drawValueBox(framebuffer, model.cylinder, 23);
  drawRightAlignedText(framebuffer, "Druck", right, 50);
  drawValueBox(framebuffer, model.flaschendruck, 61);
  drawRightAlignedText(framebuffer, "Restzeit", right, 84);
  drawValueBox(framebuffer, model.restzeit, 95);
  drawCylinder(framebuffer, model.fillLevel);
  // manual 5.3: the editor's figure draws the bar empty
  drawTimeSplitBar(framebuffer, null);
}

// manual 3.2.3 items 3–5
const TIME_SPLIT_BAR_X = 7;
const TIME_SPLIT_BAR_Y = 52;
const TIME_SPLIT_BAR_WIDTH = 6;
const TIME_SPLIT_BAR_HEIGHT = 68;

// Field ③ fills from the top and field ⑤ from the bottom; field ④ is the white remainder.
function drawTimeSplitBar(
  framebuffer: Framebuffer,
  timeSplit: TimeSplit | null,
): void {
  strokeRect(
    framebuffer,
    TIME_SPLIT_BAR_X,
    TIME_SPLIT_BAR_Y,
    TIME_SPLIT_BAR_WIDTH,
    TIME_SPLIT_BAR_HEIGHT,
  );
  if (timeSplit === null) {
    return;
  }
  const innerTop = TIME_SPLIT_BAR_Y + 1;
  const innerHeight = TIME_SPLIT_BAR_HEIGHT - 2;
  // Both edges are rounded from the top, so fields that meet fill the inside exactly.
  const anmarschRows = Math.round(innerHeight * timeSplit.anmarschzeitShare);
  const rueckmarschTop = Math.max(
    anmarschRows,
    Math.round(innerHeight * (1 - timeSplit.rueckmarschzeitShare)),
  );
  fillRect(
    framebuffer,
    TIME_SPLIT_BAR_X + 1,
    innerTop,
    TIME_SPLIT_BAR_WIDTH - 2,
    anmarschRows,
  );
  fillRect(
    framebuffer,
    TIME_SPLIT_BAR_X + 1,
    innerTop + rueckmarschTop,
    TIME_SPLIT_BAR_WIDTH - 2,
    innerHeight - rueckmarschTop,
  );
}

// The box casts a 1 px drop shadow down and to the right (manual 3.2.3, 5.4, 5.5.3, 5.7).
function drawValueBox(framebuffer: Framebuffer, text: string, y: number): void {
  strokeRect(framebuffer, VALUE_BOX_X, y, VALUE_BOX_WIDTH, VALUE_BOX_HEIGHT);
  fillRect(
    framebuffer,
    VALUE_BOX_X + VALUE_BOX_WIDTH,
    y + 1,
    1,
    VALUE_BOX_HEIGHT,
  );
  fillRect(
    framebuffer,
    VALUE_BOX_X + 1,
    y + VALUE_BOX_HEIGHT,
    VALUE_BOX_WIDTH,
    1,
  );
  drawRightAlignedText(
    framebuffer,
    text,
    VALUE_BOX_X + VALUE_BOX_WIDTH - 4,
    y + 2,
  );
}

// Traced from the figures (manual 3.2.3, 5.3, 5.5.3, 5.7): a valve cap on a neck, a solid
// stepped shoulder and base, and a 1 px outlined body between them, symmetric about its middle
// column (issue #41).
const CYLINDER_BODY_ROWS = 63;
const CYLINDER = [
  "............###########............",
  "............###########............",
  "............###########............",
  "..............#######..............",
  "..............#######..............",
  "..............#######..............",
  ".........#################.........",
  "....###########################....",
  "..###############################..",
  ".#################################.",
  "###################################",
  "###################################",
  "###################################",
  ...Array.from(
    { length: CYLINDER_BODY_ROWS },
    () => "#.................................#",
  ),
  "###################################",
  "###################################",
  "###################################",
  "###################################",
  ".#################################.",
  "..###############################..",
  "....###########################....",
  ".........#################.........",
];
const CYLINDER_X = 20;
const CYLINDER_Y = 41;
const CYLINDER_WIDTH = 35;
const CYLINDER_BODY_TOP = CYLINDER_Y + 13;
const CYLINDER_BASE_Y = CYLINDER_BODY_TOP + CYLINDER_BODY_ROWS;
// issue #41: a tick every 22 rows up from the base, as traced from the figures
const CYLINDER_TICK_PITCH = 22;

// ASSUMPTION: the tick mark `1` is kept as drawn in the figure (LCD screen catalogue, gap G16).
function drawCylinder(framebuffer: Framebuffer, fillLevel: number): void {
  drawBitmap(framebuffer, CYLINDER, CYLINDER_X, CYLINDER_Y);
  const filled = Math.round(CYLINDER_BODY_ROWS * fillLevel);
  for (let row = CYLINDER_BASE_Y - filled; row < CYLINDER_BASE_Y; row++) {
    for (
      let column = CYLINDER_X + 1;
      column < CYLINDER_X + CYLINDER_WIDTH - 1;
      column++
    ) {
      setPixel(framebuffer, column, row, (row + column) % 2 === 0);
    }
  }
  const tickYs = [0, 1, 2].map(
    (index) => CYLINDER_BASE_Y - index * CYLINDER_TICK_PITCH,
  );
  for (const tickY of tickYs) {
    fillRect(framebuffer, CYLINDER_X + CYLINDER_WIDTH, tickY, 3, 1);
  }
  // the `1` stands one row below the top tick (issue #41)
  drawText(
    framebuffer,
    "1",
    CYLINDER_X + CYLINDER_WIDTH + 4,
    CYLINDER_BASE_Y - 2 * CYLINDER_TICK_PITCH + 1,
  );
}

// Laid out after the Einsatzliste figures (manual 3.2.1, 5.3).
const ROW_TOP = 27;
const ROW_HEIGHT = 16;
const RESTZEIT_RIGHT = LCD_WIDTH - 1;
const SYMBOL_COLUMN_LEFT = 20;
const SYMBOL_COLUMN_RIGHT = 78;

const CLOCK = [
  "..###..",
  ".#...#.",
  "#..#..#",
  "#..#..#",
  "#..##.#",
  ".#...#.",
  "..###..",
];

function drawEinsatzliste(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "einsatzliste" }>,
): void {
  drawCenteredText(framebuffer, model.feuerwehrname, 1);
  strokeRect(framebuffer, 0, 10, LCD_WIDTH, 3);
  drawText(framebuffer, model.batteriefach, 1, 16);
  const gaugeX = 1 + textWidth(model.batteriefach) + 2;
  drawBatteryGauge(framebuffer, gaugeX, 16, model.batteriefuellstand);
  drawText(framebuffer, model.batterySign, gaugeX + 20, 16);
  drawBitmap(framebuffer, CLOCK, gaugeX + 30, 16);
  drawRightAlignedText(framebuffer, model.uhrzeit, RESTZEIT_RIGHT, 16);
  fillRect(framebuffer, 0, ROW_TOP - 2, LCD_WIDTH, 1);
  model.rows.forEach((row, index) => {
    const top = ROW_TOP + index * ROW_HEIGHT;
    if (index < model.rows.length - 1) {
      fillRect(framebuffer, 0, top + ROW_HEIGHT - 2, LCD_WIDTH, 1);
    }
    if (row === null) {
      return;
    }
    // Checked against the device: the 13-row Statussymbol keeps one free row to each rule, and
    // the text sits level with it.
    const textY = top + 3;
    if (row.selected) {
      fillRect(framebuffer, 1, textY - 2, textWidth(row.truppnummer) + 4, 11);
    }
    drawText(framebuffer, row.truppnummer, 3, textY, {
      inverse: row.selected,
    });
    if (row.sicher) {
      drawText(
        framebuffer,
        SICHER,
        centredInSymbolColumn(textWidth(SICHER)),
        textY,
      );
    } else {
      drawStatussymbol(
        framebuffer,
        row.statussymbol,
        centredInSymbolColumn(statussymbolWidth(row.statussymbol)),
        top,
      );
    }
    drawRightAlignedText(framebuffer, row.restzeit, RESTZEIT_RIGHT, textY);
  });
}

function centredInSymbolColumn(width: number): number {
  return Math.floor((SYMBOL_COLUMN_LEFT + SYMBOL_COLUMN_RIGHT - width) / 2);
}

function drawDoubleFrame(
  framebuffer: Framebuffer,
  y: number,
  height: number,
): void {
  strokeRect(framebuffer, 2, y, LCD_WIDTH - 4, height);
  strokeRect(framebuffer, 4, y + 2, LCD_WIDTH - 8, height - 4);
}

// ASSUMPTION: the manufacturer's ⟨IEP⟩ logo is drawn as doubled text; the figure's bitmap is
// too coarse to copy (LCD screen catalogue, S01).
function drawLogo(framebuffer: Framebuffer, y: number): void {
  drawCenteredText(framebuffer, "<IEP>", y, { scale: 2 });
}

// The battery line is static, as decided in "Draw the simulator's scope".
function drawBatteryLine(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "startdisplay" }>,
  y: number,
): void {
  const gaugeWidth = 16;
  const width =
    textWidth(model.batteriefach) +
    1 +
    gaugeWidth +
    1 +
    CHARACTER_PITCH +
    textWidth(model.batteriekapazitaet);
  const x = Math.floor((LCD_WIDTH - width) / 2);
  drawText(framebuffer, model.batteriefach, x, y);
  drawBatteryGauge(
    framebuffer,
    x + textWidth(model.batteriefach) + 2,
    y,
    model.batteriefuellstand,
  );
  drawText(
    framebuffer,
    model.batteriekapazitaet,
    x + width - textWidth(model.batteriekapazitaet),
    y,
  );
}

function drawBatteryGauge(
  framebuffer: Framebuffer,
  x: number,
  y: number,
  level: number,
): void {
  const bodyWidth = 14;
  strokeRect(framebuffer, x, y, bodyWidth, 7);
  fillRect(framebuffer, x + 1, y + 1, Math.round((bodyWidth - 2) * level), 5);
  fillRect(framebuffer, x + bodyWidth, y + 2, 2, 3);
}
