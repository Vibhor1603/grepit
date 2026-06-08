import { test, expect } from '@playwright/test';

test.describe('E2E Smoke Tests', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Vibo/i);
    await expect(page.getByRole('heading', { name: /Analyze/i })).toBeVisible();
  });

  test('should show sign in button', async ({ page }) => {
    await page.goto('/');
    // Depending on your UI, adjust the selector
    const signInButton = page.getByRole('link', { name: /Sign in/i }).first();
    await expect(signInButton).toBeVisible();
  });

  // More complex tests would require mocking Clerk auth or using a test user
  // For a "lean" setup, we keep it minimal unless a test environment is fully ready
});
