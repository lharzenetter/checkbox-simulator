import { describe, expect, it } from "vitest";
import type { Key } from "../core/index";
import {
  clockActionFor,
  deviceKeyBindingFor,
  keyShortcutsFor,
  tallyIndexFor,
  tallyKeyFor,
} from "./keyboard-bindings";

function numberKey(key: string, code: string) {
  return { key, code, shiftKey: false };
}

function shifted(key: string, code: string) {
  return { key, code, shiftKey: true };
}

describe("keyboard bindings", () => {
  it.each<[string, Key]>([
    ["ArrowUp", "Up"],
    ["a", "Up"],
    ["ArrowDown", "Down"],
    ["b", "Down"],
    ["Enter", "OK"],
    ["c", "OK"],
    ["Escape", "X"],
    ["d", "X"],
    [" ", "Check"],
    ["e", "Check"],
  ])("presses %j as the %s key", (eventKey, key) => {
    expect(deviceKeyBindingFor(eventKey)?.key).toBe(key);
  });

  it("treats a shifted letter like the plain letter", () => {
    expect(deviceKeyBindingFor("C")?.key).toBe("OK");
  });

  it("leaves Enter and Space to a focused control, but not the arrows, Escape or letters", () => {
    expect(deviceKeyBindingFor("Enter")?.yieldsToFocusedControl).toBe(true);
    expect(deviceKeyBindingFor(" ")?.yieldsToFocusedControl).toBe(true);
    for (const eventKey of ["ArrowUp", "ArrowDown", "Escape", "a", "e"]) {
      expect(deviceKeyBindingFor(eventKey)?.yieldsToFocusedControl).toBe(false);
    }
  });

  it("binds no other key", () => {
    expect(deviceKeyBindingFor("ArrowLeft")).toBeUndefined();
    expect(deviceKeyBindingFor("f")).toBeUndefined();
  });

  // decided in "Let the Trainee add and remove Fahrzeuge", point 4
  it("taps the Tallys of the Fahrzeuge in positions 1 and 2 with the number keys 1 to 8", () => {
    expect(tallyIndexFor(numberKey("1", "Digit1"))).toBe(0);
    expect(tallyIndexFor(numberKey("8", "Digit8"))).toBe(7);
    expect(tallyIndexFor(numberKey("9", "Digit9"))).toBeUndefined();
    expect(tallyIndexFor(numberKey("0", "Digit0"))).toBeUndefined();
  });

  // decided in "Let the Trainee add and remove Fahrzeuge", point 4: the physical key, because
  // Shift changes the character on German layouts
  it("taps the Tallys of the Fahrzeuge in positions 3 and 4 with Shift and the number keys 1 to 8", () => {
    expect(tallyIndexFor(shifted("!", "Digit1"))).toBe(8);
    expect(tallyIndexFor(shifted("(", "Digit8"))).toBe(15);
    expect(tallyIndexFor(shifted(")", "Digit9"))).toBeUndefined();
    expect(tallyIndexFor(shifted("!", "KeyQ"))).toBeUndefined();
  });

  it("names each Roster Tally's number key for its fob and aria-keyshortcuts", () => {
    expect(tallyKeyFor(0)).toEqual({ label: "1", ariaName: "1" });
    expect(tallyKeyFor(7)).toEqual({ label: "8", ariaName: "8" });
    expect(tallyKeyFor(8)).toEqual({ label: "⇧1", ariaName: "Shift+1" });
    expect(tallyKeyFor(15)).toEqual({ label: "⇧8", ariaName: "Shift+8" });
  });

  it("names each device key's shortcuts for aria-keyshortcuts", () => {
    expect(keyShortcutsFor("X")).toBe("Escape D");
    expect(keyShortcutsFor("Check")).toBe("Space E");
  });

  it.each([
    ["ArrowRight", "faster"],
    ["ArrowLeft", "slower"],
    ["p", "togglePause"],
    ["P", "togglePause"],
  ])("steers the clock with %j", (eventKey, action) => {
    expect(clockActionFor(eventKey)).toBe(action);
    expect(deviceKeyBindingFor(eventKey)).toBeUndefined();
  });
});
