import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "../core/index";
import type { Event, Key } from "../core/index";
import type { Framebuffer } from "./framebuffer";
import { LCD_HEIGHT, LCD_WIDTH, renderScreen } from "./render";
import { screenModel } from "./screen-model";

// 12.04.17 11:11:00, the Uhrzeit in the Startdisplay figure (manual 5.2).
const FIGURE_UHRZEIT = Date.UTC(2017, 3, 12, 11, 11, 0);

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

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
});
