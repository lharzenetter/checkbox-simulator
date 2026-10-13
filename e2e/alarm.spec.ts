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
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED aus");

  await page.getByRole("button", { name: "10×" }).click();
  // 9:54 of simulated time, the first Alarmgrenze, is 59.4 s of real time at 10×
  await page.clock.runFor(59_000);
  await expect(lcd).toHaveAttribute("aria-label", /^FF-Musterstadt\n/);
  await page.clock.runFor(1_000);
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^Trupp 01 ALARM\n\*HLF AT-F\n\*HLF AT-M\nDruck \d+ bar\nRestzeit 00:20:0\d\nAlarmende\nmit OK$/,
  );
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED blinkt");

  await page.getByRole("button", { name: "Stummschalten" }).click();
  await expect(page.getByText("Ton aus")).toBeVisible();
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED blinkt");

  await page.keyboard.press("d");
  await expect(lcd).toHaveAttribute("aria-label", /^Trupp 01 ALARM\n/);

  await page.keyboard.press("c");
  await expect(lcd).toHaveAttribute(
    "aria-label",
    /^FF-Musterstadt\nB1- \+ \d\d:\d\d:\d\d\n01 markiert {2}2× Anmarsch {2}00:20:0\d$/,
  );
  await expect(led).toHaveAttribute("aria-label", "Alarm-LED aus");
});
