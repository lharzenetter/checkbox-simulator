import { expect, test } from "@playwright/test";
import { logInTrupp01, openSimulator } from "./first-launch";

const NOTAUSSCHALTUNG_AUSWAHL =
  "A C H T U N G !\nEinsatz-ABBRUCH\nfuer . . .\n-> markierten Trupp 01\n-> alle Trupps\n-> zurueck";

// The Notausschaltung is stated in acceptance/scenarios/notausschaltung.ts; holding its two Keys
// through the key map is a keyboard flow no scenario can state.
test("perform a Notausschaltung with the keyboard", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const roster = page.getByRole("region", { name: "Atemschutzträger" });
  await logInTrupp01(page);

  await page.keyboard.down("d");
  await page.keyboard.down("e");
  // Ticks come once per animation frame, so the hold runs a frame past the Haltezeit before the
  // keys go up.
  await page.clock.runFor(4_100);
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

// No scenario keeps one Key held while the other lets go; each pointer counts on its own.
test("let go of one pointer early", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
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
