import { test, expect, Page } from "@playwright/test";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

function uniqueTestName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createAgent(
  page: Page,
  name: string,
  description: string,
): Promise<void> {
  await page.goto("/agent/new");
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("agent-save-button")).toBeEnabled({
    timeout: 10000,
  });

  await page.getByTestId("agent-name-input").fill(name);
  await page.getByTestId("agent-description-input").fill(description);

  const saveButton = page.getByTestId("agent-save-button");
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await page.waitForURL("**/agents", { timeout: 10000 });
}

test.describe("Agent Creation and Sharing Workflow", () => {
  test("should create a new agent successfully", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/agent/new");

    await page.waitForSelector(
      '[data-testid="agent-save-button"]:not([disabled])',
      { timeout: 10000 },
    );
    await page.getByTestId("agent-name-input").fill("Test Agent for Sharing");
    await page
      .getByTestId("agent-description-input")
      .fill("This agent tests the sharing workflow");

    const roleInput = page.locator("#agent-role");
    if ((await roleInput.count()) > 0 && (await roleInput.isEnabled())) {
      await roleInput.fill("software testing and quality assurance");
    }
    const saveButton = page.getByTestId("agent-save-button");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for navigation
    await page.waitForURL("**/agents", { timeout: 10000 });

    // Verify we're on agents list
    expect(page.url()).toContain("/agents");
  });

  test("should show created agent on agents page", async ({ page }) => {
    // Create an agent
    const agentName = uniqueTestName("Test Agent");
    await createAgent(page, agentName, "Should appear in agent list");

    // We should already be on agents page after creation
    expect(page.url()).toContain("/agents");

    // Check if agent appears in the page - more specific selector
    await expect(
      page.locator(`[data-testid*="agent-card-name"]:has-text("${agentName}")`),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show agent in sidebar after creation", async ({ page }) => {
    const agentName = uniqueTestName("Sidebar Agent");
    await createAgent(page, agentName, "Should appear in sidebar");

    // Navigate to home to see sidebar
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Agent should be visible in the sidebar - use specific selector
    await expect(
      page.locator(
        `[data-testid*="sidebar-agent-name"]:has-text("${agentName}")`,
      ),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to agent from agents list", async ({ page }) => {
    const agentName = uniqueTestName("Clickable Agent");
    await createAgent(page, agentName, "Click to open");

    // We're on agents page, find the agent link in the main content area
    const agentLink = page.locator(`main a:has-text("${agentName}")`).first();

    // Check that the agent link is visible first
    await expect(agentLink).toBeVisible({ timeout: 5000 });

    await agentLink.click();
    await page.waitForLoadState("networkidle");

    // Should navigate to some kind of agent page (either edit or chat)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(agent|chat)/);

    // If we're on an agent edit page, check for the name input
    if (currentUrl.includes("/agent/")) {
      await expect(page.getByTestId("agent-name-input")).toHaveValue(agentName);
    }
  });

  test("should edit an existing agent", async ({ page }) => {
    // Create an agent first
    const originalName = uniqueTestName("Original Agent");
    await createAgent(page, originalName, "Will be edited");

    // Click on the agent from the list using a simpler selector
    const agentLink = page
      .locator(`main a:has-text("${originalName}")`)
      .first();
    await agentLink.click();
    await page.waitForLoadState("networkidle");

    // Wait for form to be ready
    await page.waitForSelector(
      '[data-testid="agent-save-button"]:not([disabled])',
      { timeout: 10000 },
    );

    // Edit the name
    const nameInput = page.getByTestId("agent-name-input");
    await nameInput.clear();
    await nameInput.fill("Updated Agent Name");

    // Edit the description
    const descriptionInput = page.locator(
      '[data-testid="agent-description-input"]',
    );
    await descriptionInput.clear();
    await descriptionInput.fill("Updated description after editing");

    // Save changes
    const saveButton = page.getByTestId("agent-save-button");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for redirect back to agents list
    await page.waitForURL("**/agents", { timeout: 10000 });

    // Check the updated agent appears using specific selector
    await expect(
      page.locator(
        `[data-testid*="agent-card-name"]:has-text("Updated Agent Name")`,
      ),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should handle Generate With AI button", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    // Wait for form to be ready
    await page.waitForSelector(
      '[data-testid="agent-save-button"]:not([disabled])',
      { timeout: 10000 },
    );

    // Click Generate With AI button
    const generateButton = page.locator('button:has-text("Generate With AI")');
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Should open a dialog
    await page.waitForTimeout(500);

    // Check if dialog appeared
    const dialog = page.locator('dialog, [role="dialog"]');
    if ((await dialog.count()) > 0) {
      await expect(dialog.first()).toBeVisible();

      // Close the dialog with Escape key
      await page.keyboard.press("Escape");
    }
  });

  test("should handle Create With Example button", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    // Wait for form to be ready
    await page.waitForSelector(
      '[data-testid="agent-save-button"]:not([disabled])',
      { timeout: 10000 },
    );

    // Click Create With Example button
    const exampleButton = page.locator(
      'button:has-text("Create With Example")',
    );
    await expect(exampleButton).toBeVisible();
    await exampleButton.click();

    // Should show dropdown menu
    await page.waitForTimeout(500);

    // Check if dropdown menu appeared
    const dropdownMenu = page.locator('[role="menu"]');
    await expect(dropdownMenu).toBeVisible();

    // Click on Weather example
    const weatherExample = page.locator('text="Weather Checker"');
    if (await weatherExample.isVisible()) {
      await weatherExample.click();

      // Check if name field was populated
      const nameInput = page.getByTestId("agent-name-input");
      const nameValue = await nameInput.inputValue();
      expect(nameValue).toBeTruthy();
      expect(nameValue).toContain("Weather");
    }
  });

  test("should add instructions to agent", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    // Wait for form to be ready
    await page.waitForSelector(
      '[data-testid="agent-save-button"]:not([disabled])',
      { timeout: 10000 },
    );

    // Fill basic info
    await page.getByTestId("agent-name-input").fill("Agent with Instructions");
    await page
      .getByTestId("agent-description-input")
      .fill("Has custom instructions");

    // Add instructions in the system prompt
    const promptTextarea = page.locator(
      '[data-testid="agent-prompt-textarea"]',
    );
    if ((await promptTextarea.count()) > 0) {
      await promptTextarea.fill(
        "You are a helpful assistant that specializes in testing and quality assurance.",
      );
    }

    // Save the agent
    const saveButton = page.getByTestId("agent-save-button");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Should redirect to agents list
    await page.waitForURL("**/agents", { timeout: 10000 });
    expect(page.url()).toContain("/agents");
  });

  test("should navigate between key pages", async ({ page }) => {
    // Test direct navigation to key pages works correctly
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toBe(`${baseUrl}/`);

    await page.goto("/agents");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/agents");

    // Should see the agents page title
    await expect(page.getByTestId("agents-title")).toBeVisible();

    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/agent/new");

    // Should see the agent form
    await expect(page.getByTestId("agent-name-input")).toBeVisible();

    // Navigate back to home
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toBe(`${baseUrl}/`);
  });
});
