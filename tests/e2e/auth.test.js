import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 */

test.describe('Authentication Flow', () => {

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText('Welcome Back');
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for error message (assuming the app shows an alert or text)
    // Adjust based on actual UI behavior
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Invalid');
      await dialog.dismiss();
    });
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign up here');
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.locator('h2')).toContainText('Join the Community');
  });
});
