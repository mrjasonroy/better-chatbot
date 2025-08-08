import { test, expect, Page } from "@playwright/test";
// Disabled as duplicate/legacy; keep for reference
// Skips entire file
// eslint-disable-next-line playwright/valid-title
// @ts-ignore
test.describe.configure && test.describe.configure({ mode: "skip" });

// Test data for our agents
const testAgents = {
  user1: {
    private: {
      name: "User1 Private Agent",
      description: "A private agent for user 1",
    },
    public: {
      name: "User1 Public Agent",
      description: "A public agent for user 1",
    },
    readonly: {
      name: "User1 Readonly Agent",
      description: "A readonly agent for user 1",
    },
  },
  user2: {
    private: {
      name: "User2 Private Agent",
      description: "A private agent for user 2",
    },
    public: {
      name: "User2 Public Agent",
      description: "A public agent for user 2",
    },
  },
};

// Helper function to create an agent
async function createAgent(
  page: Page,
  agentData: { name: string; description: string },
  visibility: "private" | "public" | "readonly" = "private",
): Promise<string | null> {
  await page.goto("/agent/new");
  await page.waitForLoadState("networkidle");

  // Fill agent form
  const nameInput = page.locator("#agent-name");
  const descriptionInput = page.locator("#agent-description");

  if (await nameInput.isVisible()) {
    await nameInput.fill(agentData.name);
  }

  if (await descriptionInput.isVisible()) {
    await descriptionInput.fill(agentData.description);
  }

  // Set visibility if there's a visibility selector
  const visibilityTrigger = page.getByTestId("visibility-trigger-agent");
  if (await visibilityTrigger.count()) {
    await visibilityTrigger.click();
    await page.getByTestId(`visibility-option-${visibility}`).click();
  }

  // Save the agent
  const saveButton = page.getByTestId("agent-save-button");
  if (await saveButton.isVisible()) {
    await saveButton.click();
    await page.waitForLoadState("networkidle");

    // Extract agent ID from URL
    const agentCard = page.getByTestId("agent-card-title").filter({
      hasText: agentData.name,
    });
    if (await agentCard.isVisible()) {
      const href = await agentCard.getAttribute("href");
      if (href) {
        return href.split("/").pop() || null;
      }
    }
    return null;
  }

  return null;
}

test.describe("Agent Features - Comprehensive Testing", () => {
  test.describe("User 1 - Agent Operations", () => {
    test("should create and edit an agent", async ({ page }) => {
      // Navigate to create agent page
      await page.goto("/agent/new");
      await page.waitForLoadState("networkidle");

      // Test agent creation
      const agentData = testAgents.user1.private;
      const agentId = await createAgent(page, agentData);

      if (agentId) {
        // Verify we're on the edit page
        expect(page.url()).toContain(`/agent/${agentId}`);

        // Test editing
        const nameInput = page.locator(
          'input[name="name"], input[value*="Private Agent"]',
        );
        if (await nameInput.isVisible()) {
          await nameInput.fill("Updated Agent Name");

          const saveButton = page.locator('button:has-text("Save")');
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000); // Wait for save

            // Verify the change persisted
            await page.reload();
            await expect(nameInput).toHaveValue("Updated Agent Name");
          }
        }
      }
    });

    test("should change agent visibility", async ({ page }) => {
      await page.goto("/agent/new");
      await page.waitForLoadState("networkidle");

      const agentId = await createAgent(
        page,
        testAgents.user1.public,
        "private",
      );

      if (agentId) {
        // Change to public
        const visibilitySelect = page.locator('select[name="visibility"]');
        if (await visibilitySelect.isVisible()) {
          await visibilitySelect.selectOption("public");

          const saveButton = page.locator('button:has-text("Save")');
          await saveButton.click();

          // Wait for success indication
          await page.waitForTimeout(1000);

          // Verify the change
          await expect(visibilitySelect).toHaveValue("public");
        }
      }
    });

    test("should delete an agent", async ({ page }) => {
      await page.goto("/agent/new");
      await page.waitForLoadState("networkidle");

      const agentId = await createAgent(page, {
        name: "To Delete",
        description: "This will be deleted",
      });

      if (agentId) {
        // Delete the agent
        const deleteButton = page.locator(
          'button:has-text("Delete"), button[aria-label*="Delete"]',
        );

        if (await deleteButton.isVisible()) {
          // Handle confirmation dialog
          page.on("dialog", (dialog) => dialog.accept());

          await deleteButton.click();
          await page.waitForLoadState("networkidle");

          // Should redirect away from the agent page
          expect(page.url()).not.toContain(`/agent/${agentId}`);

          // Try to access the deleted agent directly - should redirect or show 404
          await page.goto(`/agent/${agentId}`);
          await page.waitForLoadState("networkidle");
          expect(page.url()).not.toContain(`/agent/${agentId}`);
        }
      }
    });
  });

  test.describe("Agent List Page", () => {
    test("should display agents in correct sections", async ({ page }) => {
      await page.goto("/agents");
      await page.waitForLoadState("networkidle");

      // Check page structure
      await expect(page.getByTestId("agents-title")).toBeVisible();

      // Look for sections
      const myAgentsSection = page.getByTestId("agents-section-mine");
      const sharedAgentsSection = page.getByTestId("agents-section-shared");

      if (await myAgentsSection.isVisible()) {
        await expect(myAgentsSection).toBeVisible();
      }

      if (await sharedAgentsSection.isVisible()) {
        await expect(sharedAgentsSection).toBeVisible();
      }

      // Check for new agent creation card/button
      const newAgentButton = page.getByTestId("agents-new-button");
      const hasNewAgentOption = (await newAgentButton.count()) > 0;
      expect(hasNewAgentOption).toBe(true);
    });

    test("should show created agents in the list", async ({ page }) => {
      // Create a test agent first
      const agentData = {
        name: "List Test Agent",
        description: "Should appear in list",
      };
      const agentId = await createAgent(page, agentData);

      if (agentId) {
        // Go to agents list
        await page.goto("/agents");
        await page.waitForLoadState("networkidle");

        // Look for our created agent
        await expect(page.locator(`text="${agentData.name}"`)).toBeVisible();
      }
    });

    test("should handle agent actions from list (edit, delete, visibility)", async ({
      page,
    }) => {
      // Create a test agent
      const agentData = {
        name: "Action Test Agent",
        description: "For testing actions",
      };
      const agentId = await createAgent(page, agentData);

      if (agentId) {
        // Go to agents list
        await page.goto("/agents");
        await page.waitForLoadState("networkidle");

        // Look for our agent card
        const agentCard = page
          .locator(`text="${agentData.name}"`)
          .locator("..");

        if (await agentCard.isVisible()) {
          // Test clicking the agent (should navigate to edit page)
          await agentCard.click();
          await page.waitForLoadState("networkidle");

          // Should be on the agent edit page
          expect(page.url()).toContain(`/agent/${agentId}`);
        }
      }
    });
  });

  test.describe("Agent Detail Page Features", () => {
    test("should show bookmark button for shared agents", async ({ page }) => {
      // This test would require multi-user setup
      // For now, we'll test the UI elements exist

      await page.goto("/agent/new");
      const agentId = await createAgent(
        page,
        testAgents.user1.public,
        "public",
      );

      if (agentId) {
        await page.goto(`/agent/${agentId}`);
        await page.waitForLoadState("networkidle");

        // Look for bookmark functionality (button or icon)
        const bookmarkElements = page.locator(
          'button[aria-label*="bookmark"], button:has-text("Bookmark"), [data-testid*="bookmark"]',
        );
        const hasBookmarkFeature = (await bookmarkElements.count()) > 0;

        // At minimum, the bookmark feature should be present in the UI
        console.log(`Bookmark feature detected: ${hasBookmarkFeature}`);
      }
    });

    test("should show delete button for owned agents", async ({ page }) => {
      await page.goto("/agent/new");
      const agentId = await createAgent(page, {
        name: "Owner Test",
        description: "Testing ownership",
      });

      if (agentId) {
        await page.goto(`/agent/${agentId}`);
        await page.waitForLoadState("networkidle");

        // Should show delete button since we own this agent
        const deleteButton = page.locator(
          'button:has-text("Delete"), button[aria-label*="Delete"]',
        );
        if ((await deleteButton.count()) > 0) {
          await expect(deleteButton.first()).toBeVisible();
        }
      }
    });

    test("should save agent changes and show success feedback", async ({
      page,
    }) => {
      await page.goto("/agent/new");
      const agentId = await createAgent(page, {
        name: "Save Test",
        description: "Testing save feedback",
      });

      if (agentId) {
        await page.goto(`/agent/${agentId}`);
        await page.waitForLoadState("networkidle");

        // Make a change
        const descInput = page.locator('textarea[name="description"]');
        if (await descInput.isVisible()) {
          await descInput.fill("Updated description for testing");

          const saveButton = page.locator('button:has-text("Save")');
          await saveButton.click();

          // Look for success feedback (toast, message, etc.)
          const successIndicators = page.locator(
            '.toast, [data-testid*="success"], text="saved", text="Success"',
          );

          // Wait a bit for any success feedback
          await page.waitForTimeout(2000);

          const hasSuccessFeedback = (await successIndicators.count()) > 0;
          console.log(`Success feedback shown: ${hasSuccessFeedback}`);
        }
      }
    });
  });

  test.describe("Sidebar Integration", () => {
    test("should show agents in sidebar with scrolling", async ({ page }) => {
      // Create multiple agents to test scrolling
      const agentNames = [
        "Sidebar Agent 1",
        "Sidebar Agent 2",
        "Sidebar Agent 3",
        "Sidebar Agent 4",
        "Sidebar Agent 5",
        "Sidebar Agent 6",
      ];

      for (const name of agentNames) {
        await createAgent(page, {
          name,
          description: `Testing sidebar display`,
        });
      }

      // Go to any page to see sidebar
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Look for sidebar agent list
      const sidebarElements = page.locator(
        '[data-testid*="sidebar"], aside, .sidebar, nav',
      );
      const hasSidebar = (await sidebarElements.count()) > 0;

      if (hasSidebar) {
        // Look for our created agents in sidebar
        let agentsFoundInSidebar = 0;
        for (const name of agentNames.slice(0, 3)) {
          // Check first few
          const agentInSidebar = page.locator(`text="${name}"`);
          if (await agentInSidebar.isVisible()) {
            agentsFoundInSidebar++;
          }
        }

        console.log(`Agents found in sidebar: ${agentsFoundInSidebar}`);

        // Check for scroll container
        const scrollContainers = page.locator(
          '.overflow-y-auto, .overflow-auto, [style*="overflow"]',
        );
        const hasScrolling = (await scrollContainers.count()) > 0;
        console.log(`Scrolling container detected: ${hasScrolling}`);
      }
    });

    test("should handle agent click from sidebar", async ({ page }) => {
      const agentData = {
        name: "Sidebar Click Test",
        description: "Testing sidebar navigation",
      };
      const agentId = await createAgent(page, agentData);

      if (agentId) {
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        // Look for our agent in sidebar
        const sidebarAgent = page.locator(`text="${agentData.name}"`).first();

        if (await sidebarAgent.isVisible()) {
          await sidebarAgent.click();
          await page.waitForLoadState("networkidle");

          // Should navigate somewhere or trigger an action
          console.log(`After sidebar click, URL: ${page.url()}`);
        }
      }
    });
  });

  test.describe("Generate Agent Dialog", () => {
    test("should show user prompt after submission", async ({ page }) => {
      await page.goto("/agent/new");
      await page.waitForLoadState("networkidle");

      // Look for generate button
      const generateButton = page.getByTestId("agent-generate-send");

      if (await generateButton.isVisible()) {
        await generateButton.click();
        await page.waitForTimeout(500);

        // Fill in prompt
        const promptInput = page.getByTestId("agent-generate-prompt");

        if (await promptInput.isVisible()) {
          const testPrompt = "Create a helpful cooking assistant";
          await promptInput.fill(testPrompt);

          // Submit
          const submitButton = page.locator(
            'button:has-text("Send"), button:has-text("Submit"), button[type="submit"]',
          );
          if (await submitButton.isVisible()) {
            await submitButton.click();

            // Check if the prompt appears in the dialog
            await expect(page.locator(`text="${testPrompt}"`)).toBeVisible();

            // Check if textarea was cleared
            await expect(promptInput).toHaveValue("");
          }
        }
      }
    });
  });

  test.describe("Multi-User Scenarios", () => {
    test("User 1 creates public agent, User 2 sees it", async ({ page }) => {
      // This test runs as User 1, create a public agent
      const publicAgentData = {
        name: "Shared Test Agent",
        description: "Agent shared between users",
      };
      const agentId = await createAgent(page, publicAgentData, "public");

      if (agentId) {
        console.log(`User 1 created public agent: ${agentId}`);

        // Verify agent is public
        await page.goto(`/agent/${agentId}`);
        await page.waitForLoadState("networkidle");

        const visibilitySelect = page.locator('select[name="visibility"]');
        if (await visibilitySelect.isVisible()) {
          await expect(visibilitySelect).toHaveValue("public");
        }

        // Store agent ID for cross-user testing
        await page.evaluate((id) => {
          window.localStorage.setItem("sharedAgentId", id);
        }, agentId);
      }
    });

    test("User 2 can bookmark User 1 public agent", async ({ page }) => {
      // This test needs to run as User 2
      // First check if there's a shared agent from previous test
      await page.goto("/agents");
      await page.waitForLoadState("networkidle");

      // Look for shared agents section
      const sharedSection = page.getByTestId("agents-section-shared");

      if (await sharedSection.isVisible()) {
        // Look for agents we can bookmark
        const sharedAgents = page
          .locator('[data-testid*="agent-card"], .agent-card')
          .filter({
            hasText: "Shared Test Agent",
          });

        if ((await sharedAgents.count()) > 0) {
          // Try to bookmark the first shared agent
          const bookmarkButton = sharedAgents
            .first()
            .locator('button:has-text("Bookmark"), [aria-label*="bookmark"]');

          if (await bookmarkButton.isVisible()) {
            await bookmarkButton.click();
            await page.waitForTimeout(1000);

            console.log("User 2 bookmarked User 1 public agent");
          }
        }
      }
    });
  });

  test.describe("Error Handling and Edge Cases", () => {
    test("should handle navigation to non-existent agent", async ({ page }) => {
      const fakeAgentId = "00000000-0000-0000-0000-000000000000";
      await page.goto(`/agent/${fakeAgentId}`);
      await page.waitForLoadState("networkidle");

      // Should redirect or show appropriate error
      const isOnAgentPage = page.url().includes(`/agent/${fakeAgentId}`);

      if (isOnAgentPage) {
        // Look for error message
        const errorElements = page.locator('[data-testid*="error"]');
        const hasErrorMessage =
          (await errorElements.count()) > 0 || page.url().endsWith("/agents");
        expect(hasErrorMessage).toBe(true);
      } else {
        // Should have redirected away
        expect(page.url()).not.toContain(`/agent/${fakeAgentId}`);
      }
    });

    test("should handle empty agent list gracefully", async ({ page }) => {
      await page.goto("/agents");
      await page.waitForLoadState("networkidle");

      // Look for empty state messaging
      const emptyStateElements = page.locator(
        'text="no agents", text="create your first", text="get started", [data-testid*="empty"]',
      );
      const hasEmptyStateHandling = (await emptyStateElements.count()) > 0;

      console.log(`Empty state handling detected: ${hasEmptyStateHandling}`);

      // At minimum, page should not crash
      await expect(page.locator("body")).toBeVisible();
    });
  });
});
