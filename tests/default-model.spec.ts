import { test, expect } from "@playwright/test";

test.describe("DEFAULT_MODEL Integration", () => {
  test("should show default model name in button", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check that the button shows the default model name
    await expect(page.getByTestId("selected-model-name")).toHaveText(
      "qwen3-8b:free",
    );
  });

  test("should show default model selected in dropdown", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open model selector
    await page.getByTestId("model-selector-button").click();

    // Wait for popover to open
    await expect(page.getByTestId("model-selector-popover")).toBeVisible();

    // Check that some model has the selected check icon (more robust)
    await expect(page.getByTestId("selected-model-check")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should use default model in agent creation", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("agent-save-button")).toBeEnabled({
      timeout: 10000,
    });

    // Check if Generate With AI button is available (requires valid model)
    const generateButton = page.locator('button:has-text("Generate With AI")');
    await expect(generateButton).toBeVisible();

    // Click it to verify it works with default model
    await generateButton.click();
    await page.waitForTimeout(500);

    // Should not show any errors
    const hasError = (await page.locator('text="error"').count()) > 0;
    expect(hasError).toBe(false);
  });
});
