import { test, expect } from '@playwright/test';
import { storageStatePath } from './personas';

// Signed in through the real login flow (tests/e2e/auth.setup.ts); anonymous demo access was removed in ADR 0022.
test.use({ storageState: storageStatePath('admin') });

test.describe('Admin Moderation & System Health Journey', () => {
  test('renders admin moderation portal layout and review routes', async ({ page }) => {
    await page.goto('/admin/reviews');
    await page.waitForLoadState('domcontentloaded');

    // Admin layout navigation and heading
    await expect(page.locator('h1').first()).toBeVisible();

    // Check institutions moderation route
    await page.goto('/admin/institutions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible();

    // Check error triage route
    await page.goto('/admin/triage');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('renders dev status and system health diagnostics dashboard', async ({ page }) => {
    await page.goto('/dev/status');
    await page.waitForLoadState('domcontentloaded');

    // Health diagnostics header
    await expect(page.locator('h1').first()).toContainText(/System Status|Diagnostic/i);
  });
});
