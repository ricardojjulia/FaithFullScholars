import { test, expect } from '@playwright/test';

test.describe('Public Academic Discovery Journey', () => {
  test('loads the homepage with modern branding and navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/FaithFull Scholars/);
    await expect(page.locator('text=FaithFull Scholars').first()).toBeVisible();
    await expect(page.locator('text=The Academic & Teaching Network').first()).toBeVisible();

    // Verify navigation links
    const scholarsLink = page.locator('a[href="/scholars"]').first();
    await expect(scholarsLink).toBeVisible();
  });

  test('navigates to faculty directory and renders scholar cards', async ({ page }) => {
    await page.goto('/scholars');

    await expect(page).toHaveTitle(/Theological Faculty Directory | FaithFull Scholars/);
    await expect(page.locator('h1')).toContainText('Theological Faculty Network');

    // Check for scholar cards
    const scholarCards = page.locator('a[href^="/scholars/"]');
    await expect(scholarCards.first()).toBeVisible();
  });

  test('navigates to course catalog and checks inspectable syllabi', async ({ page }) => {
    await page.goto('/courses');

    await expect(page).toHaveTitle(/Course Showcase & Syllabi | FaithFull Scholars/);
    await expect(page.locator('h1')).toContainText('Theological Course Showcase');

    // Verify course cards exist
    const syllabiLinks = page.locator('a[href^="/courses/"]');
    await expect(syllabiLinks.first()).toBeVisible();
  });
});
