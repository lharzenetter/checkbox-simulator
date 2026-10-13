import { expect, test } from "@playwright/test";

test("the simulator page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Checkbox 5+1 Simulator");
  await expect(page.locator("#root main")).toBeAttached();
});
