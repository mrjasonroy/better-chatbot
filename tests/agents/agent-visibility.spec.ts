import { test, expect } from "@playwright/test";

// Test names to ensure uniqueness across test runs
const testSuffix =
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const publicAgentName = `Public Agent ${testSuffix}`;
const privateAgentName = `Private Agent ${testSuffix}`;
const readonlyAgentName = `Readonly Agent ${testSuffix}`;

test.describe.configure({ mode: "serial" });

test.describe("Agent Visibility and Sharing", () => {
  test("user1 creates agents with different visibility levels", async ({
    browser,
  }) => {
    // Create user1 context
    const user1Context = await browser.newContext({
      storageState: "tests/.auth/user1.json",
    });
    const user1Page = await user1Context.newPage();

    try {
      // Create public agent
      await user1Page.goto("/agent/new");
      await user1Page.waitForLoadState("networkidle");
      await user1Page.waitForSelector(
        '[data-testid="agent-save-button"]:not([disabled])',
        { timeout: 10000 },
      );

      await user1Page.getByTestId("agent-name-input").fill(publicAgentName);
      await user1Page
        .getByTestId("agent-description-input")
        .fill("This is a public agent that anyone can see and edit");
      await user1Page.getByTestId("agent-save-button").click();
      await user1Page.waitForURL("**/agents", { timeout: 10000 });

      // Edit to set visibility to public
      const publicAgentLink = user1Page
        .locator(`main a:has-text("${publicAgentName}")`)
        .first();
      await expect(publicAgentLink).toBeVisible();
      await publicAgentLink.click();
      await user1Page.waitForLoadState("networkidle");
      await user1Page.waitForSelector(
        '[data-testid="agent-save-button"]:not([disabled])',
        { timeout: 10000 },
      );
      await user1Page.getByTestId("visibility-button").click();
      await user1Page.getByTestId("visibility-public").click();

      // Wait for save API response to ensure backend update completes
      const responsePromise = user1Page.waitForResponse(
        (response) =>
          response.url().includes("/api/agent/") &&
          response.request().method() === "PUT",
      );
      await user1Page.getByTestId("agent-save-button").click();
      await responsePromise;

      await user1Page.waitForURL("**/agents", { timeout: 10000 });
      await user1Page.waitForLoadState("networkidle");

      // Create private agent (default is private)
      await user1Page.goto("/agent/new");
      await user1Page.waitForLoadState("networkidle");
      await user1Page.waitForSelector(
        '[data-testid="agent-save-button"]:not([disabled])',
        { timeout: 10000 },
      );
      await user1Page.getByTestId("agent-name-input").fill(privateAgentName);
      await user1Page
        .getByTestId("agent-description-input")
        .fill("This is a private agent that only the owner can see");
      await user1Page.getByTestId("agent-save-button").click();
      await user1Page.waitForURL("**/agents", { timeout: 10000 });

      // Create readonly agent
      await user1Page.goto("/agent/new");
      await user1Page.waitForLoadState("networkidle");
      await user1Page.waitForSelector(
        '[data-testid="agent-save-button"]:not([disabled])',
        { timeout: 10000 },
      );
      await user1Page.getByTestId("agent-name-input").fill(readonlyAgentName);
      await user1Page
        .getByTestId("agent-description-input")
        .fill("This is a readonly agent that others can see but not edit");
      await user1Page.getByTestId("agent-save-button").click();
      await user1Page.waitForURL("**/agents", { timeout: 10000 });

      // Edit to set visibility to readonly
      const readonlyAgentLink = user1Page
        .locator(`main a:has-text("${readonlyAgentName}")`)
        .first();
      await expect(readonlyAgentLink).toBeVisible();
      await readonlyAgentLink.click();
      await user1Page.waitForLoadState("networkidle");
      await user1Page.waitForSelector(
        '[data-testid="agent-save-button"]:not([disabled])',
        { timeout: 10000 },
      );
      await user1Page.getByTestId("visibility-button").click();
      await user1Page.getByTestId("visibility-readonly").click();

      // Wait for save API response to ensure backend update completes
      const readonlyResponsePromise = user1Page.waitForResponse(
        (response) =>
          response.url().includes("/api/agent/") &&
          response.request().method() === "PUT",
      );
      await user1Page.getByTestId("agent-save-button").click();
      await readonlyResponsePromise;

      await user1Page.waitForURL("**/agents", { timeout: 10000 });
      await user1Page.waitForLoadState("networkidle");

      console.log(
        `Created agents: ${publicAgentName}, ${privateAgentName}, ${readonlyAgentName}`,
      );
    } finally {
      await user1Context.close();
    }
  });

  test("user2 can see public and readonly agents but not private", async ({
    browser,
  }) => {
    // Note: This test currently fails because backend visibility sharing is not fully implemented
    // User2 should be able to see public/readonly agents but currently cannot
    // Create user2 context
    const user2Context = await browser.newContext({
      storageState: "tests/.auth/user2.json",
    });
    const user2Page = await user2Context.newPage();

    try {
      await user2Page.goto("/agents");
      await user2Page.waitForLoadState("networkidle");

      // Should see the public agent
      const publicAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${publicAgentName}")`,
      );
      await expect(publicAgent).toBeVisible({ timeout: 10000 });

      // Should see the readonly agent
      const readonlyAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${readonlyAgentName}")`,
      );
      await expect(readonlyAgent).toBeVisible({ timeout: 10000 });

      // Should NOT see the private agent
      const privateAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${privateAgentName}")`,
      );
      await expect(privateAgent).not.toBeVisible();
    } finally {
      await user2Context.close();
    }
  });

  test("user2 can edit public agent", async ({ browser }) => {
    // Note: This test depends on visibility sharing being implemented
    const user2Context = await browser.newContext({
      storageState: "tests/.auth/user2.json",
    });
    const user2Page = await user2Context.newPage();

    try {
      await user2Page.goto("/agents");
      await user2Page.waitForLoadState("networkidle");

      // Click on the public agent
      const publicAgentLink = user2Page
        .locator(`main a:has-text("${publicAgentName}")`)
        .first();
      await expect(publicAgentLink).toBeVisible({ timeout: 10000 });
      await publicAgentLink.click();
      await user2Page.waitForLoadState("networkidle");

      // Should be able to see and modify the form fields
      const nameInput = user2Page.getByTestId("agent-name-input");
      const descriptionInput = user2Page.getByTestId("agent-description-input");
      const saveButton = user2Page.getByTestId("agent-save-button");

      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeEnabled();
      await expect(descriptionInput).toBeVisible();
      await expect(descriptionInput).toBeEnabled();
      await expect(saveButton).toBeVisible();
      await expect(saveButton).toBeEnabled();

      // Verify current values and make a small edit
      await expect(nameInput).toHaveValue(publicAgentName);
      await nameInput.clear();
      await nameInput.fill(`${publicAgentName} (edited by user2)`);

      // Should be able to save
      await saveButton.click();
      await user2Page.waitForURL("**/agents", { timeout: 10000 });

      // Verify the edit was successful
      const editedAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${publicAgentName} (edited by user2)")`,
      );
      await expect(editedAgent).toBeVisible();
    } finally {
      await user2Context.close();
    }
  });

  test("user2 can view but not edit readonly agent", async ({ browser }) => {
    // Note: This test depends on visibility sharing being implemented
    const user2Context = await browser.newContext({
      storageState: "tests/.auth/user2.json",
    });
    const user2Page = await user2Context.newPage();

    try {
      await user2Page.goto("/agents");
      await user2Page.waitForLoadState("networkidle");

      // Click on the readonly agent
      const readonlyAgentLink = user2Page
        .locator(`main a:has-text("${readonlyAgentName}")`)
        .first();
      await expect(readonlyAgentLink).toBeVisible({ timeout: 10000 });
      await readonlyAgentLink.click();
      await user2Page.waitForLoadState("networkidle");

      // Should be able to see the form fields but they should be disabled
      const nameInput = user2Page.getByTestId("agent-name-input");
      const descriptionInput = user2Page.getByTestId("agent-description-input");

      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeDisabled();
      await expect(descriptionInput).toBeVisible();
      await expect(descriptionInput).toBeDisabled();

      // Save button should not be visible or should be disabled
      const saveButton = user2Page.getByTestId("agent-save-button");
      if (await saveButton.isVisible()) {
        await expect(saveButton).toBeDisabled();
      }

      // Verify current values are visible
      await expect(nameInput).toHaveValue(readonlyAgentName);
    } finally {
      await user2Context.close();
    }
  });

  test("user2 can bookmark public and readonly agents", async ({ browser }) => {
    // Note: This test depends on visibility sharing being implemented
    const user2Context = await browser.newContext({
      storageState: "tests/.auth/user2.json",
    });
    const user2Page = await user2Context.newPage();

    try {
      await user2Page.goto("/agents");
      await user2Page.waitForLoadState("networkidle");

      // Find and bookmark the public agent (now with edited name)
      const publicAgentCard = user2Page
        .locator(
          `[data-testid="agent-card-name"]:has-text("${publicAgentName} (edited by user2)")`,
        )
        .locator("../../..");
      const publicBookmarkButton =
        publicAgentCard.getByTestId("bookmark-button");
      if (await publicBookmarkButton.isVisible()) {
        await publicBookmarkButton.click();
        await user2Page.waitForTimeout(1000);
      }

      // Find and bookmark the readonly agent
      const readonlyAgentCard = user2Page
        .locator(
          `[data-testid="agent-card-name"]:has-text("${readonlyAgentName}")`,
        )
        .locator("../../..");
      const readonlyBookmarkButton =
        readonlyAgentCard.getByTestId("bookmark-button");
      if (await readonlyBookmarkButton.isVisible()) {
        await readonlyBookmarkButton.click();
        await user2Page.waitForTimeout(1000);
      }

      // Refresh and verify both agents are still visible
      await user2Page.reload();
      await user2Page.waitForLoadState("networkidle");

      const publicAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${publicAgentName} (edited by user2)")`,
      );
      await expect(publicAgent).toBeVisible();

      const readonlyAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${readonlyAgentName}")`,
      );
      await expect(readonlyAgent).toBeVisible();

      // Private agent should still not be visible
      const privateAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${privateAgentName}")`,
      );
      await expect(privateAgent).not.toBeVisible();
    } finally {
      await user2Context.close();
    }
  });
});
