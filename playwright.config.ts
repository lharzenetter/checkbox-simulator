import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
// The smoke flows run against the production build under its GitHub Pages base path, so a broken
// asset path fails here rather than on the live site.
const BASE_URL = `http://localhost:${String(PORT)}/checkbox-simulator/`;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: BASE_URL },
  projects: [
    { name: "e2e", testDir: "./e2e", use: { ...devices["Desktop Chrome"] } },
    // The same scenarios the in-process driver runs under Vitest, whose `*.test.ts` files this
    // project skips. UTC, so the browser's Uhrzeit is the one the scenarios expect. A scenario
    // that lets hours of simulated time pass steps the page clock thousands of times even at 10×,
    // which takes several times the default 30 s on a CI runner.
    {
      name: "acceptance",
      testDir: "./acceptance",
      testMatch: "*.spec.ts",
      timeout: 120_000,
      use: { ...devices["Desktop Chrome"], timezoneId: "UTC" },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${String(PORT)} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
