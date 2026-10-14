import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
// The smoke flows run against the production build under its GitHub Pages base path, so a broken
// asset path fails here rather than on the live site.
const BASE_URL = `http://localhost:${String(PORT)}/checkbox-simulator/`;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: BASE_URL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm preview --port ${String(PORT)} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
