import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const NOTAUSSCHALTUNG_AUSWAHL =
  "A C H T U N G !\nEinsatz-ABBRUCH\nfuer . . .\n-> markierten Trupp 01\n-> alle Trupps\n-> zurueck";

async function logInTrupp01(page: Page): Promise<void> {
  await expect(page.getByRole("img")).toHaveAttribute(
    "aria-label",
    "Display aus",
  );
  await page.keyboard.press("1");
  await page.keyboard.press("c");
  await page.keyboard.press("2");
  await page.keyboard.press("c");
  await page.keyboard.press("c");
  await expect(page.getByRole("img")).toHaveAttribute(
    "aria-label",
    /^FF-Musterstadt\n/,
  );
}

test("perform a Notausschaltung with the keyboard", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const lcd = page.getByRole("img");
  const roster = page.getByRole("region", { name: "Atemschutzträger" });
  await logInTrupp01(page);

  await page.keyboard.down("d");
  await page.keyboard.down("e");
  await page.clock.runFor(4_000);
  await page.keyboard.up("e");
  await page.keyboard.up("d");
  await expect(lcd).toHaveAttribute("aria-label", NOTAUSSCHALTUNG_AUSWAHL);

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^A C H T U N G !\nWOLLEN SIE/,
  );
  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^FF-Musterstadt\nB1- \+ \d\d:\d\d:\d\d$/,
  );
  await expect(roster).not.toContainText("Trupp 01");
});

test("hold X and Check with two pointers", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await logInTrupp01(page);
  const x = page.getByRole("button", { name: "Taste X" });
  const check = page.getByRole("button", { name: "Taste Check" });

  await x.dispatchEvent("pointerdown", { pointerId: 1, button: 0 });
  await check.dispatchEvent("pointerdown", { pointerId: 2, button: 0 });
  await page.clock.runFor(4_000);
  await expect(page.getByRole("img")).toHaveAttribute(
    "aria-label",
    NOTAUSSCHALTUNG_AUSWAHL,
  );
});

test("let go of a pointer early", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await logInTrupp01(page);
  const x = page.getByRole("button", { name: "Taste X" });
  const check = page.getByRole("button", { name: "Taste Check" });

  await x.dispatchEvent("pointerdown", { pointerId: 1, button: 0 });
  await check.dispatchEvent("pointerdown", { pointerId: 2, button: 0 });
  await page.clock.runFor(2_000);
  await check.dispatchEvent("pointerup", { pointerId: 2, button: 0 });
  await page.clock.runFor(4_000);
  await expect(page.getByRole("img")).toHaveAttribute(
    "aria-label",
    /^FF-Musterstadt\n/,
  );
});
