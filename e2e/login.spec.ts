import { expect, test } from "@playwright/test";
import { openSimulator } from "./first-launch";

test("log in a Trupp", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const roster = page.getByRole("region", { name: "Atemschutzträger" });

  await page
    .getByRole("button", { name: "HLF · Angriffstruppführer auflegen" })
    .click();
  await expect(lcd).toHaveAttribute("aria-label", /^Neuen Trupp anmelden:/);
  await expect(lcd).toHaveAttribute("aria-label", /\*HLF AT-F/);

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 {3}30 min/);

  await page.keyboard.press("2");
  await roster
    .getByRole("listitem")
    .filter({ hasText: "HLF · Wassertruppführer" })
    .dragTo(page.getByRole("button", { name: "Taste Check" }));
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /\*HLF AT-F\n\*HLF AT-M\n\*HLF WT-F\n/,
  );
  await expect(roster).toContainText("Anmeldung Trupp 01");

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp Nr\.: 01/);
  await page.keyboard.press("b");
  await page.keyboard.press("b");
  await expect(lcd).toHaveAttribute("aria-label", /Restzeit 00:29:00/);

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^FF-Musterstadt\nB1- \+ \d\d:\d\d:\d\d\n01 markiert {2}3× Anmarsch {2}00:29:00$/,
  );
  await expect(roster).toContainText("Trupp 01");

  await page.clock.runFor(60_000);
  await expect(lcd).toHaveAttribute("aria-label", /00:28:00$/);
});
