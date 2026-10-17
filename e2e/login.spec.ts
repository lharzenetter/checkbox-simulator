import { expect, test } from "@playwright/test";
import { openSimulator } from "./first-launch";

test("log in a Trupp", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const roster = page.getByRole("region", { name: "Atemschutzträger" });

  await page.getByRole("button", { name: "HLF AT-F auflegen" }).click();
  await expect(lcd).toHaveAttribute("aria-label", /^Neuen Trupp anmelden:/);
  await expect(lcd).toHaveAttribute("aria-label", /\*HLF AT-F/);

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 {3}30 min/);

  await page.keyboard.press("2");
  await roster
    .getByRole("button", { name: "HLF WT-F auflegen" })
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

  // decided in "Correct the simulator against the real Checkbox": the login entry shows the
  // Trupp-Ansicht, and any key closes it
  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    "Trupp 01 ANMARSCH\nPersonen-Anzahl: 3\nDruck 290 bar\nRestzeit 00:29:00\nAnsicht",
  );
  await page.keyboard.press("d");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^FF-Musterstadt\nB1- \+ \d\d:\d\d:\d\d\n01 markiert {2}3× Anmarsch {2}00:29:00$/,
  );
  await expect(roster).toContainText("Trupp 01");

  await page.clock.runFor(60_000);
  await expect(lcd).toHaveAttribute("aria-label", /00:28:00$/);
});
