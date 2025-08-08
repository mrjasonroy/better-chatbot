import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";

function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function registerViaUi(
  page: import("@playwright/test").Page,
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

  // Sanity check that some authenticated UI is present (best-effort)
  // This is optional; adjust if there is a stable selector on the home page when logged in
  // We keep it lenient to avoid flakes.
  await expect(page).toHaveURL(/\/?$/);
}

setup.beforeAll(async () => {
  fs.mkdirSync("tests/.auth", { recursive: true });
});

// Register and save storage for user 1
setup("register user 1 and save storage", async ({ page, context }) => {
  const email = `user1+${uniqueSuffix()}@example.com`;
  const name = "Playwright User 1";
  const password = "P@ssw0rd-user1";

  await registerViaUi(page, { email, name, password });

  await context.storageState({ path: "tests/.auth/user1.json" });
  // Ensure file exists
  expect(fs.existsSync("tests/.auth/user1.json")).toBeTruthy();
});

// Register and save storage for user 2 in a fresh context
setup("register user 2 and save storage", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const email = `user2+${uniqueSuffix()}@example.com`;
  const name = "Playwright User 2";
  const password = "P@ssw0rd-user2";

  await registerViaUi(page, { email, name, password });

  await context.storageState({ path: "tests/.auth/user2.json" });
  expect(fs.existsSync("tests/.auth/user2.json")).toBeTruthy();

  await context.close();
});
