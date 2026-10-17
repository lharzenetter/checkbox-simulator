import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openSimulator } from "./first-launch";

async function logInTrupp(page: Page): Promise<void> {
  for (const key of ["1", "c", "2", "c", "c"]) {
    await page.keyboard.press(key);
  }
}

function sessionDialog(page: Page) {
  return page.getByRole("dialog", { name: "Letzte Sitzung fortsetzen?" });
}

test("resume the running session paused after a reload", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  await logInTrupp(page);
  await page.getByRole("button", { name: "10×" }).click();
  await page.clock.runFor(6_000);
  // Stop the page's time, so the session saved before the reload is the one the LCD shows.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
  const beforeReload = await lcd.getAttribute("aria-label");

  await page.reload();
  await sessionDialog(page).getByRole("button", { name: "Fortsetzen" }).click();
  await expect(sessionDialog(page)).toBeHidden();
  await expect(page.getByText("Simulation pausiert")).toBeVisible();
  await expect(lcd).toHaveAttribute("aria-label", beforeReload ?? "");
  await page.clock.runFor(3_000);
  await expect(lcd).toHaveAttribute("aria-label", beforeReload ?? "");

  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.clock.runFor(2_000);
  await expect(lcd).not.toHaveAttribute("aria-label", beforeReload ?? "");
});

test("resume a pending Alarm after a reload", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const led = page.getByRole("status", { name: /^Alarm-LED/ });
  await logInTrupp(page);
  await page.getByRole("button", { name: "10×" }).click();
  // 9:54 of simulated time, the first Alarmgrenze, is 59.4 s of real time at 10×
  await page.clock.runFor(60_000);
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ALARM 1\n/);

  await page.reload();
  await sessionDialog(page).getByRole("button", { name: "Fortsetzen" }).click();
  await expect(page.getByText("Simulation pausiert")).toBeVisible();
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ALARM 1\n/);

  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.clock.runFor(1_000);
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED blinkt");

  // the first OK survives a reload: the Alarm stays silenced, waiting for the second
  await page.keyboard.press("c");
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED aus");
  await page.reload();
  await sessionDialog(page).getByRole("button", { name: "Fortsetzen" }).click();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.clock.runFor(1_000);
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ALARM 1\n/);
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED aus");
  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
});

test("discard the running session after a reload", async ({ page }) => {
  await openSimulator(page);
  const lcd = page.getByRole("img");
  // A Trupp logged in and off leaves an Einsatzprotokoll in the device memory.
  for (const key of ["1", "c", "2", "c", "c", "1", "2", "c"]) {
    await page.keyboard.press(key);
  }
  await logInTrupp(page);
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);

  await page.reload();
  await sessionDialog(page).getByRole("button", { name: "Verwerfen" }).click();
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");
  await expect(sessionDialog(page)).toBeHidden();
  await expect(page.getByText("Simulation pausiert")).toBeHidden();
  const stored = await page.evaluate(() => ({
    deviceMemory: localStorage.getItem("checkbox-simulator/device-memory"),
    session: localStorage.getItem("checkbox-simulator/session"),
  }));
  const { einsatzprotokolle } = JSON.parse(stored.deviceMemory ?? "{}") as {
    einsatzprotokolle: readonly unknown[];
  };
  expect(einsatzprotokolle).toHaveLength(1);
  const { trupps, now } = JSON.parse(stored.session ?? "{}") as {
    trupps: readonly unknown[];
    now: number;
  };
  expect(trupps).toEqual([]);
  // The new session's Uhrzeit is the real local time of day, as the core counts it.
  const timeOfDay = await page.evaluate(
    () => Date.now() - new Date().getTimezoneOffset() * 60_000,
  );
  expect(Math.abs(timeOfDay - now)).toBeLessThan(60_000);
});
