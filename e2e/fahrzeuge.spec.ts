import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

function fahrzeug(page: Page, legend: string) {
  return page.getByRole("group", { name: legend });
}

test("add four Fahrzeuge, tap them with Shift, and remove one", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("./");
  const add = page.getByRole("button", { name: "Fahrzeug hinzufügen" });
  await add.click();
  await add.click();
  await expect(add).toBeDisabled();
  await expect(
    fahrzeug(page, "Fahrzeug 3").getByRole("textbox", { name: "Kurzname" }),
  ).toHaveValue("DLK");
  await expect(
    fahrzeug(page, "Fahrzeug 4").getByRole("textbox", { name: "Funkrufname" }),
  ).toHaveValue("1/23");
  await page.getByRole("button", { name: "Übernehmen" }).click();

  const dlkAtF = page.getByRole("button", { name: "DLK AT-F auflegen" });
  await expect(dlkAtF).toHaveAttribute("aria-keyshortcuts", "Shift+1");
  await expect(
    page.getByRole("button", { name: "TLF WT-M auflegen" }),
  ).toHaveAttribute("aria-keyshortcuts", "Shift+8");
  for (const key of ["Shift+Digit1", "c", "Shift+Digit2", "c", "c"]) {
    await page.keyboard.press(key);
  }
  await expect(dlkAtF).toHaveAttribute("aria-description", "Trupp 01");

  await page.getByRole("button", { name: "Einstellungen" }).click();
  const dlk = fahrzeug(page, "Fahrzeug 3");
  await expect(
    dlk.getByRole("button", { name: "Fahrzeug entfernen" }),
  ).toBeDisabled();
  await expect(dlk).toContainText("angemeldet");
  await fahrzeug(page, "Fahrzeug 1")
    .getByRole("button", { name: "Fahrzeug entfernen" })
    .click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(
    page.getByRole("button", { name: "HLF AT-F auflegen" }),
  ).toBeHidden();

  // The DLK moved up to position 2, so its Tallys are on 5 to 8 now.
  const lcd = page.getByRole("img");
  await page.keyboard.press("6");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^Trupp 01 ABMELDEN\n\*DLK AT-F\n\*DLK AT-M markiert\n/,
  );
  await page.keyboard.press("5");
  await page.keyboard.press("c");
  await expect(dlkAtF).toHaveAttribute("aria-description", "nicht angemeldet");

  await page.reload();
  await page.getByRole("button", { name: "Verwerfen" }).click();
  await expect(
    page.getByRole("region", { name: "Atemschutzträger" }).getByRole("heading"),
  ).toHaveText(["LF1/45", "DLK1/33", "TLF1/23"]);
});

test("keep the last Fahrzeug and unique Kurznamen", async ({ page }) => {
  await page.goto("./");
  const submit = page.getByRole("button", { name: "Übernehmen" });

  await fahrzeug(page, "Fahrzeug 2")
    .getByRole("textbox", { name: "Kurzname" })
    .fill(" hlf");
  await expect(fahrzeug(page, "Fahrzeug 2")).toContainText(
    "Kurzname bereits vergeben",
  );
  await expect(submit).toBeDisabled();

  await fahrzeug(page, "Fahrzeug 2")
    .getByRole("button", { name: "Fahrzeug entfernen" })
    .click();
  await expect(submit).toBeEnabled();
  const last = fahrzeug(page, "Fahrzeug 1");
  await expect(
    last.getByRole("button", { name: "Fahrzeug entfernen" }),
  ).toBeDisabled();
  await expect(last).toContainText("Mindestens ein Fahrzeug muss bleiben.");
});

test("wipe stored Fahrzeuge of the old shape", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded") === null) {
      sessionStorage.setItem("seeded", "yes");
      localStorage.setItem(
        "checkbox-simulator/device-memory",
        JSON.stringify({
          version: 1,
          vehicles: [
            { funkrufname: "1/43", kurzname: "HLF" },
            { funkrufname: "1/45", kurzname: "LF" },
          ],
          firstLaunchDone: true,
          muted: false,
          einsatzprotokolle: [],
        }),
      );
    }
  });
  await page.goto("./");
  await expect(
    page.getByRole("dialog", { name: "Willkommen beim Checkbox-Simulator" }),
  ).toBeVisible();
});
