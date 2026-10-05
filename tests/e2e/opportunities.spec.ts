import { test, expect } from '@playwright/test';
import { storageStatePath } from './personas';

// Signed in through the real login flow (tests/e2e/auth.setup.ts); anonymous demo access was removed in ADR 0022.
test.use({ storageState: storageStatePath('institution') });

test.describe('Academic Opportunities & Institutional Endorsements', () => {
  test('renders opportunities directory and filters by opportunity type', async ({ page }) => {
    await page.goto('/opportunities');
    await page.waitForLoadState('domcontentloaded');

    // Verify main page heading
    await expect(page.locator('h1')).toContainText('Theological Faculty Appointments & Teaching Calls');

    // Verify posting cards are present
    await expect(page.locator('text=Adjunct Professor in Historical Theology')).toBeVisible();

    // Verify filter tabs
    await expect(page.getByRole('link', { name: 'Adjunct Teaching', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Modular Intensives', exact: true })).toBeVisible();

    // Click into posting detail page
    await page.getByRole('link', { name: /Adjunct Professor in Historical Theology/i }).first().click();
    await page.waitForLoadState('domcontentloaded');

    // Verify posting detail page
    await expect(page.locator('h1')).toContainText('Adjunct Professor in Historical Theology');
    await expect(page.getByRole('heading', { name: 'Westminster Theological Seminary' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Express Interest/i })).toBeVisible();
  });

  test('institution portal displays opportunities management and endorsements', async ({ page }) => {
    await page.goto('/institution/postings');
    await page.waitForLoadState('domcontentloaded');

    // Verify postings portal page
    await expect(page.locator('h1')).toContainText('Academic Opportunities & Teaching Calls');
    await expect(page.locator('text=Post New Opportunity')).toBeVisible();

    // Navigate to faculty endorsements
    await page.goto('/institution/endorsements');
    await page.waitForLoadState('domcontentloaded');

    // Verify endorsements portal page
    await expect(page.locator('h1')).toContainText('Official Faculty & Scholar Endorsements');
    await expect(page.getByRole('button', { name: /Issue Institutional Endorsement/i })).toBeVisible();
    await expect(page.locator('text=About Institutional Endorsements vs. Colleague Commendations')).toBeVisible();
  });
});
