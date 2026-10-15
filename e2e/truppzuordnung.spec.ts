import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openSimulator } from "./first-launch";

function truppzuordnung(page: Page) {
  return page.getByRole("region", { name: "Truppzuordnung" });
}

function entry(page: Page, truppnummer: number) {
  return page.getByRole("textbox", {
    name: `Truppzuordnung Nr. ${String(truppnummer)}`,
  });
}

async function setTruppzuordnungAnzeigen(
  page: Page,
  shown: boolean,
): Promise<void> {
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page
    .getByRole("checkbox", { name: "Truppzuordnung anzeigen" })
    .setChecked(shown);
  await page.getByRole("button", { name: "Speichern" }).click();
}

test("show a blank Truppzuordnung on first launch", async ({ page }) => {
  await openSimulator(page);
  await expect(truppzuordnung(page)).toBeVisible();
  for (const truppnummer of [1, 2, 3, 4, 5, 6]) {
    await expect(entry(page, truppnummer)).toHaveValue("");
  }
});

test("keep the Truppzuordnung with the running session", async ({ page }) => {
  await openSimulator(page);
  await entry(page, 1).fill("HLF AT – Müller/Schmidt");

  await page.reload();
  await page.getByRole("button", { name: "Fortsetzen" }).click();
  await expect(entry(page, 1)).toHaveValue("HLF AT – Müller/Schmidt");

  await page.reload();
  await page.getByRole("button", { name: "Verwerfen" }).click();
  await expect(entry(page, 1)).toHaveValue("");
});

test("write on the Truppzuordnung without operating the Checkbox", async ({
  page,
}) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");

  await entry(page, 1).click();
  await page.keyboard.type("1 c 2");
  await page.keyboard.press("Enter");
  await expect(entry(page, 1)).toHaveValue("1 c 2");
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");
  await expect(page.getByText("Simulation pausiert")).toBeHidden();

  await entry(page, 1).blur();
  await page.keyboard.press("1");
  await expect(lcd).toHaveAttribute("aria-label", /^Neuen Trupp anmelden:/);
});

test("hide the Truppzuordnung in Einstellungen and keep its entries", async ({
  page,
}) => {
  await openSimulator(page);
  await entry(page, 2).fill("LF WT");

  await setTruppzuordnungAnzeigen(page, false);
  await expect(truppzuordnung(page)).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Fortsetzen" }).click();
  await expect(truppzuordnung(page)).toBeHidden();

  await setTruppzuordnungAnzeigen(page, true);
  await expect(entry(page, 2)).toHaveValue("LF WT");
});

test("drop the Truppzuordnung choice on Abbrechen", async ({ page }) => {
  await openSimulator(page);
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page
    .getByRole("checkbox", { name: "Truppzuordnung anzeigen" })
    .uncheck();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(truppzuordnung(page)).toBeVisible();
});
