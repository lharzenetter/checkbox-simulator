import { assertNever } from "../core/index";
import { CHARACTER_PITCH } from "./font";
import {
  createFramebuffer,
  drawCenteredText,
  drawText,
  fillRect,
  strokeRect,
  textWidth,
} from "./framebuffer";
import type { Framebuffer } from "./framebuffer";
import type { ScreenModel } from "./screen-model";

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
