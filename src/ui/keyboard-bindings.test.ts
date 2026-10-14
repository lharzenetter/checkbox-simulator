import { describe, expect, it } from "vitest";
import type { Key } from "../core/index";
import {
  clockActionFor,
  deviceKeyBindingFor,
  keyShortcutsFor,
  tallyIndexFor,
} from "./keyboard-bindings";

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

  it("taps the Roster Tallys with the number keys 1 to 8", () => {
    expect(tallyIndexFor("1")).toBe(0);
    expect(tallyIndexFor("8")).toBe(7);
    expect(tallyIndexFor("9")).toBeUndefined();
    expect(tallyIndexFor("0")).toBeUndefined();
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
