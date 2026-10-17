import { expect, test } from "@playwright/test";
import { openSimulator } from "./first-launch";

test("sound an Alarm at the first Alarmgrenze", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const led = page.getByRole("status", { name: /^Alarm-LED/ });
  await expect(lcd).toHaveAttribute("aria-label", "Display aus");

  await page.keyboard.press("1");
  await page.keyboard.press("c");
  await page.keyboard.press("2");
  await page.keyboard.press("c");
  await page.keyboard.press("c");
  // any key closes the Trupp-Ansicht the login shows
  await page.keyboard.press("d");
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED aus");

  await page.getByRole("button", { name: "10×" }).click();
  // 9:54 of simulated time, the first Alarmgrenze, is 59.4 s of real time at 10×
  await page.clock.runFor(59_000);
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
  await page.clock.runFor(1_000);
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^Trupp 01 ALARM 1\nPersonen-Anzahl: 2\nDruck \d+ bar\nRestzeit 00:20:0\d\nRückzugsdruck 50 bar\nAlarmende\nmit OK$/,
  );
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED blinkt");

  await page.getByRole("button", { name: "Stummschalten" }).click();
  await expect(page.getByText("Ton aus")).toBeVisible();
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED blinkt");

  await page.keyboard.press("d");
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ALARM 1\n/);

  // timing-and-alarm-rules §8.4: the first OK silences, the second ends the Alarm
  await page.keyboard.press("c");
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED aus");
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ALARM 1\n/);

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^FF-Musterstadt\nB1- \+ \d\d:\d\d:\d\d\n01 markiert {2}2× Anmarsch {2}00:20:0\d$/,
  );
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED aus");
});

// decided in "Drop the simulation to real time while an Alarm sounds"
test("drop to real time while an Alarm sounds", async ({ page }) => {
  await page.clock.install();
  await openSimulator(page);
  const lcd = page.getByRole("img");
  const speeds = page.getByRole("group", { name: "Geschwindigkeit" });

  await page.keyboard.press("1");
  await page.keyboard.press("c");
  await page.keyboard.press("2");
  await page.keyboard.press("c");
  await page.keyboard.press("c");
  // any key closes the Trupp-Ansicht the login shows
  await page.keyboard.press("d");
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);

  // `→` reaches the clock before the Alarm, so its having no effect below is the lock.
  await speeds.getByRole("button", { name: "5×" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(speeds.getByRole("button", { name: "10×" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.runFor(60_000);
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
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ALARM 1\n/);
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
