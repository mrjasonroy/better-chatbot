import { test, expect } from "@playwright/test";

test.describe("User Name Synchronization", () => {
  test.use({ storageState: "tests/.auth/regular-user.json" });

  test("should update sidebar name when user changes their own name", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open user menu to access the dropdown name
    const userMenuButton = page.getByTestId("sidebar-user-button");
    await userMenuButton.click();

    // Get original name from sidebar dropdown
    const sidebarUserName = page.getByTestId("sidebar-user-name");
    await expect(sidebarUserName).toBeVisible();
    const originalName = await sidebarUserName.textContent();
    expect(originalName).toBeTruthy();

    // Close dropdown temporarily
    await page.keyboard.press("Escape");

    // Open user settings
    await userMenuButton.click();

    const settingsOption = page.getByTestId("user-settings-menu-item");
    await settingsOption.click();

    // Update name
    const newName = `Updated User ${Date.now()}`;
    await page.getByTestId("user-name-input").fill(newName);
    await page.getByTestId("save-changes-button").click();

    await page.waitForTimeout(2000);

    // Verify sidebar updated
    await page.getByTestId("sidebar-user-button").click();
    expect(await page.getByTestId("sidebar-user-name").textContent()).toBe(
      newName,
    );

    // Restore original name
    await page.getByTestId("user-settings-menu-item").click();
    await page
      .getByTestId("user-name-input")
      .fill(originalName || "Test Regular User");
    await page.getByTestId("save-changes-button").click();
  });

  test("should update header name when admin changes their own name", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/admin.json",
    });
    const page = await context.newPage();

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Open admin user menu to access the dropdown name
    const userMenuButton = page.getByTestId("sidebar-user-button");
    await userMenuButton.click();

    // Get original name from admin sidebar dropdown
    const adminUserName = page.getByTestId("sidebar-user-name");
    await expect(adminUserName).toBeVisible();
    const originalName = await adminUserName.textContent();

    // Close dropdown temporarily
    await page.keyboard.press("Escape");

    // Open admin user settings
    await userMenuButton.click();

    const settingsOption = page.getByTestId("user-settings-menu-item");
    await settingsOption.click();

    // Update name
    const newAdminName = `Updated Admin ${Date.now()}`;
    await page.getByTestId("user-name-input").fill(newAdminName);
    await page.getByTestId("save-changes-button").click();
    await page.waitForTimeout(2000);

    // Verify sidebar updated
    await page.getByTestId("close-user-settings-button").click();
    await page.getByTestId("sidebar-user-button").click();
    expect(await page.getByTestId("sidebar-user-name").textContent()).toBe(
      newAdminName,
    );

    // Restore original name
    await page.keyboard.press("Escape");
    await page.getByTestId("sidebar-user-button").click();
    await page.getByTestId("user-settings-menu-item").click();
    await page
      .getByTestId("user-name-input")
      .fill(originalName || "Test Admin User");
    await page.getByTestId("save-changes-button").click();

    await context.close();
  });
});
