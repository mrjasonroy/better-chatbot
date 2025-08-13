import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load environment variables
if (process.env.CI) {
  config({ path: ".env.test" });
} else {
  config();
}

export default defineConfig({
  testDir: "./tests",
  /* Maximum time one test can run for. */
  timeout: 30 * 1000, // Increased timeout for agent operations
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 4 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "dot" : "list",
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
    // Setup project to create both users' authentication states
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Tests that run as authenticated user 1 (can run in parallel)
    {
      name: "authenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user1.json",
      },
      dependencies: ["setup"],
      testIgnore: [
        /.*\.setup\.ts/,
        /.*unauthenticated.*\.spec\.ts/,
        /.*mobile.*\.spec\.ts/,
      ],
    },

    // Tests that run as authenticated user 2 (can run in parallel with user1)
    {
      name: "authenticated-user2",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user2.json",
      },
      dependencies: ["setup"],
      testIgnore: [
        /.*\.setup\.ts/,
        /.*unauthenticated.*\.spec\.ts/,
        /.*mobile.*\.spec\.ts/,
      ],
    },

    // Unauthenticated tests (can run in parallel with everything)
    {
      name: "unauthenticated",
      use: {
        ...devices["Desktop Chrome"],
      },
      testMatch: /.*unauthenticated.*\.spec\.ts/,
    },

    // Mobile tests - Chrome with mobile viewport (faster than real mobile browsers)
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 }, // iPhone SE size
        storageState: "tests/.auth/user1.json",
      },
      dependencies: ["setup"],
      testMatch: /.*mobile.*\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm build:local && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for build and start
  },
});
