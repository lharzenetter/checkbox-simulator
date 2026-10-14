import { expect, test } from "@playwright/test";
import { openSimulator } from "./first-launch";

test("press the device keys with Space, Enter, Escape and the arrows", async ({
  page,
}) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");

  await page.keyboard.press("Space");
  await expect(lcd).toHaveAttribute("aria-label", /oder TALLY auflegen/);

  await page.keyboard.press("Enter");
  await expect(lcd).toHaveAttribute("aria-label", /^SERVICE\nEinsatzprotokoll/);

  await page.keyboard.press("Escape");
  await expect(lcd).toHaveAttribute("aria-label", /oder TALLY auflegen/);

  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowDown");
  await expect(lcd).toHaveAttribute("aria-label", /oder TALLY auflegen/);
});

test("leave Space to a focused control outside the front panel", async ({
  page,
}) => {
  await page.clock.install();
  await openSimulator(page);

  await page.getByRole("button", { name: /Pause/ }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("Simulation pausiert")).toBeVisible();
  await expect(page.getByRole("img")).toHaveAttribute(
    "aria-label",
    "Display aus",
  );
});

test("press a focused front-panel key's binding only once", async ({
  page,
}) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");

  await page.getByRole("button", { name: "Taste Check" }).click();
  await page.keyboard.press("Enter");
  await expect(lcd).toHaveAttribute("aria-label", /^SERVICE\nEinsatzprotokoll/);
});

test("list the keybindings in the Tastenkürzel dialog", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const dialog = page.getByRole("dialog", { name: "Tastenkürzel" });

  await page.getByRole("button", { name: "Tastenkürzel" }).click();
  await expect(dialog.getByRole("row", { name: /^X / })).toContainText(
    "Esc oder D",
  );
  await expect(dialog.getByRole("row", { name: /^Check / })).toContainText(
    "Leertaste oder E",
  );
  await expect(
    dialog.getByRole("row", { name: /^Tally antippen/ }),
  ).toContainText("1–8");

  await page.keyboard.press("e");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("img")).toHaveAttribute(
    "aria-label",
    "Display aus",
  );
});
