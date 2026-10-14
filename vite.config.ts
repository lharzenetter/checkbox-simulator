import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import packageJson from "./package.json" with { type: "json" };

// GitHub Pages serves the simulator as a project site under the repository name.
const PAGES_BASE = "/checkbox-simulator/";

export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview === true ? PAGES_BASE : "/",
  define: {
    "import.meta.env.APP_VERSION": JSON.stringify(packageJson.version),
  },
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
