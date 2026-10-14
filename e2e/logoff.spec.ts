import { expect, test } from "@playwright/test";
import { openSimulator } from "./first-launch";

test("log off a Trupp", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const roster = page.getByRole("region", { name: "Atemschutzträger" });
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");

  await page.keyboard.press("1");
  await page.keyboard.press("c");
  await page.keyboard.press("2");
  await page.keyboard.press("c");
  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
  await expect(roster).toContainText("Trupp 01");

  await page.getByRole("button", { name: "HLF AT-M auflegen" }).click();
  await expect(lcd).toHaveAttribute(
    "aria-label",
    "Trupp 01 ABMELDEN\n*HLF AT-F\n*HLF AT-M markiert\nOK  =  abmelden\n X  =  nicht abmelden",
  );

  await page.keyboard.press("1");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^Trupp 01 ABMELDEN\n\*HLF AT-F markiert\n\*HLF AT-M markiert\n/,
  );

  await page.getByRole("button", { name: "Taste OK" }).click();
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^FF-Musterstadt\nB1- \+ \d\d:\d\d:\d\d$/,
  );
  await expect(roster).not.toContainText("Trupp 01");

  await page.clock.runFor(25_000);
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");
});
