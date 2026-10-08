import { test, expect, type Browser, type Page } from '@playwright/test';
import { storageStatePath, type Persona } from './personas';
import { APPLICANT_SCHOLAR, APPLICATIONS_POSTING } from './portal-fixtures';
import { resetApplications } from './support/reset-applications';
import { covers } from '../support/covers';

/**
 * The application journey (ADR 0027), end to end against the real database:
 *   1. the approved applicant applies to the dedicated posting and sees it in My applications;
 *   2. the institution sees the real applicant, with the sealed dossier, and moves it to under review;
 *   3. the applicant sees the new status and withdraws (after confirming).
 * The tests share one application, so they run serially. The application is cleared
 * before and after (tests/e2e/support/reset-applications.ts, which throws instead of
 * skipping when its environment is missing), so the spec is rerun-safe.
 */
covers(
  'page:/opportunities/[slug]',
  'page:/dashboard/applications',
  'page:/institution/postings/[id]/applicants',
  'api:POST /api/postings/[id]/express-interest',
  'api:PATCH /api/institution/applications/[id]/status',
  'api:POST /api/applications/[id]/withdraw'
);

test.describe.configure({ mode: 'serial' });

const POSTING_URL = `/opportunities/${APPLICATIONS_POSTING.slug}`;
const MATRIX_URL = `/institution/postings/${APPLICATIONS_POSTING.id}/applicants`;
const COVER_NOTE = 'E2E cover note: I affirm the Westminster Standards and would love to teach this course.';

async function openAs(browser: Browser, persona: Persona): Promise<Page> {
  const context = await browser.newContext({
    storageState: storageStatePath(persona),
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3845',
  });
  return context.newPage();
}

test.describe('posting application journey', () => {
  test.beforeAll(async () => {
    await resetApplications();
  });

  test.afterAll(async () => {
    await resetApplications();
  });

  test('the approved scholar applies, and sees the application in My applications', async ({ browser }) => {
    const page = await openAs(browser, 'applicant');
    try {
      await page.goto(POSTING_URL);
      await expect(page.locator('h1')).toContainText(APPLICATIONS_POSTING.title);

      await page.getByRole('button', { name: /Express Interest/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Honest disclosure and a bounded note field.
      await expect(dialog.getByText('Your email is shared only if an interview is scheduled.')).toBeVisible();
      await expect(dialog.getByLabel(/Introductory note/i)).toHaveAttribute('maxlength', '4000');

      await dialog.getByLabel(/Introductory note/i).fill(COVER_NOTE);
      await expect(dialog.getByText(`${COVER_NOTE.length} / 4000`)).toBeVisible();
      await dialog.getByRole('button', { name: /Send application/i }).click();
      await expect(dialog.getByText('Application sent')).toBeVisible();
      await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();

      // The page refreshed itself: the button is gone and the real status is shown.
      await expect(page.getByTestId('applied-panel')).toBeVisible();
      await expect(page.getByTestId('applied-panel').getByTestId('application-status')).toHaveText('Submitted');
      await expect(page.getByRole('button', { name: /Express Interest/i })).toHaveCount(0);

      await page.goto('/dashboard/applications');
      const row = page.getByTestId('my-application').filter({ hasText: APPLICATIONS_POSTING.title });
      await expect(row).toBeVisible();
      await expect(row.getByTestId('application-status')).toHaveText('Submitted');
    } finally {
      await page.context().close();
    }
  });

  test('applying twice is refused honestly', async ({ browser }) => {
    const page = await openAs(browser, 'applicant');
    try {
      // The page no longer offers the form, so a second attempt can only come from the API.
      const res = await page.request.post(`/api/postings/${APPLICATIONS_POSTING.id}/express-interest`, {
        data: { coverNote: COVER_NOTE },
      });
      expect(res.status()).toBe(409);
      expect((await res.json()).error).toMatch(/already applied/i);
    } finally {
      await page.context().close();
    }
  });

  test('the institution sees the real applicant with the sealed dossier and moves it to under review', async ({ browser }) => {
    const page = await openAs(browser, 'institution');
    try {
      await page.goto(MATRIX_URL);
      await expect(page.getByText('ADR 0020 Candidate Clearinghouse')).toBeVisible();
      await expect(page.getByTestId('total-applicants')).toHaveText('1');

      const row = page.getByTestId('applicant-row').filter({ hasText: APPLICANT_SCHOLAR.fullName });
      await expect(row).toBeVisible();
      await expect(row.getByTestId('application-status')).toHaveText('Submitted');
      // Only the valid next move is offered: forward from submitted.
      await expect(row.getByTestId('move-under_review')).toBeVisible();
      await expect(row.getByTestId('move-interview_scheduled')).toHaveCount(0);
      await expect(row.getByTestId('move-declined')).toHaveCount(0);

      // The sealed dossier: degrees and confession come from the snapshot.
      await row.getByRole('button', { name: /View Dossier/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId('dossier-frozen-note')).toContainText('Dossier as sealed on');
      await expect(dialog.getByText('E2E University')).toBeVisible();
      await expect(dialog.getByText(COVER_NOTE)).toBeVisible();
      await expect(dialog.getByText(/Westminster Confession of Faith/)).toBeVisible();
      // Contact is not released before an interview is scheduled, and the email is nowhere on the page.
      await expect(dialog.getByText('Contact is released when you schedule an interview.')).toBeVisible();
      await expect(dialog.getByRole('button', { name: /Reveal contact/i })).toHaveCount(0);
      await expect(page.getByText('e2e-applicant@test.faithfullscholars.dev')).toHaveCount(0);

      // A private note saves.
      await dialog.getByLabel(/Private committee notes/i).fill('Strong fit; confirm references.');
      await dialog.getByRole('button', { name: /Save note/i }).click();
      await expect(dialog.getByText('Note saved.')).toBeVisible();
      await dialog.getByRole('button', { name: /Close candidate dossier/i }).click();

      await row.getByTestId('move-under_review').click();
      await expect(row.getByTestId('application-status')).toHaveText('Under review');
      await expect(page.getByTestId('status-error')).toHaveCount(0);
      // Next valid moves from under review.
      await expect(row.getByTestId('move-interview_scheduled')).toBeVisible();
      await expect(row.getByTestId('move-declined')).toBeVisible();
      await expect(row.getByTestId('move-under_review')).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });

  test('the scholar sees the new status, cannot read the institution note, and withdraws after confirming', async ({ browser }) => {
    const page = await openAs(browser, 'applicant');
    try {
      await page.goto('/dashboard/applications');
      const row = page.getByTestId('my-application').filter({ hasText: APPLICATIONS_POSTING.title });
      await expect(row.getByTestId('application-status')).toHaveText('Under review');
      await expect(page.getByText('Strong fit; confirm references.')).toHaveCount(0);

      await row.getByRole('button', { name: /Withdraw application/i }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      // Keeping the application leaves it untouched.
      await page.getByRole('button', { name: /Keep application/i }).click();
      await expect(row.getByTestId('application-status')).toHaveText('Under review');

      await row.getByRole('button', { name: /Withdraw application/i }).click();
      await page.getByRole('button', { name: /Yes, withdraw/i }).click();
      await expect(row.getByTestId('application-status')).toHaveText('Withdrawn');
      await expect(row.getByRole('button', { name: /Withdraw application/i })).toHaveCount(0);

      // The posting page shows the real status and no way to apply again.
      await page.goto(POSTING_URL);
      await expect(page.getByTestId('applied-panel').getByTestId('application-status')).toHaveText('Withdrawn');
      await expect(page.getByRole('button', { name: /Express Interest/i })).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });

  test('the institution cannot move a withdrawn application', async ({ browser }) => {
    const page = await openAs(browser, 'institution');
    try {
      await page.goto(MATRIX_URL);
      const row = page.getByTestId('applicant-row').filter({ hasText: APPLICANT_SCHOLAR.fullName });
      await expect(row.getByTestId('application-status')).toHaveText('Withdrawn');
      for (const move of ['under_review', 'interview_scheduled', 'declined']) {
        await expect(row.getByTestId(`move-${move}`)).toHaveCount(0);
      }
    } finally {
      await page.context().close();
    }
  });
});
