import { test as setup, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import * as fs from "node:fs";

function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function registerViaUi(
  page: Page,
  { email, name, password }: { email: string; name: string; password: string },
) {
  await page.goto("/sign-up");

  // Step 1: Email
  await page.locator("#email").fill(email);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: Name
  await page.locator("#name").fill(name);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: Password
  await page.locator("#password").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();

  // Wait for redirect to home (or any authenticated page)
  await page.waitForURL("**/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByText(/New Chat/)).toBeVisible();
}

setup.beforeAll(async () => {
  fs.mkdirSync("tests/.auth", { recursive: true });
});

// Register and save storage for user 1
setup("register user 1 and save storage", async ({ page, context }) => {
  const suffix = uniqueSuffix();
  const email = `playwright.user1.${suffix}@example.com`;
  const name = `Test User 1 ${suffix}`;
  const password = "TestPassword123!";

  await registerViaUi(page, { email, name, password });

  await context.storageState({ path: "tests/.auth/user1.json" });
  // Ensure file exists
  expect(fs.existsSync("tests/.auth/user1.json")).toBeTruthy();
});

// Register and save storage for user 2 in a fresh context
setup("register user 2 and save storage", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const suffix = uniqueSuffix();
  const email = `playwright.user2.${suffix}@example.com`;
  const name = `Test User 2 ${suffix}`;
  const password = "TestPassword123!";

  await registerViaUi(page, { email, name, password });

  await context.storageState({ path: "tests/.auth/user2.json" });
  expect(fs.existsSync("tests/.auth/user2.json")).toBeTruthy();

  await context.close();
});
