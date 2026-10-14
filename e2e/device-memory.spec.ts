import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

function fahrzeugField(page: Page, fahrzeug: string, field: string) {
  return page
    .getByRole("group", { name: fahrzeug })
    .getByRole("textbox", { name: field });
}

async function logInAndOffTrupp(page: Page): Promise<void> {
  for (const key of ["1", "c", "2", "c", "c", "1", "2", "c"]) {
    await page.keyboard.press(key);
  }
}

test("name the Fahrzeuge and keep the device memory", async ({ page }) => {
  await page.goto("./");
  const firstLaunch = page.getByRole("dialog", {
    name: "Willkommen beim Checkbox-Simulator",
  });
  await expect(fahrzeugField(page, "Fahrzeug 1", "Funkrufname")).toHaveValue(
    "1/43",
  );
  await expect(fahrzeugField(page, "Fahrzeug 2", "Kurzname")).toHaveValue("LF");
  await fahrzeugField(page, "Fahrzeug 1", "Funkrufname").fill(
    "Florian Musterstadt 1/46-1",
  );
  await fahrzeugField(page, "Fahrzeug 1", "Kurzname").fill("HLF 1");
  const feuerwehrname = page.getByRole("textbox", { name: "Feuerwehrname" });
  await expect(feuerwehrname).toHaveValue("FF-Musterstadt");
  await feuerwehrname.fill("FF-Übersee");
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(firstLaunch).toBeHidden();
  await page.getByRole("button", { name: "Taste Check" }).click();
  await expect(page.getByRole("img")).toHaveAttribute(
    "aria-label",
    /^FF-Übersee\n/,
  );

  await page.getByRole("button", { name: "Stummschalten" }).click();
  await logInAndOffTrupp(page);

  await page.reload();
  await expect(firstLaunch).toBeHidden();
  await page.getByRole("button", { name: "Verwerfen" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Ton aus" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "HLF 1 AT-F auflegen",
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
  await fahrzeugField(page, "Fahrzeug 1", "Kurzname").fill("HLF Nord");
  await page
    .getByRole("textbox", { name: "Feuerwehrname" })
    .fill("FF-Nordhafen");
  await page.getByRole("button", { name: "Speichern" }).click();
  const lcd = page.getByRole("img");
  await page.getByRole("button", { name: "Taste Check" }).click();
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Nordhafen\n/);
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
  await expect(fahrzeugField(page, "Fahrzeug 1", "Funkrufname")).toHaveValue(
    "1/43",
  );
  await expect(fahrzeugField(page, "Fahrzeug 1", "Kurzname")).toHaveValue(
    "HLF",
  );
  await expect(
    page.getByRole("textbox", { name: "Feuerwehrname" }),
  ).toHaveValue("FF-Musterstadt");
});

test("wipe incompatible stored data", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded") === null) {
      sessionStorage.setItem("seeded", "yes");
      localStorage.setItem("checkbox-simulator/device-memory", "{not json");
      localStorage.setItem("checkbox-simulator/session", "{}");
    }
  });
  await page.goto("./");
  await expect(
    page.getByRole("dialog", { name: "Willkommen beim Checkbox-Simulator" }),
  ).toBeVisible();
  // The wiped session is replaced by the new one the first launch begins.
  const session = await page.evaluate(() =>
    localStorage.getItem("checkbox-simulator/session"),
  );
  expect(JSON.parse(session ?? "{}")).toMatchObject({ trupps: [] });
});
