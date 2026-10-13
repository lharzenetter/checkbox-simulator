import { assertNever } from "../core/index";
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

// Every Atemschutzträger outside an empty house (G); more than three: the count, one figure and
// the empty house (K), manual 3.2.2.
// ASSUMPTION: three Atemschutzträger draw three figures, as G draws two; gap G3 of the LCD screen
// catalogue was settled for Anmarsch only, and this extends it the same way.
function drawBereitschaft(
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
    drawBitmap(framebuffer, HOUSE, left + PERSON_PITCH, y);
    return;
  }
  for (let outside = 0; outside < count; outside++) {
    drawBitmap(framebuffer, ATEMSCHUTZTRAEGER, left, personY);
    left += PERSON_PITCH;
  }
  drawBitmap(framebuffer, HOUSE, left, y);
}

// Every Atemschutzträger inside the house (H); more than three: the count and one figure inside
// (L), manual 3.2.2.
// ASSUMPTION: three Atemschutzträger stand closer to fit the house, extending gap G3 of the LCD
// screen catalogue as for Bereitschaft.
function drawEinsatzzielErreicht(
  framebuffer: Framebuffer,
  count: number,
  x: number,
  y: number,
): void {
  const personY = y + SYMBOL_HEIGHT - ATEMSCHUTZTRAEGER.length - 1;
  const house = drawCount(framebuffer, count, x, y);
  drawBitmap(framebuffer, HOUSE, house, y);
  const inside = count > 3 ? 1 : count;
  for (let index = 0; index < inside; index++) {
    drawBitmap(
      framebuffer,
      ATEMSCHUTZTRAEGER,
      house + HOUSE_INSIDE_LEFT + index * INSIDE_PITCH,
      personY,
    );
  }
}

// All but one Atemschutzträger inside the house and the last one leaving on the right (I); more
// than three: the count, an arrow out of the house and one figure outside on the right (M),
// manual 3.2.2.
// ASSUMPTION: three Atemschutzträger draw two inside, extending gap G3 of the LCD screen
// catalogue as for Bereitschaft.
function drawRueckmarsch(
  framebuffer: Framebuffer,
  count: number,
  x: number,
  y: number,
): void {
  const personY = y + SYMBOL_HEIGHT - ATEMSCHUTZTRAEGER.length;
  const house = drawCount(framebuffer, count, x, y);
  drawBitmap(framebuffer, HOUSE, house, y);
  if (count > 3) {
    drawBitmap(framebuffer, ARROW_IN, house + HOUSE_WIDTH - 7, y + 5);
  } else {
    for (let index = 0; index < count - 1; index++) {
      drawBitmap(
        framebuffer,
        ATEMSCHUTZTRAEGER,
        house + HOUSE_INSIDE_LEFT + index * INSIDE_PITCH,
        personY - 1,
      );
    }
  }
  drawBitmap(framebuffer, ATEMSCHUTZTRAEGER, house + HOUSE_WIDTH + 1, personY);
}

const HOUSE_INSIDE_LEFT = 3;
const INSIDE_PITCH = 5;

// Draws a larger Trupp's `4×` and returns where the house starts.
function drawCount(
  framebuffer: Framebuffer,
  count: number,
  x: number,
  y: number,
): number {
  if (count <= 3) {
    return x;
  }
  const countText = `${String(count)}×`;
  drawText(
    framebuffer,
    countText,
    x,
    y + SYMBOL_HEIGHT - ATEMSCHUTZTRAEGER.length + 1,
  );
  return x + textWidth(countText) + 2;
}

const DRAWERS: Readonly<
  Record<
    Einsatzstatus,
    (framebuffer: Framebuffer, count: number, x: number, y: number) => void
  >
> = {
  bereitschaft: drawBereitschaft,
  anmarsch: drawAnmarsch,
  einsatzzielErreicht: drawEinsatzzielErreicht,
  rueckmarsch: drawRueckmarsch,
};

/** The width {@link drawStatussymbol} draws, for centring it in its column. */
export function statussymbolWidth(statussymbol: Statussymbol): number {
  const { count, einsatzstatus } = statussymbol;
  const countWidth = count > 3 ? textWidth(`${String(count)}×`) + 2 : 0;
  switch (einsatzstatus) {
    case "bereitschaft":
      return count > 3
        ? countWidth + PERSON_PITCH + HOUSE_WIDTH
        : count * PERSON_PITCH + HOUSE_WIDTH;
    case "anmarsch":
      return count > 3
        ? countWidth + PERSON_PITCH + HOUSE_WIDTH
        : (count - 1) * PERSON_PITCH + HOUSE_WIDTH;
    case "einsatzzielErreicht":
      return countWidth + HOUSE_WIDTH;
    case "rueckmarsch":
      return countWidth + HOUSE_WIDTH + PERSON_PITCH;
    default:
      return assertNever(einsatzstatus);
  }
}
