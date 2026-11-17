import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Opens the simulator on fresh storage and confirms the first-launch dialog's defaults.
export async function openSimulator(page: Page): Promise<void> {
  await page.goto("./");
  await page.getByRole("button", { name: "Übernehmen" }).click();
}

// Logs HLF AT-F and AT-M in as Trupp 01 through the key map, from Display aus to the Einsatzliste.
export async function logInTrupp01(page: Page): Promise<void> {
  const lcd = page.getByRole("img");
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");
  for (const key of ["1", "c", "2", "c", "c"]) {
    await page.keyboard.press(key);
  }
  // any key closes the Trupp-Ansicht the login shows
  await page.keyboard.press("d");
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
}
