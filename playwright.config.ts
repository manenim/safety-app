import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY= GOOGLE_MAPS_API_KEY= SIGNALCHECK_DEMO_MODE=true SIGNALCHECK_DATA_DIR=.data/e2e NEXT_DIST_DIR=.next-e2e npx next dev --hostname 0.0.0.0 --port 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
