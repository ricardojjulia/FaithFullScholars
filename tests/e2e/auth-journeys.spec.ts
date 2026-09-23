import { test, expect } from '@playwright/test';

test.describe('Authentication & Role Onboarding Journeys', () => {
  test('renders login page and allows password visibility toggle', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Verify login card heading
    await expect(page.locator('h1')).toContainText('Sign in to your account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input#password')).toHaveAttribute('type', 'password');

    // Toggle password visibility
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(page.locator('input#password')).toHaveAttribute('type', 'text');
  });

  test('renders signup page with Scholar vs. Seminary role switcher', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('domcontentloaded');

    // Verify signup card heading
    await expect(page.locator('h1')).toContainText('Join FaithFull Scholars');

    // Default: Scholar form active
    await expect(page.locator('text=Academic Title / Rank')).toBeVisible();
    await expect(page.getByRole('button', { name: /Register as Faculty Member/i })).toBeVisible();

    // Switch to Seminary / Dean role
    await page.getByRole('button', { name: /Seminary \/ Dean/i }).click();

    // Verify institution-specific fields appear
    await expect(page.locator('text=Seminary / University Name')).toBeVisible();
    await expect(page.locator('text=Your Role at Institution')).toBeVisible();
    await expect(page.getByRole('button', { name: /Register Institution Account/i })).toBeVisible();
  });

  test('renders forgot password page and dispatches request', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');

    // Verify forgot password heading
    await expect(page.locator('h1')).toContainText('Reset your password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Recovery Link/i })).toBeVisible();
  });

  test('user menu in universal app bar links to sign in and register', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open User Menu dropdown
    await page.getByRole('button', { name: /User account and profile menu/i }).click();

    // Check Sign In and Register links
    await expect(page.getByRole('link', { name: /Sign In/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Register/i })).toBeVisible();

    // Click Sign In
    await page.getByRole('link', { name: /Sign In/i }).click();
    await page.waitForURL('**/login');
    await expect(page.locator('h1')).toContainText('Sign in to your account');
  });

  test('universal navigation bar allows navigation from dashboard profile to faculty directory & courses', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('domcontentloaded');

    // Verify PublicNav top navigation bar links are present
    const facultyLink = page.locator('a[href="/scholars"]').first();
    await expect(facultyLink).toBeVisible();

    const coursesLink = page.locator('a[href="/courses"]').first();
    await expect(coursesLink).toBeVisible();

    // Click Faculty Directory link and verify navigation
    await facultyLink.click();
    await page.waitForURL('**/scholars');
    await expect(page.locator('h1')).toContainText(/Theological Faculty Network/i);
  });
});
