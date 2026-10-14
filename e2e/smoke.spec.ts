import { expect, test } from "@playwright/test";
import packageJson from "../package.json" with { type: "json" };

test("the simulator page loads", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle("Checkbox 5+1 Simulator");
  await expect(page.locator("#root main")).toBeAttached();
});

// decided in "Choose the simulator's tech stack and hosting": the hosted app says it is unofficial
test("the footer disclaims the simulator and shows its version", async ({
  page,
}) => {
  await page.goto("./");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText(
    "Inoffizieller Trainingssimulator – nicht von Pölz. Ersetzt keine Ausbildung am Originalgerät.",
  );
  await expect(footer).toContainText(`v${packageJson.version}`);
  await expect(footer.getByRole("link", { name: "Quellcode" })).toHaveAttribute(
    "href",
    "https://github.com/lharzenetter/checkbox-simulator",
  );
});
