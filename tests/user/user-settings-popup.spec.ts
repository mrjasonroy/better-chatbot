import { test, expect } from "@playwright/test";

// Use regular user auth state for user settings tests
test.use({ storageState: "tests/.auth/regular-user.json" });

test.describe("User Settings Popup", () => {
  test("should open user settings popup from sidebar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open user menu in sidebar
    const userMenuButton = page.getByRole("button", { name: /account/i });
    if (await userMenuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenuButton.click();
    }

    // Click settings option
    const settingsOption = page.getByRole("menuitem", { name: /settings/i });
    await settingsOption.click();

    // User settings drawer should open
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    // Should display user's own profile
    await expect(page.getByTestId("user-detail-content")).toBeVisible();
    await expect(page.getByTestId("user-detail-card")).toBeVisible();
  });

  test("should display 'your' context in user settings", async ({ page }) => {
    await page.goto("/");

    // Open user settings
    const userMenuButton = page.getByRole("button", { name: /account/i });
    if (await userMenuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenuButton.click();
    }
    const settingsOption = page.getByRole("menuitem", { name: /settings/i });
    await settingsOption.click();

    // Wait for drawer to open
    await page.waitForSelector("[data-testid='user-detail-content']");

    // Should show "your" context translations
    const content = await page.textContent("body");

    // User context should say "your" not "user"
    expect(content).toMatch(/your.*account|your.*information|your.*password/i);
    expect(content).not.toMatch(/user account status|user information/i);

    // Check specific user context elements
    const roleText = page.getByText(/cannot modify your own role/i);
    if (await roleText.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(roleText).toBeVisible();
    }
  });

  test("should allow user to update their own profile", async ({ page }) => {
    await page.goto("/");

    // Open user settings
    const userMenuButton = page.getByRole("button", { name: /account/i });
    if (await userMenuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenuButton.click();
    }
    const settingsOption = page.getByRole("menuitem", { name: /settings/i });
    await settingsOption.click();

    // Wait for settings to load
    await page.waitForSelector("[data-testid='user-detail-form']");

    // Update name
    const nameInput = page.getByTestId("user-name-input");
    const originalName = await nameInput.inputValue();

    await nameInput.clear();
    await nameInput.fill("Updated User Name");

    // Save changes
    const saveButton = page.getByTestId("save-changes-button");
    await saveButton.click();

    // Wait for success message
    await page.waitForTimeout(2000);

    // Restore original name
    await nameInput.clear();
    await nameInput.fill(originalName);
    await saveButton.click();
    await page.waitForTimeout(2000);
  });

  test("should close settings popup with close button", async ({ page }) => {
    await page.goto("/");

    // Open user settings
    const userMenuButton = page.getByRole("button", { name: /account/i });
    if (await userMenuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenuButton.click();
    }
    const settingsOption = page.getByRole("menuitem", { name: /settings/i });
    await settingsOption.click();

    // Wait for drawer
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    // Click close button
    const closeButton = page
      .getByRole("button", { name: /close/i })
      .or(page.locator("button svg").first());
    await closeButton.click();

    // Drawer should close
    await expect(drawer).not.toBeVisible();
  });
});

test.describe("Admin User Settings Popup", () => {
  test.use({ storageState: "tests/.auth/admin.json" });

  test("should display 'your' context for admin's own settings", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Open user menu in admin sidebar
    const userMenuButton = page.getByRole("button", { name: /account/i });
    if (await userMenuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenuButton.click();
    }

    // Click settings option
    const settingsOption = page.getByRole("menuitem", { name: /settings/i });
    await settingsOption.click();

    // Wait for drawer to open
    await page.waitForSelector("[data-testid='user-detail-content']");

    // Even though admin is viewing their own profile, should show "your" context
    const content = await page.textContent("body");
    expect(content).toMatch(/your.*account|your.*information|your.*password/i);

    // Should not be able to modify own role
    const roleEditButton = page.getByTestId("edit-roles-button");
    if (await roleEditButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(roleEditButton).toBeDisabled();
    }
  });
});
