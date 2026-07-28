import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Look for test files in the "tests/e2e" directory, relative to this configuration file.
  testDir: "./tests/e2e",

  // Run all tests in parallel.
  fullyParallel: true,

  // Use a single worker to avoid multiple dev servers.
  workers: 1,

  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry"
  },

  // Command to start the development server before running the tests.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI
  }
});