import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const basePath = process.env.GITHUB_ACTIONS ? "/Battle-Royale-JUJU/" : "/";
const localChromeShell = "/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell";
const executablePath = !process.env.GITHUB_ACTIONS && fs.existsSync(localChromeShell)
  ? localChromeShell
  : undefined;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:4173${basePath}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: `http://127.0.0.1:4173${basePath}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
