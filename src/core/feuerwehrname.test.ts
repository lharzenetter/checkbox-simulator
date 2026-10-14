import { describe, expect, it } from "vitest";
import { FACTORY_FEUERWEHRNAME, isValidFeuerwehrname } from "./index";

describe("the Feuerwehrname", () => {
  // manual 5.2, Startdisplay figure
  it("leaves the factory as FF-Musterstadt", () => {
    expect(FACTORY_FEUERWEHRNAME).toBe("FF-Musterstadt");
    expect(isValidFeuerwehrname(FACTORY_FEUERWEHRNAME)).toBe(true);
  });

  it("fits one LCD line of 21 characters", () => {
    expect(isValidFeuerwehrname("FF-Groß Musterstadt 1")).toBe(true);
    expect(isValidFeuerwehrname("FF-Groß Musterstadt 12")).toBe(false);
  });

  it("is not blank", () => {
    expect(isValidFeuerwehrname("")).toBe(false);
    expect(isValidFeuerwehrname("   ")).toBe(false);
  });

  it("uses only characters the LCD can show", () => {
    expect(isValidFeuerwehrname("FF-Übersee")).toBe(true);
    expect(isValidFeuerwehrname("FF-Musterstadt €")).toBe(false);
  });
});
