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
      banner.getByText(/New profile — not yet submitted|Draft — not yet submitted|Awaiting review|Changes requested|Revision rejected|Published|Approved/)
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

    // Add a credential through the editor (rows from earlier runs are cleaned up at the end).
    const institution = `E2E University ${Date.now()}`;
    const credentialRows = page.locator('[data-testid^="credential-row-"]');
    const existingCredentials = await credentialRows.count();
    await page.getByTestId('credential-add').click();
    const credential = page.getByTestId(`credential-row-${existingCredentials}`);
    await credential.getByLabel('Degree *', { exact: true }).fill('Ph.D.');
    await credential.getByLabel('Field of study *', { exact: true }).fill('Old Testament');
    await credential.getByLabel('Institution *', { exact: true }).fill(institution);
    await credential.getByLabel('Terminal degree').check();

    // An incomplete row blocks saving with a visible reason instead of silently dropping it.
    await credential.getByLabel('Institution *', { exact: true }).fill('');
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    await expect(page.getByTestId('submit-blocked-reason')).toContainText(/1 problem to fix \(1 credential\)/);
    await credential.getByLabel('Institution *', { exact: true }).fill(institution);
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeEnabled();

    // A newly ticked confession has NO default adherence level: Save stays blocked with a visible reason
    // until the scholar chooses. Unticked again before saving, so reruns start from the same state.
    const confessionBox = page.locator('[data-confession-card] input[type="checkbox"]:not(:checked)').first();
    await confessionBox.check();
    const levelSelect = page.locator('[data-confession-card] select').first();
    await expect(levelSelect).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    await expect(page.getByTestId('submit-blocked-reason')).toContainText(/1 confession/);
    await expect(levelSelect.locator('option[value="strict_subscription"]')).toHaveCount(1);
    await levelSelect.selectOption('with_exceptions');
    await expect(page.getByTestId('submit-blocked-reason')).toContainText(/1 confession/); // notes required
    await levelSelect.selectOption('strict_subscription');
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeEnabled();
    await confessionBox.uncheck();
    await expect(page.getByTestId('confession-public-notice')).toContainText('visible to anyone');

    // Pick a tradition from the database-backed list (idempotent across reruns).
    const lutheran = page.getByTestId('tradition-option-lutheran');
    await expect(lutheran).toBeVisible();
    if ((await lutheran.getAttribute('aria-pressed')) !== 'true') await lutheran.click();
    await expect(lutheran).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Draft revision saved securely')).toBeVisible();

    // Persisted server-side: a reload shows the same draft, credential and tradition included.
    await page.reload();
    await expect(title).toHaveValue(uniqueTitle);
    await expect(page.locator('[data-testid^="credential-row-"]').getByLabel('Institution *', { exact: true }).last()).toHaveValue(institution);
    await expect(page.getByTestId('tradition-option-lutheran')).toHaveAttribute('aria-pressed', 'true');
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

    // The preview can submit and withdraw too, leaving the persona back in draft.
    await page.goto('/dashboard/preview');
    await page.getByRole('button', { name: 'Submit for Admin Review' }).click();
    await expect(page.getByText('Submitted for Review')).toBeVisible();
    await page.getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByRole('button', { name: 'Submit for Admin Review' })).toBeVisible();

    // Cleanup: remove this run's credential so reruns start from the same list.
    await page.goto('/dashboard/profile');
    await expect(title).toBeEnabled();
    const rows = page.locator('[data-testid^="credential-row-"]');
    await expect(rows.getByLabel('Institution *', { exact: true }).last()).toHaveValue(institution);
    await page.getByTestId(`credential-remove-${(await rows.count()) - 1}`).click();
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Draft revision saved securely')).toBeVisible();
  });

  test('scholar onboarding page renders for a signed-in scholar', async ({ page }) => {
    await page.goto('/dashboard/onboarding');
    await expect(page.getByRole('heading', { name: /Set Up Your Academic/ })).toBeVisible();
  });

  test('onboarding CV import keeps existing credentials and lists unmatched suggestions (nothing is saved)', async ({ page }) => {
    await page.goto('/dashboard/onboarding');
    await page.getByRole('button', { name: /Skip upload and start from scratch/ }).click();

    // A credential the scholar already typed.
    const existing = await page.locator('[data-testid^="credential-row-"]').count();
    await page.getByTestId('credential-add').click();
    const row = page.getByTestId(`credential-row-${existing}`);
    await row.getByLabel('Degree *', { exact: true }).fill('Th.M.');
    await row.getByLabel('Field of study *', { exact: true }).fill('Church History');
    await row.getByLabel('Institution *', { exact: true }).fill('E2E Seminary');

    // Import a CV that has no education section and mentions a lossy discipline.
    await page.getByRole('button', { name: /Back to Upload/ }).click();
    await page.getByRole('button', { name: /Paste CV Text/ }).click();
    await page.getByPlaceholder('Paste your CV text here...').fill('Dr. Test Person\nI teach pastoral theology and homiletics.\n');
    await page.getByRole('button', { name: 'Parse CV Content' }).click();

    const notice = page.getByTestId('cv-unmatched-notice');
    await expect(notice).toContainText('Pastoral & Practical Theology');
    await expect(page.getByTestId('cv-import-notice')).toContainText('The CV had no credentials');
    await expect(page.getByTestId(`credential-row-${existing}`).getByLabel('Institution *', { exact: true })).toHaveValue('E2E Seminary');

    // The notice updates as the scholar handles entries.
    await page.getByRole('button', { name: /Mark discipline Pastoral & Practical Theology as handled/ }).click();
    await expect(notice).toHaveCount(0);

    // Adding a row focuses its first field; the public-data notice is shown beside the traditions.
    await page.getByTestId('credential-add').click();
    await expect(page.getByTestId(`credential-row-${existing + 1}`).getByLabel('Degree *', { exact: true })).toBeFocused();
    await expect(page.getByTestId('tradition-public-notice')).toBeVisible();
  });
});
