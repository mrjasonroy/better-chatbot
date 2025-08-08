import { test, expect } from "@playwright/test";

// Note: This file is kept for backward compatibility but most tests
// have been moved to agent-sharing.spec.ts with updated selectors
// These tests assume the user is already authenticated

test.describe("Legacy Agent Tests - Authenticated User", () => {
  test("should access agents page when authenticated", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    // Should stay on agents page (not redirect to sign-in)
    expect(page.url()).toContain("/agents");

    // The page should load without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("should navigate to new agent page", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    // Should be on the new agent page
    expect(page.url()).toContain("/agent/new");

    // Should see agent creation form
    await expect(page.locator("text=Agent").first()).toBeVisible();
  });
});
