import { assertNever } from "../core/index";
import type { Einsatzstatus } from "../core/index";
import { GLYPH_HEIGHT } from "./font";
import { drawBitmap, drawText, textWidth } from "./framebuffer";
import type { Framebuffer } from "./framebuffer";
import type { Statussymbol } from "./screen-model";

// The Statussymbole follow the legend (manual 3.2.2); the Atemschutzträger and the house's roof
// were checked against the real device, which wins over the legend's drawing (issue #40).
const ATEMSCHUTZTRAEGER = [
  "..###..",
  "..###..",
  "...#...",
  ".#####.",
  "#.###.#",
  "..###..",
  "..#.#..",
  "..#.#..",
  ".##.##.",
];

const HOUSE_WIDTH = 24;
const HOUSE = [
  "....################....",
  "...##..............##...",
  "..##................##..",
  ".##..................##.",
  "###..................###",
  "#.#..................#.#",
  "..#..................#..",
  "..#..................#..",
  "..#..................#..",
  "..#..................#..",
  "..#..................#..",
  "..#..................#..",
  "..####################..",
];

const ARROW_IN = ["...#..", "######", "...#.."];

const SYMBOL_HEIGHT = HOUSE.length;
// Figures outside stand on the house's floor line; inside they keep 1 px from the roof top and
// the floor, 1 px from each wall and 2 px from each other (issue #40).
const OUTSIDE_Y = SYMBOL_HEIGHT - ATEMSCHUTZTRAEGER.length;
const INSIDE_Y = 2;
const INSIDE_LEFT = 4;
const ATEMSCHUTZTRAEGER_WIDTH = 7;
const ATEMSCHUTZTRAEGER_PITCH = ATEMSCHUTZTRAEGER_WIDTH + 2;
const ARROW_Y = Math.floor(SYMBOL_HEIGHT / 2);
const COUNT_Y = Math.floor((SYMBOL_HEIGHT - GLYPH_HEIGHT) / 2);

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
  const left = drawOutside(
    framebuffer,
    anmarschOutside(count),
    drawCount(framebuffer, count, x, y),
    y,
  );
  drawBitmap(framebuffer, HOUSE, left, y);
  if (count > 3) {
    drawBitmap(framebuffer, ARROW_IN, left + 1, y + ARROW_Y);
  } else if (count > 2) {
    drawCentredInside(framebuffer, left, y);
  } else {
    drawInside(framebuffer, 1, left, y);
  }
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
  const left = drawOutside(
    framebuffer,
    bereitschaftOutside(count),
    drawCount(framebuffer, count, x, y),
    y,
  );
  drawBitmap(framebuffer, HOUSE, left, y);
}

function anmarschOutside(count: number): number {
  return count > 3 ? 1 : count - 1;
}

function bereitschaftOutside(count: number): number {
  return count > 3 ? 1 : count;
}

// Draws the figures left of the house and returns where the house starts.
function drawOutside(
  framebuffer: Framebuffer,
  outside: number,
  left: number,
  y: number,
): number {
  for (let index = 0; index < outside; index++) {
    drawBitmap(
      framebuffer,
      ATEMSCHUTZTRAEGER,
      left + index * ATEMSCHUTZTRAEGER_PITCH,
      y + OUTSIDE_Y,
    );
  }
  return left + outsideWidth(outside);
}

// A lone figure outside stands directly next to the house, as on the device; several keep 2 px
// from each other and from the house.
function outsideWidth(outside: number): number {
  return outside === 1
    ? ATEMSCHUTZTRAEGER_WIDTH
    : outside * ATEMSCHUTZTRAEGER_PITCH;
}

// Every Atemschutzträger inside the house (H); more than three: the count and one figure inside
// (L), manual 3.2.2.
// ASSUMPTION: three Atemschutzträger draw two figures, as many as the device's house holds
// (issue #40).
function drawEinsatzzielErreicht(
  framebuffer: Framebuffer,
  count: number,
  x: number,
  y: number,
): void {
  const house = drawCount(framebuffer, count, x, y);
  drawBitmap(framebuffer, HOUSE, house, y);
  if (count > 3) {
    drawCentredInside(framebuffer, house, y);
  } else {
    drawInside(framebuffer, Math.min(count, 2), house, y);
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
  const house = drawCount(framebuffer, count, x, y);
  drawBitmap(framebuffer, HOUSE, house, y);
  if (count > 3) {
    drawBitmap(framebuffer, ARROW_IN, house + HOUSE_WIDTH - 7, y + ARROW_Y);
  } else if (count === 2) {
    // The one left inside stands by the right wall, behind the one leaving, as on the device.
    drawBitmap(
      framebuffer,
      ATEMSCHUTZTRAEGER,
      house + HOUSE_WIDTH - INSIDE_LEFT - ATEMSCHUTZTRAEGER_WIDTH,
      y + INSIDE_Y,
    );
  } else {
    drawInside(framebuffer, count - 1, house, y);
  }
  drawBitmap(
    framebuffer,
    ATEMSCHUTZTRAEGER,
    house + HOUSE_WIDTH,
    y + OUTSIDE_Y,
  );
}

function drawInside(
  framebuffer: Framebuffer,
  count: number,
  house: number,
  y: number,
): void {
  for (let index = 0; index < count; index++) {
    drawBitmap(
      framebuffer,
      ATEMSCHUTZTRAEGER,
      house + INSIDE_LEFT + index * ATEMSCHUTZTRAEGER_PITCH,
      y + INSIDE_Y,
    );
  }
}

// The one figure standing for a Trupp of more than two stands in the middle of the house, as on
// the device.
function drawCentredInside(
  framebuffer: Framebuffer,
  house: number,
  y: number,
): void {
  drawBitmap(
    framebuffer,
    ATEMSCHUTZTRAEGER,
    house + Math.floor((HOUSE_WIDTH - ATEMSCHUTZTRAEGER_WIDTH) / 2),
    y + INSIDE_Y,
  );
}

// Draws a larger Trupp's `4×`, centred on the symbol's height so it sits level with the
// Einsatzliste row's text, and returns where the rest of the symbol starts.
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
  drawText(framebuffer, countText, x, y + COUNT_Y);
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
      return (
        countWidth + outsideWidth(bereitschaftOutside(count)) + HOUSE_WIDTH
      );
    case "anmarsch":
      return countWidth + outsideWidth(anmarschOutside(count)) + HOUSE_WIDTH;
    case "einsatzzielErreicht":
      return countWidth + HOUSE_WIDTH;
    case "rueckmarsch":
      return countWidth + HOUSE_WIDTH + ATEMSCHUTZTRAEGER_WIDTH;
    default:
      return assertNever(einsatzstatus);
  }
}
