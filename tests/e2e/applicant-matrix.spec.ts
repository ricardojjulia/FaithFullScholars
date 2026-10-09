import { test, expect } from '@playwright/test';
import { storageStatePath } from './personas';
import { APPLICANT_SCHOLAR, APPLICATIONS_POSTING, serviceClient } from './portal-fixtures';
import { resetApplications } from './support/reset-applications';
import { covers } from '../support/covers';

// Signed in through the real login flow (tests/e2e/auth.setup.ts); anonymous demo access was removed in ADR 0022.
test.use({ storageState: storageStatePath('institution') });

covers('page:/institution/postings', 'page:/institution/postings/[id]/applicants');

/**
 * The matrix renders REAL applications (ADR 0027). It no longer depends on seeded
 * fake inquiries: the spec arranges its own application on the dedicated E2E
 * posting with the service role (the only way to create one without signing in as the
 * applicant) and clears it afterwards. A frozen dossier is stored as given, so the
 * assertions below cannot be satisfied by the live profile.
 */
const SNAPSHOT = {
  snapshot_version: 1,
  sealed_at: '2026-10-01T12:00:00Z',
  scholar_slug: APPLICANT_SCHOLAR.slug,
  full_name: APPLICANT_SCHOLAR.fullName,
  title: 'Associate Professor of New Testament',
  current_institution: 'E2E Seminary',
  doctrinal_statement_text: 'Frozen doctrinal statement for the matrix spec.',
  credentials: [{ degree: 'Ph.D.', field_of_study: 'New Testament', institution_name: 'Frozen Degree University', year_awarded: 2012, is_terminal: true }],
  confessions: [{ name: 'Westminster Confession of Faith', slug: 'westminster-confession', adherence_level: 'full_subscription', exception_notes: null }],
  disciplines: [{ name: 'New Testament & Early Christian Literature', slug: 'new-testament', is_primary: true }],
  traditions: [],
  publications: [],
};

test.describe('Search Committee Applicant Matrix & Confessional Common App (ADR 0020, ADR 0027)', () => {
  test.beforeAll(async () => {
    await resetApplications();
    const db = serviceClient();
    const { data: scholar, error: scholarError } = await db.from('scholars').select('id').eq('slug', APPLICANT_SCHOLAR.slug).single();
    if (scholarError || !scholar) throw new Error('The applicant persona is missing (scripts/ci-setup-test-users.mjs).');
    const { error } = await db.from('posting_applications').insert({
      posting_id: APPLICATIONS_POSTING.id,
      institution_id: 'e1000000-0000-0000-0000-000000000001',
      scholar_id: scholar.id,
      posting_title: APPLICATIONS_POSTING.title,
      institution_name: 'Westminster Theological Seminary',
      cover_note: 'Matrix spec cover note for the committee.',
      dossier_snapshot: SNAPSHOT,
    });
    if (error) throw new Error(`Could not arrange the application (code ${error.code ?? 'unknown'}).`);
  });

  test.afterAll(async () => {
    await resetApplications();
  });

  test('navigates from institution postings to the applicant matrix and renders the real applicant', async ({ page }) => {
    // 1. The postings list links to this posting's matrix.
    await page.goto('/institution/postings');
    await page.waitForLoadState('domcontentloaded');
    const matrixLink = page.locator(`a[href="/institution/postings/${APPLICATIONS_POSTING.id}/applicants"]`);
    await expect(matrixLink).toBeVisible();
    await matrixLink.click();

    // 2. Route and formal executive header.
    await expect(page).toHaveURL(new RegExp(`/institution/postings/${APPLICATIONS_POSTING.id}/applicants`));
    await expect(page.getByText('Candidate applications', { exact: true })).toBeVisible();
    await expect(page.getByText(/Search Committee Applicant Comparison Matrix/i)).toBeVisible();

    // 3. Compliance and evaluation KPI cards, computed from the one real application.
    await expect(page.getByText('Total Applicants', { exact: true })).toBeVisible();
    await expect(page.getByTestId('total-applicants')).toHaveText('1');
    await expect(page.getByText('Terminal Doctorates', { exact: true })).toBeVisible();
    // The declared confessions are shown beside the posting's standard; there is no fit score (owner decision).
    await expect(page.getByText('Confessional Standard', { exact: true })).toBeVisible();
    await expect(page.getByText(/Confessional (Fit|Alignment)/)).toHaveCount(0);
    await expect(page.getByText('Position Type', { exact: true })).toBeVisible();

    // 4. Action buttons and filter controls.
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Print Dossier/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Filter candidates/i })).toBeVisible();
    const statusSelect = page.getByRole('combobox', { name: /Filter by application status/i });
    await expect(statusSelect).toBeVisible();
    // The filter offers the five real statuses, not the old inquiry vocabulary.
    await expect(statusSelect.locator('option')).toHaveText([
      'All application statuses',
      'Submitted',
      'Under review',
      'Interview scheduled',
      'Declined',
      'Withdrawn',
    ]);
    await expect(page.getByRole('checkbox', { name: /ATS Doctorates Only/i })).toBeVisible();

    // 5. Table headers and the real applicant row, from the frozen snapshot.
    await expect(page.getByRole('columnheader', { name: /Candidate/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Terminal Degree \(ATS Standard 3\)/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Declared confessions/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /fit|score|alignment/i })).toHaveCount(0);
    const row = page.getByTestId('applicant-row');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(APPLICANT_SCHOLAR.fullName);
    await expect(row).toContainText('Ph.D. in New Testament');
    await expect(row).toContainText('Frozen Degree University');
    await expect(row.getByTestId('application-status')).toHaveText('Submitted');

    // 6. Dossier modal shows the sealed dossier and the cover note.
    await page.getByRole('button', { name: /View Dossier/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Common App Candidate Dossier')).toBeVisible();
    await expect(page.getByText('Candidate Cover Note')).toBeVisible();
    await expect(page.getByText('Matrix spec cover note for the committee.')).toBeVisible();
    await expect(page.getByText('Frozen doctrinal statement for the matrix spec.')).toBeVisible();

    const closeBtn = page.getByRole('button', { name: /Close candidate dossier/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('filtering by a status with no applicants shows the empty message, not an error', async ({ page }) => {
    await page.goto(`/institution/postings/${APPLICATIONS_POSTING.id}/applicants`);
    await page.getByRole('combobox', { name: /Filter by application status/i }).selectOption('declined');
    await expect(page.getByTestId('applicant-row')).toHaveCount(0);
    await expect(page.getByText(/No candidate applications match the selected criteria/i)).toBeVisible();
    await expect(page.getByTestId('status-error')).toHaveCount(0);
  });
});
