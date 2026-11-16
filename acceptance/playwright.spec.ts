import { test } from "@playwright/test";
import { playwrightWindow } from "./playwright-driver";
import { scenarios } from "./scenario";
import "./scenarios/power-on";
import "./scenarios/login";
import "./scenarios/alarm";
import "./scenarios/logoff";
import "./scenarios/sicherheitstrupp";
import "./scenarios/daueralarm";
import "./scenarios/einsatzstatus";
import "./scenarios/einsatzprotokolle";
import "./scenarios/notausschaltung";

for (const { name, run } of scenarios()) {
  test(name, async ({ page }) => {
    await run(await playwrightWindow(page));
  });
}
