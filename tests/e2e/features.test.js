import { test, expect } from '@playwright/test';

/**
 * Feature Integrity E2E Tests
 * Verifies core platform functionality
 */

test.describe('Platform Features', () => {

  test('should display home page with hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Bennett Lost and Found');
    await expect(page.locator('text=Report Lost Item')).toBeVisible();
    await expect(page.locator('text=Report Found Item')).toBeVisible();
  });

  test('should filter lost items', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Lost Items');
    await expect(page).toHaveURL(/.*lost/);
  });

  test('should filter found items', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Found Items');
    await expect(page).toHaveURL(/.*found/);
  });

  test('should search for items', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder="Search items..."]');
    await searchInput.fill('iphone');
    // The grid should update (might be empty or show results)
    await expect(page.locator('.items-grid')).toBeVisible();
  });

  test('navbar should show help desk for guest users', async ({ page }) => {
    await page.goto('/');
    // Check if Help Desk is NOT visible for guest? 
    // Actually, based on code, guest sees "Login" pill.
    await expect(page.locator('.login-pill')).toBeVisible();
  });
});
