import { test, expect } from "@playwright/test";

test.describe("App Load and Basic Navigation", () => {
  test("should load the application successfully", async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for the page to be ready
    await page.waitForLoadState("networkidle");

    // Check if the app loads without crashing
    await expect(page.locator("body")).toBeVisible();

    // Check for basic app structure (this will depend on your landing page)
    // Look for common elements that should be present
    const hasContent = await page
      .locator('main, [role="main"], .main-content')
      .count();
    if (hasContent > 0) {
      await expect(
        page.locator('main, [role="main"], .main-content').first(),
      ).toBeVisible();
    }
  });

  test("should handle authentication redirect gracefully", async ({ page }) => {
    // Try to access a protected route
    await page.goto("/agents");

    // Wait for any redirects to complete
    await page.waitForLoadState("networkidle");

    // The app should either:
    // 1. Show a login form/button
    // 2. Redirect to a sign-in page
    // 3. Show some kind of authentication UI
    // We're just testing that it doesn't crash
    await expect(page.locator("body")).toBeVisible();

    // Look for common auth elements
    const authElements = await page
      .locator(
        'button:has-text("Sign in"), button:has-text("Login"), a:has-text("Sign in"), a:has-text("Login"), [data-testid*="auth"], [data-testid*="login"]',
      )
      .count();

    // If we found auth elements, that's good - the auth system is working
    if (authElements > 0) {
      console.log(
        "Authentication system detected - app is handling protected routes correctly",
      );
    }
  });

  test("should load CSS and JavaScript correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check that styles are loaded by looking for styled elements
    const bodyStyles = await page.locator("body").evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        fontFamily: styles.fontFamily,
        margin: styles.margin,
      };
    });

    // Basic check that CSS is loading (font family shouldn't be default browser font)
    expect(bodyStyles.fontFamily).not.toBe("Times");
    expect(bodyStyles.fontFamily).not.toBe("serif");
  });

  test("should have no console errors on load", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out known non-critical errors (like network errors for missing API keys)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes("API key") &&
        !error.includes("fetch") &&
        !error.includes("network") &&
        !error.includes("401") &&
        !error.includes("403"),
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Responsive Design", () => {
  test("should work on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check that the page is still usable on mobile
    await expect(page.locator("body")).toBeVisible();

    // Look for mobile-specific elements like hamburger menu
    const mobileNav = await page
      .locator(
        '[data-testid*="mobile"], button[aria-label*="menu"], .hamburger',
      )
      .count();
    if (mobileNav > 0) {
      console.log("Mobile navigation detected");
    }
  });

  test("should work on tablet viewport", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
  });
});
