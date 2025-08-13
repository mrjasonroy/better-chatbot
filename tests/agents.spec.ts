import { test, expect } from "@playwright/test";

test.describe("Authenticated App Navigation", () => {
  test("should access dashboard when authenticated", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should stay on dashboard (not redirect to sign-in)
    const currentUrl = page.url();
    expect(!currentUrl.includes("/sign-in")).toBeTruthy();

    // Basic app health check
    await expect(page.locator("body")).toBeVisible();
  });

  test("should access agents page when authenticated", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    // Should stay on agents page
    const currentUrl = page.url();
    expect(currentUrl).toContain("/agents");

    // Should see agents page content
    await expect(page.getByTestId("agents-title")).toBeVisible();
  });

  test("should navigate to new agent page", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    // Should be on the new agent page
    expect(page.url()).toContain("/agent/new");

    // Should see agent creation form
    await expect(page.getByTestId("agent-name-input")).toBeVisible();
  });

  test("should have sidebar with agent list", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should have sidebar with agents section
    const agentsLink = page.locator('a[href="/agents"]');
    await expect(agentsLink).toBeVisible();
  });
});
