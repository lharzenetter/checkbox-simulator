import type { Einsatzstatus } from "../core/index";
import { drawBitmap, drawText, textWidth } from "./framebuffer";
import type { Framebuffer } from "./framebuffer";
import type { Statussymbol } from "./screen-model";

// The Statussymbole are traced loosely from the legend (manual 3.2.2); the figures are too
// coarse to copy pixel for pixel.
const ATEMSCHUTZTRAEGER = [
  "..#..",
  ".###.",
  "#####",
  "#.#.#",
  "..#..",
  ".#.#.",
  ".#.#.",
  "#...#",
];

const HOUSE_WIDTH = 22;
const HOUSE = [
  "...################...",
  "..#................#..",
  ".##................##.",
  "#.#................#.#",
  "..#................#..",
  "..#................#..",
  "..#................#..",
  "..#................#..",
  "..#................#..",
  "..##################..",
];

const ARROW_IN = ["...#..", "######", "...#.."];

const SYMBOL_HEIGHT = HOUSE.length;
const PERSON_PITCH = 6;

/** Draws a Statussymbol whose top-left corner is at (x, y). */
export function drawStatussymbol(
  framebuffer: Framebuffer,
  statussymbol: Statussymbol,
  x: number,
  y: number,
): void {
  DRAWERS[statussymbol.einsatzstatus](framebuffer, statussymbol.count, x, y);
}

// Up to three Atemschutzträger: all but one outside, the last one entering the house (F); more:
// the count, one figure outside and an arrow into the house (J), manual 3.2.2.
// ASSUMPTION: three Atemschutzträger draw two figures outside, and `5×`/`6×` are drawn like `4×`
// (LCD screen catalogue, gaps G3 and G15–G17, settled in the spec's read-through).
function drawAnmarsch(
  framebuffer: Framebuffer,
  count: number,
  x: number,
  y: number,
): void {
  const personY = y + SYMBOL_HEIGHT - ATEMSCHUTZTRAEGER.length;
  let left = x;
  if (count > 3) {
    const countText = `${String(count)}×`;
    drawText(framebuffer, countText, left, personY + 1);
    left += textWidth(countText) + 2;
    drawBitmap(framebuffer, ATEMSCHUTZTRAEGER, left, personY);
    left += PERSON_PITCH;
    drawBitmap(framebuffer, HOUSE, left, y);
    drawBitmap(framebuffer, ARROW_IN, left + 1, y + 5);
    return;
  }
  for (let outside = 1; outside < count; outside++) {
    drawBitmap(framebuffer, ATEMSCHUTZTRAEGER, left, personY);
    left += PERSON_PITCH;
  }
  drawBitmap(framebuffer, HOUSE, left, y);
  drawBitmap(framebuffer, ATEMSCHUTZTRAEGER, left + 4, personY - 1);
}

const DRAWERS: Readonly<
  Record<
    Einsatzstatus,
    (framebuffer: Framebuffer, count: number, x: number, y: number) => void
  >
> = { anmarsch: drawAnmarsch };

/** The width {@link drawStatussymbol} draws, for centring it in its column. */
export function statussymbolWidth(statussymbol: Statussymbol): number {
  const { count } = statussymbol;
  if (count > 3) {
    return textWidth(`${String(count)}×`) + 2 + PERSON_PITCH + HOUSE_WIDTH;
  }
  return (count - 1) * PERSON_PITCH + HOUSE_WIDTH;
}
