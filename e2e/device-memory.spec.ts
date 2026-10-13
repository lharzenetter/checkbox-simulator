import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

function vehicleField(page: Page, vehicle: string, field: string) {
  return page
    .getByRole("group", { name: vehicle })
    .getByRole("textbox", { name: field });
}

async function logInAndOffTrupp(page: Page): Promise<void> {
  for (const key of ["1", "c", "2", "c", "c", "1", "2", "c"]) {
    await page.keyboard.press(key);
  }
}

test("name the vehicles and keep the device memory", async ({ page }) => {
  await page.goto("/");
  const firstLaunch = page.getByRole("dialog", {
    name: "Willkommen beim Checkbox-Simulator",
  });
  await expect(vehicleField(page, "Fahrzeug 1", "Funkrufname")).toHaveValue(
    "HLF",
  );
  await expect(vehicleField(page, "Fahrzeug 2", "Kurzname")).toHaveValue("LF");
  await vehicleField(page, "Fahrzeug 1", "Funkrufname").fill(
    "Florian Musterstadt 1/46-1",
  );
  await vehicleField(page, "Fahrzeug 1", "Kurzname").fill("HLF 1");
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(firstLaunch).toBeHidden();

  await page.getByRole("button", { name: "Stummschalten" }).click();
  await logInAndOffTrupp(page);

  await page.reload();
  await expect(firstLaunch).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: "Ton aus" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Florian Musterstadt 1/46-1 · Angriffstruppführer auflegen",
    }),
  ).toBeVisible();
  const deviceMemory = await page.evaluate(() =>
    localStorage.getItem("checkbox-simulator/device-memory"),
  );
  const { einsatzprotokolle } = JSON.parse(deviceMemory ?? "{}") as {
    einsatzprotokolle: readonly unknown[];
  };
  expect(einsatzprotokolle).toHaveLength(1);

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await vehicleField(page, "Fahrzeug 1", "Kurzname").fill("HLF Nord");
  await page.getByRole("button", { name: "Speichern" }).click();
  const lcd = page.getByRole("img");
  for (const key of ["1", "c", "2", "c", "c"]) {
    await page.keyboard.press(key);
  }
  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute("aria-label", /\*HLF Nord AT-F/);
  await page.keyboard.press("d");
  await page.keyboard.press("1");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^Trupp 01 ABMELDEN\n\*HLF Nord AT-F markiert\n\*HLF Nord AT-M\n/,
  );

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page
    .getByRole("button", { name: "Auf Werkszustand zurücksetzen" })
    .click();
  await page.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(firstLaunch).toBeVisible();
  await expect(vehicleField(page, "Fahrzeug 1", "Funkrufname")).toHaveValue(
    "HLF",
  );
  await expect(vehicleField(page, "Fahrzeug 1", "Kurzname")).toHaveValue("HLF");
});

test("wipe incompatible stored data", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded") === null) {
      sessionStorage.setItem("seeded", "yes");
      localStorage.setItem("checkbox-simulator/device-memory", "{not json");
      localStorage.setItem("checkbox-simulator/session", "{}");
    }
  });
  await page.goto("/");
  await expect(
    page.getByRole("dialog", { name: "Willkommen beim Checkbox-Simulator" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("checkbox-simulator/session"),
    ),
  ).toBeNull();
});
