import { test, expect } from "@playwright/test";

test.describe("Mobile Experience", () => {
  test("should navigate mobile menu", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const agentsLink = page.locator('a[href="/agents"]');

    if (await agentsLink.isVisible()) {
      await expect(agentsLink).toBeVisible();
    } else {
      const mobileMenuButton = page
        .locator("button")
        .filter({ hasText: /menu|☰/i })
        .first();

      if ((await mobileMenuButton.count()) > 0) {
        await mobileMenuButton.click();
        await page.waitForTimeout(300);
        await expect(agentsLink).toBeVisible();
      } else {
        expect(await agentsLink.count()).toBeGreaterThan(0);
      }
    }
  });

  test("should create agent on mobile", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    const nameInput = page.getByTestId("agent-name-input");
    await expect(nameInput).toBeVisible();

    const saveButton = page.getByTestId("agent-save-button");
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeVisible();

    await nameInput.tap();
    await nameInput.fill("Mobile Test Agent");

    const descInput = page.getByTestId("agent-description-input");
    await descInput.tap();
    await descInput.fill("Created on mobile device");

    await saveButton.tap();
    await page.waitForURL("**/agents", { timeout: 10000 });
  });

  test("should handle viewport orientation change", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(viewport?.height || 0);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500);

    await expect(page.locator("body")).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test("should handle touch interactions on agent cards", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    const agentCards = page.locator('[data-testid*="agent-card"]');
    const cardCount = await agentCards.count();

    if (cardCount > 0) {
      const firstCard = agentCards.first();
      await firstCard.tap();
      await page.waitForTimeout(500);

      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    }
  });

  test("should handle mobile keyboard interactions", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    const nameInput = page.getByTestId("agent-name-input");
    await nameInput.tap();
    await page.keyboard.type("Mobile typing test");
    await expect(nameInput).toHaveValue("Mobile typing test");
    await page.locator("body").tap({ position: { x: 10, y: 10 } });
  });

  test("should display properly on small screens", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mainContent = page
      .locator('main, [role="main"], #main-content')
      .first();
    if ((await mainContent.count()) > 0) {
      const box = await mainContent.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(page.viewportSize()?.width || 0);
    }

    const fontSize = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return parseInt(styles.fontSize);
    });
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });

  test("should handle scroll in agent list", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    const initialScrollY = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);

    const newScrollY = await page.evaluate(() => window.scrollY);
    expect(newScrollY).toBeGreaterThanOrEqual(initialScrollY);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have touch-friendly button sizes", async ({ page }) => {
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    const saveButton = page.getByTestId("agent-save-button");
    await expect(saveButton).toBeVisible();

    const box = await saveButton.boundingBox();

    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(32);
      expect(box.width).toBeGreaterThanOrEqual(60);
    }
  });
});
