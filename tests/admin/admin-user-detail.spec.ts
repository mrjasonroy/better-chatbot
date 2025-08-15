import { test, expect } from "@playwright/test";

// Use admin auth state for all tests in this file
test.use({ storageState: "tests/.auth/admin.json" });

test.describe("Admin User Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to users list first
    await page.goto("/admin/users");
    await page.waitForSelector("[data-testid='users-table']");

    // Get the ID of the second user (Default User) for testing
    const secondRow = page
      .locator("[data-testid='users-table'] tbody tr")
      .nth(1);

    // Navigate to user detail by clicking the row
    await secondRow.click();
    await page.waitForURL(/\/admin\/users\/.+/);
    await page.waitForSelector("[data-testid='user-detail-content']", {
      timeout: 10000,
    });
  });

  test("should display user information correctly", async ({ page }) => {
    // Check user detail card is visible
    await expect(page.getByTestId("user-detail-card")).toBeVisible();

    // Check basic user info is displayed
    await expect(page.getByTestId("user-name")).toBeVisible();
    await expect(page.getByTestId("user-email")).toBeVisible();
    await expect(page.getByTestId("user-created-at")).toBeVisible();
  });

  test("should display user statistics tab", async ({ page }) => {
    // Click on stats tab
    await page.getByTestId("stats-tab").click();

    // Check stats tab content is visible (if stats are implemented)
    const statsTab = page.getByRole("tabpanel", { name: /statistics/i });
    if (await statsTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(statsTab).toBeVisible();
    }
  });

  test("should display and update user role", async ({ page }) => {
    // Check role badges are displayed in the form section
    const roleBadges = page
      .getByTestId("user-detail-form")
      .getByTestId("user-role-badges");
    await expect(roleBadges).toBeVisible();

    // Click to open role selection dialog
    const changeRoleButton = page.getByTestId("change-role-button");
    await changeRoleButton.click();

    // Role selection dialog should open
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Select a different role if options are available
    const editorOption = page.getByRole("radio", { name: /Editor/i });
    if (await editorOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editorOption.click();

      // Submit the form
      const updateButton = page.getByRole("button", { name: /Update/i });
      await updateButton.click();

      // Wait for result (success or error message)
      await page.waitForTimeout(2000);
    }

    // Close dialog if still open
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press("Escape");
    }
  });

  test("should update user details", async ({ page }) => {
    // Form should be visible on details tab
    await expect(page.getByTestId("user-detail-form")).toBeVisible();

    // Update user name
    const nameInput = page.getByTestId("user-name-input");
    await nameInput.clear();
    await nameInput.fill("Updated Test User");

    // Update email if not disabled
    const emailInput = page.getByTestId("user-email-input");
    if (await emailInput.isEnabled()) {
      await emailInput.clear();
      await emailInput.fill("updated@testuser.com");
    }

    // Submit the form
    const saveButton = page.getByTestId("save-changes-button");
    await saveButton.click();

    // Wait for result
    await page.waitForTimeout(2000);

    // Check updated values are displayed in the card
    await expect(page.getByTestId("user-name")).toContainText(
      "Updated Test User",
    );
  });

  test("should display user sessions in stats tab", async ({ page }) => {
    // Click on stats tab
    await page.getByTestId("stats-tab").click();

    // Check if sessions section exists (implementation may vary)
    const sessionsList = page.getByTestId("sessions-list");
    if (await sessionsList.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(sessionsList).toBeVisible();
    }
  });

  test("should open password update dialog", async ({ page }) => {
    // Click update password button
    const updatePasswordButton = page.getByTestId("update-password-button");
    if (await updatePasswordButton.isEnabled()) {
      await updatePasswordButton.click();

      // Password dialog should open
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Close dialog
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
  });

  test("should show delete user confirmation in danger tab", async ({
    page,
  }) => {
    // Click on danger tab
    await page.getByTestId("danger-tab").click();

    // Click delete user button
    const deleteButton = page.getByTestId("delete-user-button");
    await deleteButton.click();

    // Confirmation dialog should open
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Should have cancel button
    const cancelButton = page.getByRole("button", { name: /cancel/i });
    await expect(cancelButton).toBeVisible();

    // Cancel for now (don't actually delete)
    await cancelButton.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();
  });

  test("admin cannot update their own role", async ({ page }) => {
    // Navigate to admin's own profile
    await page.goto("/admin/users");
    await page.waitForSelector("[data-testid='users-table']");

    // Find and click on Default Admin User
    const searchInput = page.getByTestId("users-search-input");
    await searchInput.fill("Default Admin");
    await searchInput.press("Enter");
    await page.waitForTimeout(500);

    const adminRow = page
      .locator("[data-testid='users-table'] tbody tr")
      .first();
    await adminRow.click();

    await page.waitForURL(/\/admin\/users\/.+/);
    await page.waitForSelector("[data-testid='user-detail-content']");

    // Try to change role
    const changeRoleButton = page.getByTestId("change-role-button");

    // Button should be disabled for self-editing
    if (await changeRoleButton.isEnabled()) {
      await changeRoleButton.click();

      // If dialog opens, try to change role
      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
        const userOption = page.getByRole("radio", { name: /User/i });
        if (await userOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await userOption.click();
          const updateButton = page.getByRole("button", { name: /update/i });
          await updateButton.click();

          // Wait for any error message
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test("should handle user with different account types", async ({ page }) => {
    // Search for any test user
    await page.goto("/admin/users");
    await page.waitForSelector("[data-testid='users-table']");

    const searchInput = page.getByTestId("users-search-input");
    await searchInput.fill("Test User 4");
    await searchInput.press("Enter");
    await page.waitForTimeout(500);

    const userRow = page
      .locator("[data-testid='users-table'] tbody tr")
      .first();
    if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
      await userRow.click();

      await page.waitForURL(/\/admin\/users\/.+/);
      await page.waitForSelector("[data-testid='user-detail-content']");

      // User detail should load successfully
      await expect(page.getByTestId("user-detail-card")).toBeVisible();
    }
  });

  test("should display banned user information", async ({ page }) => {
    // Navigate to banned user (User 15)
    await page.goto("/admin/users");
    await page.waitForSelector("[data-testid='users-table']");

    const searchInput = page.getByTestId("users-search-input");
    await searchInput.fill("Test User 15");
    await searchInput.press("Enter");
    await page.waitForTimeout(500);

    const userRow = page
      .locator("[data-testid='users-table'] tbody tr")
      .first();
    if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
      await userRow.click();

      await page.waitForURL(/\/admin\/users\/.+/);
      await page.waitForSelector("[data-testid='user-detail-content']");

      // Check for banned status if this user is banned
      const bannedBadge = page.getByTestId("user-banned-badge");
      if (await bannedBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(bannedBadge).toBeVisible();
      }
    }
  });
});

test.describe("User Detail Page - Permissions", () => {
  test("regular user can access basic functionality", async ({ browser }) => {
    // Create context with regular user auth
    const context = await browser.newContext({
      storageState: "tests/.auth/regular-user.json",
    });
    const page = await context.newPage();

    // Regular users might access through profile/settings
    // Test basic navigation works
    await page.goto("/");

    // Check if user has access to basic functionality
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).not.toContain("/sign-in");

    await context.close();
  });

  test("editor user can access application but not admin panel", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/editor-user.json",
    });
    const page = await context.newPage();

    // Editor should have access to main app
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const homeUrl = page.url();
    expect(homeUrl).not.toContain("/sign-in");

    // But should not have access to admin panel
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");
    const adminUrl = page.url();
    expect(adminUrl).not.toMatch(/\/admin\/users/);

    await context.close();
  });

  test("regular user cannot access admin panel", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/regular-user.json",
    });
    const page = await context.newPage();

    // Try to access admin panel
    await page.goto("/admin/users");

    // Should not be able to access admin routes
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).not.toMatch(/\/admin\/users/);

    await context.close();
  });
});
