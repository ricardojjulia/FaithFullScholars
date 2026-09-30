import { test, expect } from '@playwright/test';

test.describe('Search Committee Applicant Matrix & Confessional Common App (ADR 0020)', () => {
  test('navigates from institution postings to applicant matrix and renders candidate comparison table', async ({ page }) => {
    // 1. Visit Institution Postings page
    await page.goto('/institution/postings');
    await page.waitForLoadState('domcontentloaded');

    // 2. Verify and click Applicant Matrix link
    const applicantMatrixLink = page.getByRole('link', { name: /Applicant Matrix/i }).first();
    await expect(applicantMatrixLink).toBeVisible();
    await applicantMatrixLink.click();

    // 3. Verify route URL and formal executive header
    await expect(page).toHaveURL(/\/institution\/postings\/[^/]+\/applicants/);
    await expect(page.getByText('ADR 0020 Candidate Clearinghouse')).toBeVisible();
    await expect(page.getByText(/Search Committee Applicant Comparison Matrix/i)).toBeVisible();

    // 4. Verify Compliance & Evaluation KPI Cards
    await expect(page.getByText('Total Applicants', { exact: true })).toBeVisible();
    await expect(page.getByText('Terminal Doctorates', { exact: true })).toBeVisible();
    await expect(page.getByText('Confessional Alignment', { exact: true })).toBeVisible();
    await expect(page.getByText('Position Type', { exact: true })).toBeVisible();

    // 5. Verify Action Buttons
    const csvBtn = page.getByRole('button', { name: /Export CSV/i });
    const printBtn = page.getByRole('button', { name: /Print Dossier/i });
    await expect(csvBtn).toBeVisible();
    await expect(printBtn).toBeVisible();

    // 6. Verify Filter Controls
    const searchInput = page.getByRole('textbox', { name: /Filter candidates/i });
    await expect(searchInput).toBeVisible();
    const statusSelect = page.getByRole('combobox', { name: /Filter by application status/i });
    await expect(statusSelect).toBeVisible();
    const terminalCheckbox = page.getByRole('checkbox', { name: /ATS Doctorates Only/i });
    await expect(terminalCheckbox).toBeVisible();

    // 7. Verify Table Column Headers
    await expect(page.getByRole('columnheader', { name: /Candidate/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Terminal Degree \(ATS Standard 3\)/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Confessional Fit/i })).toBeVisible();

    // 8. Verify View Dossier Modal Interaction
    const viewDossierBtn = page.getByRole('button', { name: /View Dossier/i }).first();
    await expect(viewDossierBtn).toBeVisible();
    await viewDossierBtn.click();

    // Verify modal content
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Common App Candidate Dossier')).toBeVisible();
    await expect(page.getByText('Candidate Cover Note')).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Close candidate dossier/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
