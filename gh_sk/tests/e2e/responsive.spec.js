/**
 * E2E Tests: Responsive Layout
 * Tests for User Story 1: Responsive Website Access
 */

import { test, expect } from '@playwright/test';

test.describe('Responsive Layout - Desktop', () => {
  test('should display desktop layout on 1920x1080 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Navigation should be horizontal (not hamburger menu)
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Hamburger menu should NOT be visible on desktop
    const hamburger = page.locator('.hamburger');
    await expect(hamburger).not.toBeVisible();

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should have proper spacing and typography on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Container should have proper max-width
    const container = page.locator('.container').first();
    const boundingBox = await container.boundingBox();

    // Tailwind default max-width container should be less than viewport
    expect(boundingBox.width).toBeLessThan(1920);
  });
});

test.describe('Responsive Layout - Tablet', () => {
  test('should display tablet layout on 768x1024 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Navigation might be collapsed or visible depending on design
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should adapt content layout for tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Content should be readable with proper padding
    const main = page.locator('main');
    await expect(main).toBeVisible();

    const paddingLeft = await main.evaluate((el) =>
      window.getComputedStyle(el).paddingLeft
    );

    // Should have some padding (at least 16px from Tailwind's px-4)
    expect(parseInt(paddingLeft)).toBeGreaterThanOrEqual(16);
  });
});

test.describe('Responsive Layout - Mobile', () => {
  test('should display mobile layout on 375x667 viewport (iPhone SE)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Hamburger menu SHOULD be visible on mobile
    const hamburger = page.locator('.hamburger');
    await expect(hamburger).toBeVisible();

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should toggle mobile menu on hamburger click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Mobile menu should be hidden initially
    const mobileMenu = page.locator('.mobile-menu');
    await expect(mobileMenu).toHaveClass(/hidden|translate-x-full/);

    // Click hamburger to open menu
    const hamburger = page.locator('.hamburger');
    await hamburger.click();

    // Mobile menu should be visible
    await expect(mobileMenu).not.toHaveClass(/hidden|translate-x-full/);

    // Click again to close
    await hamburger.click();
    await expect(mobileMenu).toHaveClass(/hidden|translate-x-full/);
  });

  test('should have readable font sizes on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Body text should be at least 16px for readability
    const body = page.locator('body');
    const fontSize = await body.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );

    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);
  });
});

test.describe('Touch Target Accessibility', () => {
  test('should have touch targets at least 44x44px on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Get all interactive elements (buttons, links)
    const interactiveElements = page.locator('a, button').all();

    for (const element of await interactiveElements) {
      const box = await element.boundingBox();
      if (box) {
        // WCAG 2.1 recommends 44x44px minimum for touch targets
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('hamburger menu should have adequate touch target', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const hamburger = page.locator('.hamburger');
    const box = await hamburger.boundingBox();

    // Hamburger should meet touch target size
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Viewport Meta Tag', () => {
  test('should have proper viewport meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');

    // Should include width=device-width and initial-scale=1
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });
});

test.describe('Cross-breakpoint Navigation', () => {
  test('should maintain navigation functionality across breakpoints', async ({ page }) => {
    // Start at desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Navigation should work on desktop
    const navLinks = page.locator('nav a');
    await expect(navLinks.first()).toBeVisible();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Hamburger should now be visible
    const hamburger = page.locator('.hamburger');
    await expect(hamburger).toBeVisible();

    // Open mobile menu
    await hamburger.click();

    // Navigation links should still be accessible in mobile menu
    const mobileMenuLinks = page.locator('.mobile-menu a');
    await expect(mobileMenuLinks.first()).toBeVisible();
  });
});
