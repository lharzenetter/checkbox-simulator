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

test("give Enter to the device after a Tally is clicked", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");

  await page.getByRole("button", { name: "HLF AT-F auflegen" }).click();
  await expect(lcd).toHaveAttribute("aria-label", /^Neuen Trupp anmelden:/);
  await page.keyboard.press("Enter");
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 {3}30 min/);
});

test("leave a clicked front-panel key unfocused", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const check = page.getByRole("button", { name: "Taste Check" });

  await check.click();
  await expect(check).not.toBeFocused();
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
    dialog.getByRole("row", { name: /^Tally antippen, Fahrzeug 1–2/ }),
  ).toContainText("1–8");
  await expect(
    dialog.getByRole("row", { name: /^Tally antippen, Fahrzeug 3–4/ }),
  ).toContainText("⇧ + 1–8");
  await expect(dialog.getByRole("row", { name: /^Schneller/ })).toContainText(
    "→",
  );
  await expect(
    dialog.getByRole("row", { name: /^Pause \/ Weiter/ }),
  ).toContainText("P");

  await page.keyboard.press("e");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("img")).toHaveAttribute(
    "aria-label",
    "Display aus",
  );
});

test("steer the clock with the left and right arrows and P", async ({
  page,
}) => {
  await page.clock.install();
  await openSimulator(page);
  const speed = (label: string) => page.getByRole("button", { name: label });

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(speed("10×")).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("ArrowLeft");
  await expect(speed("5×")).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("p");
  await expect(page.getByText("Simulation pausiert")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("p");
  await expect(page.getByText("Simulation pausiert")).toBeHidden();
  await expect(speed("5×")).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(speed("1×")).toHaveAttribute("aria-pressed", "true");
});
