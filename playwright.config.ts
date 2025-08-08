import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  /* Maximum time one test can run for. */
  timeout: 15 * 1000,
  /* Run tests in files in parallel */
  fullyParallel: false, // Changed to false to run setup first
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "dot" : "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",

    /* Ignore HTTPS errors for localhost */
    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  globalTeardown: "./tests/teardown.global.ts",

  /* Configure projects for major browsers */
  projects: [
    // Setup project to create users and authentication state
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Tests that run as authenticated user 1
    {
      name: "authenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user1.json",
      },
      dependencies: ["setup"],
    },
    // Tests that run as authenticated user 2 (optional)
    {
      name: "authenticated-user2",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user2.json",
      },
      dependencies: ["setup"],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm build:local && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
