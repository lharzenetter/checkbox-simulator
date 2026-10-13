import { expect, test } from "@playwright/test";

test("power on", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const lcd = page.getByRole("img");

  await expect(lcd).toHaveAttribute("aria-label", "Display aus");

  await page.getByRole("button", { name: "Taste Check" }).click();
  await expect(lcd).toHaveAttribute("aria-label", /oder TALLY auflegen/);
  await expect(lcd).toHaveAttribute("aria-label", /sonst Ende in {2}> {2}25/);

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute("aria-label", /^SERVICE\nEinsatzprotokoll/);

  await page.getByRole("button", { name: "Taste X" }).click();
  await expect(lcd).toHaveAttribute("aria-label", /oder TALLY auflegen/);

  await page.keyboard.press("a");
  await page.keyboard.press("b");
  await page.keyboard.press("d");
  await expect(lcd).toHaveAttribute("aria-label", /oder TALLY auflegen/);

  await page.clock.runFor(25_000);
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");

  await page.keyboard.press("e");
  await expect(lcd).toHaveAttribute("aria-label", /oder TALLY auflegen/);
});
