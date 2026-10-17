import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openSimulator } from "./first-launch";

function truppzuordnung(page: Page) {
  return page.getByRole("region", { name: "Truppzuordnung" });
}

function entry(page: Page, truppnummer: number, column: "Ort" | "Auftrag") {
  return page.getByRole("textbox", {
    name: `Truppzuordnung Nr. ${String(truppnummer)} ${column}`,
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
  await expect(truppzuordnung(page)).toContainText(/Nr\.\s*Ort\s*Auftrag/);
  for (const truppnummer of [1, 2, 3, 4, 5, 6]) {
    await expect(entry(page, truppnummer, "Ort")).toHaveValue("");
    await expect(entry(page, truppnummer, "Auftrag")).toHaveValue("");
  }
});

test("keep the Truppzuordnung with the running session", async ({ page }) => {
  await openSimulator(page);
  await entry(page, 1, "Ort").fill("1. OG links");
  await entry(page, 1, "Auftrag").fill("Menschenrettung");

  await page.reload();
  await page.getByRole("button", { name: "Fortsetzen" }).click();
  await expect(entry(page, 1, "Ort")).toHaveValue("1. OG links");
  await expect(entry(page, 1, "Auftrag")).toHaveValue("Menschenrettung");

  await page.reload();
  await page.getByRole("button", { name: "Verwerfen" }).click();
  await expect(entry(page, 1, "Ort")).toHaveValue("");
  await expect(entry(page, 1, "Auftrag")).toHaveValue("");
});

test("write on the Truppzuordnung without operating the Checkbox", async ({
  page,
}) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");

  for (const column of ["Ort", "Auftrag"] as const) {
    await entry(page, 1, column).click();
    await page.keyboard.type("1 c 2");
    await page.keyboard.press("Enter");
    await expect(entry(page, 1, column)).toHaveValue("1 c 2");
    await expect(lcd).toHaveAttribute("aria-label", "Display aus");
    await expect(page.getByText("Simulation pausiert")).toBeHidden();
  }

  await entry(page, 1, "Auftrag").blur();
  await page.keyboard.press("1");
  await expect(lcd).toHaveAttribute("aria-label", /^Neuen Trupp anmelden:/);
});

test("hide the Truppzuordnung in Einstellungen and keep its entries", async ({
  page,
}) => {
  await openSimulator(page);
  await entry(page, 2, "Auftrag").fill("Brandbekämpfung");

  await setTruppzuordnungAnzeigen(page, false);
  await expect(truppzuordnung(page)).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Fortsetzen" }).click();
  await expect(truppzuordnung(page)).toBeHidden();

  await setTruppzuordnungAnzeigen(page, true);
  await expect(entry(page, 2, "Auftrag")).toHaveValue("Brandbekämpfung");
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

for (const [layout, width] of [
  ["beside the housing", 1280],
  ["above the housing", 390],
] as const) {
  test(`fit both columns of the Truppzuordnung ${layout}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openSimulator(page);
    const paper = await truppzuordnung(page).boundingBox();
    expect(paper).not.toBeNull();
    for (const truppnummer of [1, 2, 3, 4, 5, 6]) {
      const ort = await entry(page, truppnummer, "Ort").boundingBox();
      const auftrag = await entry(page, truppnummer, "Auftrag").boundingBox();
      if (paper === null || ort === null || auftrag === null) {
        throw new Error(
          `Truppzuordnung Nr. ${String(truppnummer)} not laid out`,
        );
      }
      // Room for a short Ort or Auftrag such as "1. OG links" without scrolling the field.
      expect(ort.width).toBeGreaterThanOrEqual(80);
      expect(auftrag.width).toBeGreaterThanOrEqual(80);
      expect(auftrag.x).toBeGreaterThanOrEqual(ort.x + ort.width - 1);
      expect(auftrag.x + auftrag.width).toBeLessThanOrEqual(
        paper.x + paper.width,
      );
    }
  });
}
