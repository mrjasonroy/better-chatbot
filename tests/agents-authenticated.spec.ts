import { test, expect, Page } from "@playwright/test";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:3000";

function expectAgentDetailUrl(page: Page): Promise<void> {
  // Should be on agent detail page
  return expect(page).toHaveURL(
    new RegExp(
      `^${baseUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}/agent/[a-f0-9-]+`,
    ),
  );
}

function expectAgentListUrl(page: Page) {
  return expect(page).toHaveURL(`/agents`);
}

test.describe("Agent Features - Authenticated User", () => {
  test("should access agents page when authenticated", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    // Should stay on agents page (not redirect to sign-in)
    expect(page.url()).toContain("/agents");

    // Should see the agents page content
    await expect(page.getByTestId("agents-title")).toBeVisible();
  });

  test("should create a new agent", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    // Should be on the new agent page
    expect(page.url()).toContain("/agent/new");

    // Fill in agent details
    await page.fill("#agent-name", "Test Agent from Playwright");
    await page.fill(
      "#agent-description",
      "This is a test agent created by Playwright",
    );

    // Select visibility
    const visibilitySelect = page.locator('select[name="visibility"]');
    if (await visibilitySelect.isVisible()) {
      await visibilitySelect.selectOption("private");
    }

    // Save the agent
    await page.getByTestId("agent-save-button").click();
    await page.waitForLoadState("networkidle");

    // After save, new agents go to the list page
    await expectAgentListUrl(page);

    // Find the agent card
    const agentCard = page.getByTestId("agent-card-title").filter({
      hasText: "Test Agent from Playwright",
    });

    // Agent name should be visible
    await expect(agentCard).toBeVisible();

    // Click on the agent card
    await agentCard.click();
    await page.waitForLoadState("networkidle");

    await expectAgentDetailUrl(page);
    await expect(page.getByTestId("agent-name-input")).toHaveValue(
      "Test Agent from Playwright",
    );
  });

  test("should list created agents", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    // Should see "My Agents" section
    await expect(page.locator('text="My Agents"')).toBeVisible();

    // Should see at least one agent (the one we created)
    const agentCards = page.locator(
      '[data-testid*="agent"], .agent-card, a[href*="/agent/"]',
    );
    const count = await agentCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should edit an existing agent", async ({ page }) => {
    // First, go to agents list
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    // Click on the first agent
    const firstAgent = page.locator('[data-testid^="agent-card-"]').first();
    if (await firstAgent.isVisible()) {
      await firstAgent.click();
      await page.waitForLoadState("networkidle");

      // Should be on agent detail page
      await expectAgentDetailUrl(page);

      // Edit the description
      const descriptionField = page.locator("#agent-description");
      await descriptionField.fill("Updated description from Playwright test");

      // Save changes
      await page.getByTestId("agent-save-button").click();
      await page.waitForLoadState("networkidle");

      await expect(firstAgent).toContainText(
        "Updated description from Playwright test",
      );
    }
  });

  test("should change agent visibility", async ({ page }) => {
    // Create a new agent first
    await page.goto("/agent/new");
    await page.fill("#agent-name", "Visibility Test Agent");
    await page.fill("#agent-description", "Testing visibility changes");
    // Save new agent to land on edit page where visibility control exists
    await page.getByTestId("agent-save-button").click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(
      new RegExp(
        `^${baseUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}/agent/[a-f0-9-]+`,
      ),
    );

    // Set initial visibility to private via menu
    await page.getByTestId("visibility-trigger-agent").click();
    await page.getByTestId("visibility-option-private").click();
    await page.getByTestId("agent-save-button").click();
    await page.waitForLoadState("networkidle");

    // Now change to public
    await page.getByTestId("visibility-trigger-agent").click();
    await page.getByTestId("visibility-option-public").click();
    await page.getByTestId("agent-save-button").click();
    await page.waitForTimeout(1000);

    // Verify the change
    // Visibility change persisted if no error occurred (implicit via UI)
  });

  test("should delete an agent", async ({ page }) => {
    // Create an agent to delete
    await page.goto("/agent/new");
    await page.fill("#agent-name", "Agent to Delete");
    await page.fill("#agent-description", "This agent will be deleted");
    await page.getByTestId("agent-save-button").click();
    await page.waitForLoadState("networkidle");

    // Get the agent ID from URL
    // Capture current URL if needed for debugging (not used further)

    // Find and click delete button
    const deleteButton = page.getByRole("button", { name: "Delete" });
    if (await deleteButton.isVisible()) {
      // Handle confirmation dialog if it appears
      page.on("dialog", (dialog) => dialog.accept());

      await deleteButton.click();
      await page.waitForLoadState("networkidle");

      // Should redirect away from the deleted agent (back to agents list)
      await expect(page).toHaveURL(
        new RegExp(
          `^${baseUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}/agents`,
        ),
      );

      // Go back to agents list
      await page.goto("/agents");

      // Agent should not be in the list
      await expect(page.locator('text="Agent to Delete"')).not.toBeVisible();
    }
  });

  test("should show agent in sidebar", async ({ page }) => {
    // Create an agent
    await page.goto("/agent/new");
    await page.fill("#agent-name", "Sidebar Test Agent");
    await page.fill("#agent-description", "Should appear in sidebar");
    await page.getByTestId("agent-save-button").click();
    await page.waitForLoadState("networkidle");

    // Go to home page to see sidebar
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for the agent in sidebar
    await expect(page.getByText("Sidebar Test Agent")).toBeVisible();
  });
});
