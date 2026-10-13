import type { Framebuffer } from "./framebuffer";

// The LCD's look: dark pixels on the always-lit backlight, decided in "Fix the factory defaults
// the manual leaves open". A hairline gap between pixels hints at the dot matrix.
const BACKLIGHT_COLOR = "#c9d4b8";
const PIXEL_COLOR = "#1d2418";
const PIXEL_GAP_RATIO = 0.12;

/** Paints a framebuffer onto a canvas, scaled to fill the canvas. */
export function paintFramebuffer(
  context: CanvasRenderingContext2D,
  framebuffer: Framebuffer,
): void {
  const { width, height } = context.canvas;
  const scale = Math.min(
    width / framebuffer.width,
    height / framebuffer.height,
  );
  const size = scale * (1 - PIXEL_GAP_RATIO);
  context.fillStyle = BACKLIGHT_COLOR;
  context.fillRect(0, 0, width, height);
  context.fillStyle = PIXEL_COLOR;
  for (let y = 0; y < framebuffer.height; y++) {
    for (let x = 0; x < framebuffer.width; x++) {
      if (framebuffer.pixels[y * framebuffer.width + x] === 1) {
        context.fillRect(x * scale, y * scale, size, size);
      }
    }
  }
}
