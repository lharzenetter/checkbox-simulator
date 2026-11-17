import { expect, test } from "@playwright/test";
import { logInTrupp01, openSimulator } from "./first-launch";

// The Alarms themselves are stated in acceptance/scenarios/alarm.ts; the mute toggle and the
// clock controls' lock belong to the simulator, not the device, so no scenario can state them.

// 9:54 of simulated time, the first Alarmgrenze, is 59.4 s of real time at 10×;
// verification-scenarios V1
const PAST_FIRST_ALARMGRENZE_AT_10X_MS = 60_000;

test("mute the siren while the Alarm-LED blinks on", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const led = page.getByRole("status", { name: /^Alarm-LED/ });
  await logInTrupp01(page);

  await page.getByRole("button", { name: "10×" }).click();
  await page.clock.runFor(PAST_FIRST_ALARMGRENZE_AT_10X_MS);
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED blinkt");

  await page.getByRole("button", { name: "Stummschalten" }).click();
  await expect(page.getByText("Ton aus")).toBeVisible();
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED blinkt");
});

// decided in "Drop the simulation to real time while an Alarm sounds"
test("lock the speed controls while an Alarm sounds", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const speeds = page.getByRole("group", { name: "Geschwindigkeit" });
  await logInTrupp01(page);

  // `→` reaches the clock before the Alarm, so its having no effect below is the lock.
  await speeds.getByRole("button", { name: "5×" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(speeds.getByRole("button", { name: "10×" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.runFor(PAST_FIRST_ALARMGRENZE_AT_10X_MS);
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ALARM 1\n/);
  await expect(speeds.getByRole("button", { name: "1×" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(speeds.getByRole("button", { name: "10×" })).toBeDisabled();
  await expect(page.getByText("Echtzeit während Alarm")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(speeds.getByRole("button", { name: "1×" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // the lock holds until the second OK ends the Alarm
  await page.keyboard.press("c");
  await expect(speeds.getByRole("button", { name: "10×" })).toBeDisabled();
  await expect(page.getByText("Echtzeit während Alarm")).toBeVisible();
  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
  await expect(speeds.getByRole("button", { name: "1×" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(speeds.getByRole("button", { name: "10×" })).toBeEnabled();
  await expect(page.getByText("Echtzeit während Alarm")).toBeHidden();
});
