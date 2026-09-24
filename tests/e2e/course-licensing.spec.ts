import { test, expect } from '@playwright/test';

test.describe('Course Licensing & Syllabus Distribution E2E User Journey (ADR 0013)', () => {
  test('navigates to course catalog and checks course showcase', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1').first()).toContainText(/Theological Course Showcase/i);
    await expect(page.locator('a[href^="/courses/"]').first()).toBeVisible();
  });

  test('institutional course licensing management portal loads cleanly', async ({ page }) => {
    await page.goto('/institution/licensing');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1').first()).toContainText(/Course Licensing & Syllabus Distribution/i);
    await expect(page.locator('text=Active Licenses').first()).toBeVisible();
  });

  test('scholar course licensing workspace loads cleanly', async ({ page }) => {
    await page.goto('/dashboard/licensing');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1').first()).toContainText(/Course Licensing & Syllabi Royalties/i);
    await expect(page.locator('text=Active Royalties').first()).toBeVisible();
  });
});
