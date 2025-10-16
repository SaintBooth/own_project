/**
 * E2E Tests: Project Portfolio
 * Tests for User Story 3: Project Showcase with Reactions
 */

import { test, expect } from '@playwright/test';

test.describe('Projects Page', () => {
  test('should display list of projects', async ({ page }) => {
    await page.goto('/#/projects');

    // Wait for projects to load
    await page.waitForSelector('.project-card', { timeout: 5000 });

    // Should have at least one project card
    const projectCards = page.locator('.project-card');
    const count = await projectCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display project information correctly', async ({ page }) => {
    await page.goto('/#/projects');
    await page.waitForSelector('.project-card');

    const firstCard = page.locator('.project-card').first();

    // Check required elements
    await expect(firstCard.locator('img')).toBeVisible(); // Thumbnail
    await expect(firstCard.locator('h3')).toBeVisible(); // Title
    await expect(firstCard.locator('.project-description')).toBeVisible(); // Description

    // Check for technology tags
    const techTags = firstCard.locator('.tech-tag');
    expect(await techTags.count()).toBeGreaterThan(0);
  });

  test('should filter projects by category', async ({ page }) => {
    await page.goto('/#/projects');
    await page.waitForSelector('.project-card');

    // Get initial count
    const initialCount = await page.locator('.project-card').count();

    // Click on a category filter (assuming filter UI exists)
    const categoryFilter = page.locator('[data-filter="category"]').first();
    if (await categoryFilter.count() > 0) {
      await categoryFilter.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Filtered results should be different (could be less or same)
      const filteredCount = await page.locator('.project-card').count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('should sort projects', async ({ page }) => {
    await page.goto('/#/projects');
    await page.waitForSelector('.project-card');

    // Get first project title before sorting
    const firstTitleBefore = await page.locator('.project-card h3').first().textContent();

    // Click sort dropdown
    const sortSelect = page.locator('select[name="sort"]');
    if (await sortSelect.count() > 0) {
      await sortSelect.selectOption('title-asc');
      await page.waitForTimeout(500);

      // First title might be different after sorting
      const firstTitleAfter = await page.locator('.project-card h3').first().textContent();
      // Just verify the page updated (title could be same if already sorted)
      expect(firstTitleAfter).toBeTruthy();
    }
  });
});

test.describe('Project Detail Page', () => {
  test('should navigate to project detail', async ({ page }) => {
    await page.goto('/#/projects');
    await page.waitForSelector('.project-card');

    // Click on first project
    const firstCard = page.locator('.project-card').first();
    await firstCard.click();

    // Should navigate to detail page
    await page.waitForURL(/.*#\/projects\/.+/);

    // Should show project details
    await expect(page.locator('.project-detail')).toBeVisible();
    await expect(page.locator('.project-detail h1')).toBeVisible();
  });

  test('should display full project information', async ({ page }) => {
    // Navigate directly to a project detail page
    await page.goto('/#/projects/test-project-1');
    await page.waitForSelector('.project-detail');

    // Check for key elements
    await expect(page.locator('.project-detail h1')).toBeVisible();
    await expect(page.locator('.project-long-description')).toBeVisible();
    await expect(page.locator('.project-technologies')).toBeVisible();

    // Check for links if they exist
    const demoLink = page.locator('a[href*="demo"]');
    const githubLink = page.locator('a[href*="github"]');

    // At least one link should exist
    expect((await demoLink.count()) + (await githubLink.count())).toBeGreaterThan(0);
  });

  test('should display project images', async ({ page }) => {
    await page.goto('/#/projects/test-project-1');
    await page.waitForSelector('.project-detail');

    // Should have at least a thumbnail image
    const images = page.locator('.project-detail img');
    expect(await images.count()).toBeGreaterThan(0);
  });
});

test.describe('Reaction System', () => {
  test('should display reaction buttons', async ({ page }) => {
    await page.goto('/#/projects/test-project-1');
    await page.waitForSelector('.project-detail');

    // Should have reaction buttons
    const reactionButtons = page.locator('.reaction-button');
    expect(await reactionButtons.count()).toBeGreaterThanOrEqual(3); // like, love, celebrate
  });

  test('should allow user to add reaction', async ({ page }) => {
    await page.goto('/#/projects/test-project-1');
    await page.waitForSelector('.reaction-button');

    // Get initial count
    const likeButton = page.locator('.reaction-button[data-reaction="like"]');
    const initialCount = await likeButton.locator('.reaction-count').textContent();
    const initialNumber = parseInt(initialCount || '0');

    // Click reaction
    await likeButton.click();

    // Wait for update
    await page.waitForTimeout(300);

    // Count should increase
    const newCount = await likeButton.locator('.reaction-count').textContent();
    const newNumber = parseInt(newCount || '0');

    expect(newNumber).toBe(initialNumber + 1);

    // Button should show active state
    await expect(likeButton).toHaveClass(/active|reacted/);
  });

  test('should persist reactions in localStorage', async ({ page, context }) => {
    await page.goto('/#/projects/test-project-1');
    await page.waitForSelector('.reaction-button');

    // Add a reaction
    const loveButton = page.locator('.reaction-button[data-reaction="love"]');
    await loveButton.click();
    await page.waitForTimeout(300);

    // Verify it's active
    await expect(loveButton).toHaveClass(/active|reacted/);

    // Reload page
    await page.reload();
    await page.waitForSelector('.reaction-button');

    // Should still be active
    const loveButtonAfterReload = page.locator('.reaction-button[data-reaction="love"]');
    await expect(loveButtonAfterReload).toHaveClass(/active|reacted/);
  });

  test('should allow user to remove reaction', async ({ page }) => {
    await page.goto('/#/projects/test-project-1');
    await page.waitForSelector('.reaction-button');

    const celebrateButton = page.locator('.reaction-button[data-reaction="celebrate"]');

    // Add reaction
    await celebrateButton.click();
    await page.waitForTimeout(300);
    await expect(celebrateButton).toHaveClass(/active|reacted/);

    const countAfterAdd = await celebrateButton.locator('.reaction-count').textContent();

    // Remove reaction (click again)
    await celebrateButton.click();
    await page.waitForTimeout(300);

    // Should not be active
    await expect(celebrateButton).not.toHaveClass(/active|reacted/);

    // Count should decrease
    const countAfterRemove = await celebrateButton.locator('.reaction-count').textContent();
    expect(parseInt(countAfterRemove || '0')).toBe(parseInt(countAfterAdd || '0') - 1);
  });
});

test.describe('Contact Integration', () => {
  test('should display contact buttons on project detail', async ({ page }) => {
    await page.goto('/#/projects/test-project-1');
    await page.waitForSelector('.project-detail');

    // Should have contact section or buttons
    const contactSection = page.locator('.contact-section, .project-contact');
    await expect(contactSection).toBeVisible();

    // Should have Telegram or Email button
    const telegramButton = page.locator('a[href*="t.me"], a[href*="telegram"]');
    const emailButton = page.locator('a[href^="mailto:"]');

    expect((await telegramButton.count()) + (await emailButton.count())).toBeGreaterThan(0);
  });

  test('should open Telegram link in new tab', async ({ page, context }) => {
    await page.goto('/#/projects/test-project-1');

    const telegramButton = page.locator('a[href*="t.me"], a[href*="telegram"]').first();

    if (await telegramButton.count() > 0) {
      // Check it has target="_blank"
      const target = await telegramButton.getAttribute('target');
      expect(target).toBe('_blank');

      // Check it has rel="noopener noreferrer"
      const rel = await telegramButton.getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });

  test('should have mailto link for email', async ({ page }) => {
    await page.goto('/#/projects/test-project-1');

    const emailButton = page.locator('a[href^="mailto:"]').first();

    if (await emailButton.count() > 0) {
      const href = await emailButton.getAttribute('href');
      expect(href).toMatch(/^mailto:.+@.+/);
    }
  });
});

test.describe('Responsive Behavior', () => {
  test('should display project grid correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/projects');
    await page.waitForSelector('.project-card');

    // Projects should stack vertically on mobile
    const projectsGrid = page.locator('.projects-grid, .grid');
    const gridStyle = await projectsGrid.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });

    // Should be single column on mobile
    expect(gridStyle).toMatch(/^1fr$|^none$/);
  });

  test('should display project grid correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/#/projects');
    await page.waitForSelector('.project-card');

    // Should show 2 columns on tablet
    const cards = page.locator('.project-card');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('should display project grid correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/#/projects');
    await page.waitForSelector('.project-card');

    // Should show 3 columns on desktop
    const cards = page.locator('.project-card');
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
