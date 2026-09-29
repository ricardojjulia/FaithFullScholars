import { test, expect } from '@playwright/test';

test.describe('ATS/ABHE Accreditation Matrix & Error Boundary Journey (ADR 0019)', () => {
  test('navigates from saved shortlist to accreditation matrix and renders compliance KPIs', async ({ page }) => {
    // 1. Visit Institution Saved page
    await page.goto('/institution/saved');
    await page.waitForLoadState('domcontentloaded');

    // 2. Verify and click Accreditation Matrix link
    const matrixLink = page.getByRole('link', { name: /Accreditation Matrix/i });
    await expect(matrixLink).toBeVisible();
    await matrixLink.click();

    // 3. Verify route URL and formal executive header
    await expect(page).toHaveURL(/\/institution\/saved\/accreditation/);
    await expect(page.locator('h1')).toContainText('ATS & ABHE Faculty Credentials Matrix');
    await expect(page.getByText('ATS / ABHE Audit Ready').first()).toBeVisible();

    // 4. Verify Compliance Metric Cards
    await expect(page.getByText('Total Faculty Evaluated', { exact: true })).toBeVisible();
    await expect(page.getByText('Terminal Doctorate Ratio', { exact: true })).toBeVisible();
    await expect(page.getByText('Scholarly Publications', { exact: true })).toBeVisible();
    await expect(page.getByText('Confessional Affirmation', { exact: true }).first()).toBeVisible();

    // 5. Verify Action Buttons and CSV Download Trigger
    const csvBtn = page.getByRole('button', { name: /Download ATS CSV/i });
    const printBtn = page.getByRole('button', { name: /Print Self-Study Report/i });
    await expect(csvBtn).toBeVisible();
    await expect(printBtn).toBeVisible();

    // Trigger CSV download and verify filename
    const downloadPromise = page.waitForEvent('download');
    await csvBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('ats-faculty-matrix-');
    expect(download.suggestedFilename()).toContain('.csv');

    // 6. Verify Table and Accessible Table Structure
    const table = page.getByRole('table', { name: /ATS & ABHE Faculty Credentials Matrix/i });
    await expect(table).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Faculty Member/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Highest Earned Degree/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Teaching Field/i })).toBeVisible();
  });

  test('renders branded 404 not-found page for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-theological-route-404');
    await page.waitForLoadState('domcontentloaded');

    // Verify branded not-found UI
    await expect(page.getByText('404 • Page Not Found')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Scholar or Resource Not Found');
    await expect(page.getByRole('link', { name: /Search Faculty/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Course Catalog/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Return to Home/i })).toBeVisible();
  });
});
