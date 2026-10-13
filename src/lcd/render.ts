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
import type { ScreenModel } from "./screen-model";
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
    case "abmelden":
      drawAbmelden(framebuffer, model);
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
// the left, the values on the right of a divider, and the inverse `Ansicht` label at the bottom.
const ANSICHT_DIVIDER_X = 64;
const ANSICHT_LABEL_Y = LCD_HEIGHT - 11;

const BOTTLE = [".###.", "..#..", ".###.", "#####", "#####", "#####", "#####"];

function drawTruppAnsicht(
  framebuffer: Framebuffer,
  model: Extract<ScreenModel, { layout: "truppAnsicht" }>,
): void {
  drawText(framebuffer, model.title, 1, 2);
  fillRect(framebuffer, 0, 11, LCD_WIDTH, 1);
  // ASSUMPTION: only the two names the figure has room for are drawn; a larger Trupp's further
  // Atemschutzträger are left off (LCD screen catalogue, S11).
  drawLines(framebuffer, model.atemschutztraeger.slice(0, 2), 13);
  fillRect(framebuffer, 0, 32, LCD_WIDTH, 1);
  fillRect(framebuffer, ANSICHT_DIVIDER_X, 33, 1, LCD_HEIGHT - 33);
  drawCylinder(framebuffer, model.fillLevel);
  // ASSUMPTION: the time-split bar is drawn empty until the Einsatzstatus times it splits are
  // kept (LCD screen catalogue, gap G17).
  strokeRect(framebuffer, 7, 52, 6, 68);
  const iconX = Math.floor(
    (ANSICHT_DIVIDER_X + VALUE_BOX_X + VALUE_BOX_WIDTH - 5) / 2,
  );
  drawBitmap(framebuffer, BOTTLE, iconX, 36);
  drawValueBox(framebuffer, model.flaschendruck, 45);
  drawBitmap(framebuffer, CLOCK, iconX - 1, 60);
  drawValueBox(framebuffer, model.restzeit, 69);
  // ASSUMPTION: the Rückzugsdruck box is left out until the Rückzugsalarm is simulated
  // (manual 3.2.3 item 9).
  fillRect(
    framebuffer,
    ANSICHT_DIVIDER_X + 1,
    ANSICHT_LABEL_Y,
    LCD_WIDTH - ANSICHT_DIVIDER_X - 1,
    11,
  );
  drawText(
    framebuffer,
    model.label,
    Math.floor(
      (ANSICHT_DIVIDER_X + 1 + LCD_WIDTH - textWidth(model.label)) / 2,
    ),
    ANSICHT_LABEL_Y + 2,
    { inverse: true },
  );
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
const VALUE_BOX_WIDTH = 58;
const CYLINDER_X = 20;
const CYLINDER_Y = 44;
const CYLINDER_WIDTH = 35;
const CYLINDER_HEIGHT = 80;

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
  // ASSUMPTION: the time-split bar is drawn empty, as in the figure, before any time has run
  // (LCD screen catalogue, gap G17).
  strokeRect(framebuffer, 7, 52, 6, 68);
}

function drawValueBox(framebuffer: Framebuffer, text: string, y: number): void {
  strokeRect(framebuffer, VALUE_BOX_X, y, VALUE_BOX_WIDTH, 11);
  drawRightAlignedText(
    framebuffer,
    text,
    VALUE_BOX_X + VALUE_BOX_WIDTH - 4,
    y + 2,
  );
}

// ASSUMPTION: the tick mark `1` is kept as drawn in the figure (LCD screen catalogue, gap G16).
function drawCylinder(framebuffer: Framebuffer, fillLevel: number): void {
  const x = CYLINDER_X;
  const y = CYLINDER_Y;
  fillRect(framebuffer, x + 12, y - 6, 11, 3);
  fillRect(framebuffer, x + 15, y - 3, 5, 3);
  strokeRect(framebuffer, x, y, CYLINDER_WIDTH, CYLINDER_HEIGHT);
  for (const [cornerX, cornerY] of [
    [x, y],
    [x + CYLINDER_WIDTH - 1, y],
    [x, y + CYLINDER_HEIGHT - 1],
    [x + CYLINDER_WIDTH - 1, y + CYLINDER_HEIGHT - 1],
  ] as const) {
    setPixel(framebuffer, cornerX, cornerY, false);
  }
  const innerHeight = CYLINDER_HEIGHT - 4;
  const filled = Math.round(innerHeight * fillLevel);
  for (
    let row = y + 2 + innerHeight - filled;
    row < y + 2 + innerHeight;
    row++
  ) {
    for (let column = x + 2; column < x + CYLINDER_WIDTH - 2; column++) {
      setPixel(framebuffer, column, row, (row + column) % 2 === 0);
    }
  }
  const tickYs = [1 / 3, 2 / 3, 1].map(
    (fraction) => y + 1 + Math.round(innerHeight * fraction),
  );
  for (const tickY of tickYs) {
    fillRect(framebuffer, x + CYLINDER_WIDTH, tickY, 3, 1);
  }
  drawText(framebuffer, "1", x + CYLINDER_WIDTH + 3, (tickYs[0] ?? y) + 2);
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
    const textY = top + 4;
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
        top + 1,
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
