import { test, expect } from '@playwright/test';

test.describe('Tiered Subscriptions & Engagement Contracts', () => {
  test('renders institutional subscription and quota management view', async ({ page }) => {
    await page.goto('/institution/subscription');
    await page.waitForLoadState('domcontentloaded');

    // Verify main page heading
    await expect(page.locator('h1')).toContainText('Institutional Subscription & Quotas');

    // Verify quota consumption meters
    await expect(page.locator('text=MONTHLY INQUIRY ALLOWANCE')).toBeVisible();
    await expect(page.locator('text=SEARCH COMMITTEE SEATS')).toBeVisible();
    await expect(page.locator('text=AI FACULTY MATCHER')).toBeVisible();

    // Verify available tier cards
    await expect(page.getByRole('heading', { name: 'Verified Seminary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Premier Partner' })).toBeVisible();
  });

  test('renders institutional engagement contracts manager', async ({ page }) => {
    await page.goto('/institution/contracts');
    await page.waitForLoadState('domcontentloaded');

    // Verify contracts page heading
    await expect(page.locator('h1')).toContainText('Faculty Engagement Contracts');
    await expect(page.locator('text=Manage Quota')).toBeVisible();
  });

  test('renders scholar workspace contracts inbox', async ({ page }) => {
    await page.goto('/dashboard/contracts');
    await page.waitForLoadState('domcontentloaded');

    // Verify scholar contracts inbox heading
    await expect(page.locator('h1')).toContainText('Institutional Engagement Contracts');
    await expect(page.locator('text=View Inquiries Inbox')).toBeVisible();
  });
});
