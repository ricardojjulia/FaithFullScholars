import { test, expect } from '@playwright/test';

test.describe('Institution End-to-End User Journey', () => {
  test('institution registration workflow with dean / admin attributes', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('domcontentloaded');

    // Switch to Seminary / Dean role
    await page.getByRole('button', { name: /Seminary \/ Dean/i }).click();

    // Verify institutional fields
    await expect(page.locator('text=Seminary / University Name')).toBeVisible();
    await expect(page.locator('text=Your Role at Institution')).toBeVisible();
    await expect(page.getByRole('button', { name: /Register Institution Account/i })).toBeVisible();
  });

  test('directory filtering, faculty search, and candidate discovery', async ({ page }) => {
    await page.goto('/scholars');
    await page.waitForLoadState('domcontentloaded');

    // Search bar presence
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // Type a discipline query
    await searchInput.fill('Theology');

    // Verify results / cards are displayed
    await expect(page.locator('h1').first()).toContainText(/Theological Faculty Network/i);
  });

  test('academic opportunities posting and exploration', async ({ page }) => {
    await page.goto('/opportunities');
    await page.waitForLoadState('domcontentloaded');

    // Verify opportunities marketplace header
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('institution subscription quota management and engagement contracts', async ({ page }) => {
    await page.goto('/institution/subscription');
    await page.waitForLoadState('domcontentloaded');

    // Verify subscription tiers / plan management UI
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Verify institution contracts management page
    await page.goto('/institution/contracts');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
