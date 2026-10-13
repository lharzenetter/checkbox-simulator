import { expect, test } from "@playwright/test";

test("pause and speed up the clock", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const lcd = page.getByRole("img");
  const pause = page.getByRole("button", { name: /Pause/ });
  const play = page.getByRole("button", { name: /Weiter/ });

  await pause.click();
  await expect(page.getByText("Simulation pausiert")).toBeVisible();
  await expect(page.getByRole("button", { name: "10×" })).toBeDisabled();
  await page.getByRole("button", { name: "Taste Check" }).click();
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");

  await play.click();
  await page.getByRole("button", { name: "10×" }).click();
  await expect(page.getByRole("button", { name: "10×" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("e");
  await expect(lcd).toHaveAttribute("aria-label", /sonst Ende in {2}> {2}25/);

  await page.clock.runFor(10_000);
  await expect(lcd).toHaveAttribute("aria-label", /sonst Ende in {2}> {2}15/);

  await pause.click();
  await page.clock.runFor(60_000);
  await expect(lcd).toHaveAttribute("aria-label", /sonst Ende in {2}> {2}15/);

  await play.click();
  await page.clock.runFor(15_000);
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");
});
