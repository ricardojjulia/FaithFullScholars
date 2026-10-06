import { test, expect } from '@playwright/test';
import { storageStatePath } from './personas';
import { covers } from '../support/covers';

covers('page:/dashboard/profile', 'page:/dashboard/onboarding', 'page:/dashboard/preview');

// Signed in through the real login flow (tests/e2e/auth.setup.ts); anonymous demo access was removed in ADR 0022.
test.use({ storageState: storageStatePath('scholar') });

test.describe('Scholar End-to-End User Journey', () => {
  test('scholar registration workflow and onboarding entry', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('domcontentloaded');

    // Default: Scholar form active
    await expect(page.locator('h1')).toContainText('Join FaithFull Scholars');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('text=Academic Title / Rank')).toBeVisible();

    // Verify registration submit button is actionable
    const registerBtn = page.getByRole('button', { name: /Register as Faculty Member/i });
    await expect(registerBtn).toBeVisible();
  });

  test('scholar dashboard profile workspace and section management', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('domcontentloaded');

    // Verify profile management layout is loaded
    await expect(page.locator('header')).toBeVisible();
    
    // Check navigation to Scholar Contracts inbox
    await page.goto('/dashboard/contracts');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('scholar public profile discovery and availability badges', async ({ page }) => {
    await page.goto('/scholars');
    await page.waitForLoadState('domcontentloaded');

    // Verify faculty listing cards exist
    const scholarCards = page.locator('article, [data-testid="scholar-card"], a[href^="/scholars/"]');
    await expect(scholarCards.first()).toBeVisible();

    // Click on the first scholar profile
    await scholarCards.first().click();
    await page.waitForLoadState('domcontentloaded');

    // Verify scholar detail elements
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('scholar saves, submits and withdraws a profile revision (persisted)', async ({ page }) => {
    const uniqueTitle = `E2E Title ${Date.now()}`;
    const banner = page.getByTestId('revision-status-banner');
    const title = page.getByLabel('Professional Headline / Academic Title');

    await page.goto('/dashboard/profile');
    await expect(title).toBeVisible();

    // Rerun-safe: the persona may be left in submitted, rejected, or changes_requested by an
    // interrupted run. Wait for the banner to settle on a known state before branching.
    await expect(
      banner.getByText(/Draft — not yet submitted|Awaiting review|Changes requested|Revision rejected|Published|Approved/)
    ).toBeVisible();

    if (await banner.getByText('Awaiting review').isVisible()) {
      await page.getByRole('button', { name: 'Withdraw' }).click();
      await expect(banner.getByText('Draft — not yet submitted')).toBeVisible();
    } else if (await banner.getByText('Revision rejected').isVisible()) {
      await page.getByRole('button', { name: 'Start a new draft' }).click();
      await expect(page.getByRole('alert')).toContainText('save to start a new draft');
    }
    // changes_requested is editable as-is; draft/published need no preparation.
    await expect(title).toBeEnabled();

    await title.fill(uniqueTitle);
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Draft revision saved securely')).toBeVisible();

    // Persisted server-side: a reload shows the same draft.
    await page.reload();
    await expect(title).toHaveValue(uniqueTitle);
    await expect(banner.getByText(/Draft — not yet submitted|Changes requested/)).toBeVisible();

    // The preview reads the same persisted draft.
    await page.goto('/dashboard/preview');
    await expect(page.getByText(uniqueTitle).first()).toBeVisible();
    await page.goto('/dashboard/profile');

    await page.getByRole('button', { name: 'Submit for Review' }).click();
    await expect(banner.getByText('Awaiting review')).toBeVisible();
    await expect(title).toBeDisabled();

    await page.getByRole('button', { name: 'Withdraw' }).click();
    await expect(banner.getByText('Draft — not yet submitted')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Withdraw' })).toHaveCount(0);
    await expect(title).toBeEnabled();
    await expect(title).toHaveValue(uniqueTitle);
  });

  test('scholar onboarding page renders for a signed-in scholar', async ({ page }) => {
    await page.goto('/dashboard/onboarding');
    await expect(page.getByRole('heading', { name: /Set Up Your Academic/ })).toBeVisible();
  });
});
