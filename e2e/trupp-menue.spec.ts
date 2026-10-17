import { expect, test } from "@playwright/test";
import { openSimulator } from "./first-launch";

// decided in "Correct the simulator against the real Checkbox", navigation
test("open the Trupp-Menü and enter a pressure", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");

  for (const key of ["1", "c", "2", "c", "c"]) {
    await page.keyboard.press(key);
  }
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ANMARSCH\n/);
  // the Trupp-Ansicht closes after 5 s of real time
  await page.clock.runFor(5_000);
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^Trupp 01 ANMARSCH\n\*HLF AT-F\n\*HLF AT-M\nRestzeit 00:29:5\d\nTrupp -> Einsatz\nTrupp -> Bereitschaft\nEinsatzziel erreicht\nDruck ändern$/,
  );
  await page.keyboard.press("d");
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);

  // Einsatzziel erreicht, accepted at the estimate
  for (const key of ["c", "ArrowDown", "ArrowDown", "c"]) {
    await page.keyboard.press(key);
  }
  await expect(lcd).toHaveAttribute("aria-label", /^Esz-Ziel erreicht\n/);
  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^Trupp 01 EINSATZ\nPersonen-Anzahl: 2\n.*\nAnsicht$/s,
  );
  await page.clock.runFor(5_000);
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /\n01 markiert {2}2× Einsatzziel erreicht {2}/,
  );
});
