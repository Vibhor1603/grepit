import { test, expect } from '@playwright/test';

test.describe('E2E Smoke Tests', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/grepit/i);
    await expect(page.getByRole('heading', { name: /Understand any codebase/i })).toBeVisible();
  });

  test('should show sign in button', async ({ page }) => {
    await page.goto('/');
    // Clerk renders the button after hydration; wait for it
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible({ timeout: 15000 });
  });
});
