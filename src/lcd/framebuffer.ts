import { CHARACTER_PITCH, glyphRows } from "./font";

/** A 1-bit image of the LCD, row-major, one byte per pixel: `1` is a dark pixel. */
export interface Framebuffer {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

export function createFramebuffer(width: number, height: number): Framebuffer {
  return { width, height, pixels: new Uint8Array(width * height) };
}

// Drawing clips silently at the edges, like the physical LCD.
export function setPixel(
  framebuffer: Framebuffer,
  x: number,
  y: number,
  dark: boolean,
): void {
  if (x < 0 || y < 0 || x >= framebuffer.width || y >= framebuffer.height) {
    return;
  }
  framebuffer.pixels[y * framebuffer.width + x] = dark ? 1 : 0;
}

export function fillRect(
  framebuffer: Framebuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  dark = true,
): void {
  for (let row = y; row < y + height; row++) {
    for (let column = x; column < x + width; column++) {
      setPixel(framebuffer, column, row, dark);
    }
  }
}

export function strokeRect(
  framebuffer: Framebuffer,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  fillRect(framebuffer, x, y, width, 1);
  fillRect(framebuffer, x, y + height - 1, width, 1);
  fillRect(framebuffer, x, y, 1, height);
  fillRect(framebuffer, x + width - 1, y, 1, height);
}

export function textWidth(text: string, scale = 1): number {
  return text.length === 0 ? 0 : (text.length * CHARACTER_PITCH - 1) * scale;
}

// (x, y) is the top-left corner of the first glyph; inverse text is drawn light.
export function drawText(
  framebuffer: Framebuffer,
  text: string,
  x: number,
  y: number,
  { inverse = false, scale = 1 } = {},
): void {
  // The font holds single code units only (Latin-1), so indexing by code unit is safe.
  for (let index = 0; index < text.length; index++) {
    const left = x + index * CHARACTER_PITCH * scale;
    glyphRows(text.charAt(index)).forEach((row, rowIndex) => {
      for (let column = 0; column < row.length; column++) {
        if (row.charAt(column) === "#") {
          fillRect(
            framebuffer,
            left + column * scale,
            y + rowIndex * scale,
            scale,
            scale,
            !inverse,
          );
        }
      }
    });
  }
}

export function drawCenteredText(
  framebuffer: Framebuffer,
  text: string,
  y: number,
  options: { readonly scale?: number } = {},
): void {
  const x = Math.floor(
    (framebuffer.width - textWidth(text, options.scale)) / 2,
  );
  drawText(framebuffer, text, x, y, options);
}

// Rows of `#` (dark) and `.` (left as is), like the font's glyphs; (x, y) is the top-left corner.
export function drawBitmap(
  framebuffer: Framebuffer,
  rows: readonly string[],
  x: number,
  y: number,
): void {
  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      if (row.charAt(column) === "#") {
        setPixel(framebuffer, x + column, y + rowIndex, true);
      }
    }
  });
}

export function drawRightAlignedText(
  framebuffer: Framebuffer,
  text: string,
  right: number,
  y: number,
  options: { readonly inverse?: boolean } = {},
): void {
  drawText(framebuffer, text, right - textWidth(text), y, options);
}
