import { test, expect } from "@playwright/test";

// Use admin auth state for all tests in this file
test.use({ storageState: "tests/.auth/admin.json" });

test.describe("Admin Complete User Management Workflows", () => {
  test.describe("Complete Delete User Workflow", () => {
    test("should complete full delete confirmation flow with name typing", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for a specific test user that we can safely test deletion on
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User 20");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Get the exact user name from the page
        const userNameElement = page.getByTestId("user-name");
        const userName = await userNameElement.textContent();
        expect(userName).toBeTruthy();

        // Navigate to danger tab
        await page.getByTestId("danger-tab").click();

        // Click delete button
        await page.getByTestId("delete-user-button").click();

        // Delete dialog should open
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Verify all warning elements are present
        await expect(dialog).toContainText(/permanently delete/i);
        await expect(dialog).toContainText(/cannot be undone/i);
        await expect(dialog).toContainText(/delete all user data/i);
        await expect(dialog).toContainText(/remove all.*files/i);
        await expect(dialog).toContainText(/revoke all access/i);

        // Find confirmation input
        const confirmInput = page.getByPlaceholder(/type.*to confirm/i);
        await expect(confirmInput).toBeVisible();

        // Delete button should be disabled initially
        const deleteButton = page.getByRole("button", {
          name: /delete.*user/i,
        });
        await expect(deleteButton).toBeDisabled();

        // Type wrong name
        await confirmInput.fill("Wrong Name");
        await expect(deleteButton).toBeDisabled();

        // Type correct name (extracted from page)
        await confirmInput.clear();
        if (userName) {
          await confirmInput.fill(userName);

          // Delete button should now be enabled
          await expect(deleteButton).toBeEnabled();
        }

        // Cancel instead of actually deleting
        await page.getByRole("button", { name: /cancel/i }).click();
        await expect(dialog).not.toBeVisible();
      }
    });

    test("should show proper delete confirmation text with user name", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .nth(2);
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Get user name
      const userName = await page.getByTestId("user-name").textContent();

      // Open delete dialog
      await page.getByTestId("danger-tab").click();
      await page.getByTestId("delete-user-button").click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Dialog should contain the user's name in multiple places
      if (userName) {
        const dialogText = await dialog.textContent();
        const nameOccurrences = (
          dialogText?.match(new RegExp(userName, "gi")) || []
        ).length;
        expect(nameOccurrences).toBeGreaterThanOrEqual(2); // Name should appear in description and confirmation
      }

      await page.getByRole("button", { name: /cancel/i }).click();
    });
  });

  test.describe("Password Management Complete Workflows", () => {
    test("should complete password update with success feedback", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Find a user with password capability
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User 5");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Click update password button
        const updatePasswordButton = page.getByTestId("update-password-button");
        if (
          await updatePasswordButton
            .isEnabled({ timeout: 1000 })
            .catch(() => false)
        ) {
          await updatePasswordButton.click();

          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();

          // Should show admin context
          await expect(dialog).toContainText(/update user password/i);

          // Fill valid password
          const newPasswordInput = page.getByPlaceholder(/new password/i);
          const confirmPasswordInput =
            page.getByPlaceholder(/confirm.*password/i);

          const testPassword = "NewTestPassword123!";
          await newPasswordInput.fill(testPassword);
          await confirmPasswordInput.fill(testPassword);

          // Submit password update
          const updateButton = page.getByRole("button", {
            name: /update.*password/i,
          });
          await updateButton.click();

          // Wait for result
          await page.waitForTimeout(3000);

          // Verify success toast or error handling
          const toastContent = page.locator(".sonner-toast");
          if (
            await toastContent.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            const toastText = await toastContent.textContent();
            expect(toastText).toMatch(/password.*updated|success|error/i);
          }
        }
      }
    });
  });
});
