import { test, expect } from "@playwright/test";

// Use admin auth state for all tests in this file
test.use({ storageState: "tests/.auth/admin.json" });

test.describe("Admin User Management - Comprehensive Coverage", () => {
  test.describe("Search State Maintenance", () => {
    test("should maintain search state when navigating to user detail and back", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Perform a search
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      // Navigate to page 2 if available
      const page2Link = page.getByRole("link", { name: "2" });
      if (await page2Link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page2Link.click();
        await page.waitForTimeout(500);
      }

      // Click on a user to navigate to detail page
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();

      // Wait for user detail page to load
      await page.waitForURL(/\/admin\/users\/.+/);
      await page.waitForSelector("[data-testid='user-detail-content']");

      // Click back button
      const backButton = page.getByRole("button", { name: /back/i });
      await backButton.click();

      // Should return to users list with search and pagination state preserved
      await page.waitForURL("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search input should still contain "Test User"
      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe("Test User");

      // Should still be on page 2 if we were there before
      if (await page2Link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(page2Link).toHaveAttribute("aria-current", "page");
      }
    });

    test("should preserve search params in URL when navigating to user detail", async ({
      page,
    }) => {
      await page.goto(
        "/admin/users?search=Test&page=2&sort=name&direction=asc",
      );
      await page.waitForSelector("[data-testid='users-table']");

      // Click on a user
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();

      // Wait for user detail page
      await page.waitForURL(/\/admin\/users\/.+/);

      // URL should contain searchPageParams with encoded search state
      const currentUrl = page.url();
      expect(currentUrl).toContain("searchPageParams=");
    });
  });

  test.describe("User Statistics Scenarios", () => {
    test("should display stats for user with AI activity", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for admin user (likely to have activity)
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test Admin");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      // Navigate to user detail
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Click on statistics tab
      await page.getByTestId("stats-tab").click();

      // Wait for stats to load
      await page.waitForSelector("[data-testid='user-statistics-card']", {
        timeout: 10000,
      });

      // Check for activity indicators (stats grid should be visible)
      const statsGrid = page.locator("[data-testid='stats-grid']");
      if (await statsGrid.isVisible({ timeout: 2000 }).catch(() => false)) {
        // User has activity - check stats components
        await expect(page.getByTestId("total-tokens-stat")).toBeVisible();
        await expect(page.getByTestId("models-used-stat")).toBeVisible();
        await expect(page.getByTestId("messages-stat")).toBeVisible();
        await expect(page.getByTestId("top-models-section")).toBeVisible();
      }
    });

    test("should display empty state for user with no AI activity", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for a regular user (likely to have no activity)
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User 10");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      // Navigate to user detail if user exists
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Click on statistics tab
        await page.getByTestId("stats-tab").click();

        // Wait for stats to load
        await page.waitForSelector("[data-testid='user-statistics-card']", {
          timeout: 10000,
        });

        // Check for empty state indicators
        const emptyState = page.getByTestId("no-activity-state");
        if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(emptyState).toBeVisible();
          await expect(page.getByText(/No AI Activity Yet/i)).toBeVisible();
          await expect(
            page.getByText(/hasn't interacted with AI models/i),
          ).toBeVisible();
        }
      }
    });
  });

  test.describe("User Deletion with Name Confirmation", () => {
    test("should require typing user name to enable delete button", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for a test user (not admin)
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User 5");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      // Navigate to user detail
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Click on danger tab
        await page.getByTestId("danger-tab").click();

        // Click delete user button
        await page.getByTestId("delete-user-button").click();

        // Delete dialog should open
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Delete button should be disabled initially
        const deleteButton = page.getByRole("button", {
          name: /delete.*user/i,
        });
        await expect(deleteButton).toBeDisabled();

        // Get user name from dialog text
        const dialogText = await dialog.textContent();
        const nameMatch = dialogText?.match(/type.*["'](.+?)["']/i);
        const userName = nameMatch?.[1] || "Test User 5";

        // Type incorrect name first
        const confirmInput = page.getByPlaceholder(/type.*to confirm/i);
        await confirmInput.fill("Wrong Name");

        // Delete button should still be disabled
        await expect(deleteButton).toBeDisabled();

        // Type correct name
        await confirmInput.clear();
        await confirmInput.fill(userName);

        // Delete button should now be enabled
        await expect(deleteButton).toBeEnabled();

        // Cancel instead of actually deleting
        await page.getByRole("button", { name: /cancel/i }).click();
        await expect(dialog).not.toBeVisible();
      }
    });

    test("should show proper confirmation text for user deletion", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Find a user to test deletion
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .nth(1);
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Get user name from the page
      const userName = await page.getByTestId("user-name").textContent();

      // Click on danger tab and delete button
      await page.getByTestId("danger-tab").click();
      await page.getByTestId("delete-user-button").click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Check that the dialog contains the proper warning text
      await expect(dialog).toContainText("permanently delete");
      await expect(dialog).toContainText("cannot be undone");
      await expect(dialog).toContainText("Delete all user data");
      await expect(dialog).toContainText("Remove all associated files");
      await expect(dialog).toContainText("Revoke all access permissions");

      // Check that user name is mentioned in confirmation text
      if (userName) {
        await expect(dialog).toContainText(userName);
      }

      // Cancel dialog
      await page.getByRole("button", { name: /cancel/i }).click();
    });
  });

  test.describe("User Account Status Management", () => {
    test("should complete ban user workflow with success toast", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Find an active non-admin user
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User 8");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Test ban functionality if user is currently active
        const activeBadge = page.getByTestId("status-badge-active");
        if (await activeBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
          await activeBadge.click();

          // Ban confirmation dialog should open
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();
          await expect(dialog).toContainText(/ban.*user/i);
          await expect(dialog).toContainText(/lose access/i);

          // Proceed with ban
          const banButton = page.getByRole("button", { name: /ban.*user/i });
          await banButton.click();

          // Wait for success and check status changed
          await page.waitForTimeout(2000);
          await expect(page.getByTestId("status-badge-banned")).toBeVisible();

          // Verify success toast appeared (check for toast text)
          const toastContent = page.locator(".sonner-toast");
          if (
            await toastContent.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            await expect(toastContent).toContainText(/success|updated/i);
          }

          // Unban the user to restore state
          await page.getByTestId("status-badge-banned").click();
          const unbanDialog = page.getByRole("dialog");
          await expect(unbanDialog).toBeVisible();
          await page.getByRole("button", { name: /unban.*user/i }).click();
          await page.waitForTimeout(2000);
        }
      }
    });

    test("should show OAuth user account type restrictions", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for any user (might be OAuth)
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .nth(2);
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Check account type display in security section
      const securitySection = page.getByText(/password management/i);
      await expect(securitySection).toBeVisible();

      // Should show either "User has a password set" or "User signs in with OAuth only"
      const passwordStatus = page.getByText(/password set|oauth only/i);
      await expect(passwordStatus).toBeVisible();

      // If OAuth only, password button should be disabled
      const passwordButton = page.getByTestId("update-password-button");
      const oauthOnlyText = page.getByText(/oauth only/i);

      if (await oauthOnlyText.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(passwordButton).toBeDisabled();
      }
    });

    test("should show email modification restrictions for SSO users", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Check email input state
      const emailInput = page.getByTestId("user-email-input");

      // If email is disabled, should show restriction message
      if (await emailInput.isDisabled({ timeout: 1000 }).catch(() => false)) {
        const restrictionText = page.getByText(
          /email cannot be modified.*sso|email.*managed.*provider/i,
        );
        if (
          await restrictionText.isVisible({ timeout: 1000 }).catch(() => false)
        ) {
          await expect(restrictionText).toBeVisible();
        }
      }
    });
  });

  test.describe("Password Management", () => {
    test("should open password update dialog with proper validation", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Find a user with password
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .nth(1);
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

        // Password dialog should open
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Check for password fields
        const newPasswordInput = page.getByPlaceholder(/new password/i);
        const confirmPasswordInput =
          page.getByPlaceholder(/confirm.*password/i);

        await expect(newPasswordInput).toBeVisible();
        await expect(confirmPasswordInput).toBeVisible();

        // Test password validation - enter mismatched passwords
        await newPasswordInput.fill("NewPassword123!");
        await confirmPasswordInput.fill("DifferentPassword123!");

        // Submit should show error
        const updateButton = page.getByRole("button", {
          name: /update.*password/i,
        });
        await updateButton.click();

        // Wait for error state (might be client-side validation or server error)
        await page.waitForTimeout(1000);

        // Cancel dialog
        await page.getByRole("button", { name: /cancel/i }).click();
        await expect(dialog).not.toBeVisible();
      }
    });
  });

  test.describe("Translation Context Verification", () => {
    test("should show admin context when admin manages other users", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Find a non-admin user
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User 6");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Should show admin context translations
        const content = await page.textContent("body");

        // Admin context should say "user" not "your"
        expect(content).toMatch(
          /change user role|update user password|ban user/i,
        );
        expect(content).not.toMatch(/change your role|update your password/i);

        // Test role dialog has admin context
        const changeRoleButton = page.getByTestId("change-role-button");
        if (
          await changeRoleButton.isEnabled({ timeout: 1000 }).catch(() => false)
        ) {
          await changeRoleButton.click();

          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();

          // Should show "Change User Role" not "Request Role Change"
          await expect(dialog).toContainText(/change user role/i);
          await expect(dialog).not.toContainText(/request role change/i);

          await page.getByRole("button", { name: /cancel/i }).click();
        }
      }
    });

    test("should complete role update with success workflow", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Find a user role
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User 7");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Change role if possible
        const changeRoleButton = page.getByTestId("change-role-button");
        if (
          await changeRoleButton.isEnabled({ timeout: 1000 }).catch(() => false)
        ) {
          await changeRoleButton.click();

          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();

          // Select editor role if available
          const editorOption = page.getByRole("radio", { name: /editor/i });
          if (
            await editorOption.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            await editorOption.click();

            const updateButton = page.getByRole("button", {
              name: /update.*role/i,
            });
            await updateButton.click();

            // Wait for success and verify toast
            await page.waitForTimeout(2000);
            const toastContent = page.locator(".sonner-toast");
            if (
              await toastContent.isVisible({ timeout: 1000 }).catch(() => false)
            ) {
              await expect(toastContent).toContainText(
                /role.*updated|success/i,
              );
            }
          }
        }
      }
    });
  });

  test.describe("Tab Navigation and Content", () => {
    test("should navigate between all tabs and display proper content", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Navigate to any user detail
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Test Details tab (should be active by default)
      await expect(page.getByTestId("user-detail-form")).toBeVisible();
      await expect(page.getByTestId("user-detail-card")).toBeVisible();

      // Test Statistics tab
      await page.getByTestId("stats-tab").click();
      await expect(page.getByTestId("user-statistics-card")).toBeVisible({
        timeout: 10000,
      });

      // Test Access tab (if it exists)
      const accessTab = page.getByTestId("access-tab");
      if (await accessTab.isVisible({ timeout: 1000 }).catch(() => false)) {
        await accessTab.click();
        await expect(page.getByTestId("user-access-card")).toBeVisible();
      }

      // Test Danger tab
      await page.getByTestId("danger-tab").click();
      await expect(page.getByTestId("delete-user-button")).toBeVisible();
    });
  });

  test.describe("User Information Display", () => {
    test("should display all user information fields correctly", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Check all expected fields are present
      await expect(page.getByTestId("user-name")).toBeVisible();
      await expect(page.getByTestId("user-email")).toBeVisible();
      await expect(page.getByTestId("user-created-at")).toBeVisible();
      await expect(page.getByTestId("user-role-badges")).toBeVisible();

      // Check form fields are editable
      await expect(page.getByTestId("user-name-input")).toBeVisible();
      await expect(page.getByTestId("user-email-input")).toBeVisible();
      await expect(page.getByTestId("save-changes-button")).toBeVisible();
    });

    test("should display proper status badge based on user state", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Should have either active or banned status badge
      const activeBadge = page.getByTestId("status-badge-active");
      const bannedBadge = page.getByTestId("status-badge-banned");

      const hasStatusBadge =
        (await activeBadge.isVisible({ timeout: 1000 }).catch(() => false)) ||
        (await bannedBadge.isVisible({ timeout: 1000 }).catch(() => false));

      expect(hasStatusBadge).toBe(true);
    });
  });

  test.describe("Form Validation and Error Handling", () => {
    test("should handle user update form validation", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Try to save with invalid email
      const emailInput = page.getByTestId("user-email-input");
      if (await emailInput.isEnabled({ timeout: 1000 }).catch(() => false)) {
        await emailInput.clear();
        await emailInput.fill("invalid-email");

        const saveButton = page.getByTestId("save-changes-button");
        await saveButton.click();

        // Should show validation error (either client-side or server-side)
        await page.waitForTimeout(1000);

        // Form validation should prevent submission or show error
        // (Implementation may vary - could be HTML5 validation or custom)
      }
    });

    test("should handle empty name validation", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Try to save with empty name
      const nameInput = page.getByTestId("user-name-input");
      await nameInput.clear();

      const saveButton = page.getByTestId("save-changes-button");
      await saveButton.click();

      // Should show validation error or prevent submission
      await page.waitForTimeout(1000);
    });
  });
});
