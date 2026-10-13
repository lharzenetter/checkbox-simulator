import type { Page } from "@playwright/test";

// Opens the simulator on fresh storage and confirms the first-launch dialog's defaults.
export async function openSimulator(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Übernehmen" }).click();
}
