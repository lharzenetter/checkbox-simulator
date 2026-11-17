import { expect, test } from "@playwright/test";
import { openSimulator } from "./first-launch";

// The login itself is stated in acceptance/scenarios/login.ts; dragging a Tally onto Check and
// the Roster's note on its Tallys are UI that no scenario can state.
test("drag a Tally onto Check to join the Anmeldefenster", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const roster = page.getByRole("region", { name: "Atemschutzträger" });

  await page.keyboard.press("1");
  await page.keyboard.press("c");
  await roster
    .getByRole("button", { name: "HLF AT-M auflegen" })
    .dragTo(page.getByRole("button", { name: "Taste Check" }));
  await expect(lcd).toHaveAttribute("aria-label", /\*HLF AT-F\n\*HLF AT-M\n/);
  await expect(roster).toContainText("Anmeldung Trupp 01");
});
