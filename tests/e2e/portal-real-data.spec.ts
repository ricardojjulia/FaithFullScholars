import { test, expect } from '@playwright/test';
import { PERSONA_EMAILS, storageStatePath } from './personas';
import {
  APPROVED_INSTITUTION,
  REMOVAL_SCHOLAR,
  SCHOLAR_PERSONA,
  SEEDED_INQUIRY_MESSAGE,
  SHARED_SHORTLIST_SCHOLARS,
  serviceClient,
} from './portal-fixtures';
import { covers } from '../support/covers';

/**
 * Real data on portal screens (spec 2026-10-08). Expected values are read from
 * the database with the service role, so the assertions hold whatever else the
 * other specs have changed. The shortlist removal uses an isolated third scholar
 * (created by scripts/ci-setup-test-users.mjs) and never touches the two shared
 * shortlist rows. Every test re-arranges its own data, so reruns are safe.
 */
covers(
  'page:/institution',
  'page:/institution/saved',
  'page:/institution/inquiries',
  'page:/institution/profile',
  'api:PATCH /api/institution/profile',
  'api:PATCH /api/inquiries/[id]',
  'page:/dashboard',
  'page:/dashboard/inquiries',
  'page:/dashboard/analytics',
  'api:DELETE /api/institution/saved-scholars',
  'api:DELETE /api/institution/saved-courses'
);

const db = serviceClient();

/** Awaits a query and returns its data; an error or a missing row fails the test. */
async function must<T>(promise: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) throw new Error('Expected a row but none was returned');
  return data as NonNullable<T>;
}

const DELETE_SCHOLAR_URL = /\/api\/institution\/saved-scholars\?/;

const count = async (table: string, filters: Record<string, string>) => {
  let q = db.from(table).select('id', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
};

test.describe('institution persona', () => {
  test.use({ storageState: storageStatePath('institution') });

  test('home shows the real institution and real counts', async ({ page }) => {
    const institution = await must(
      db.from('institutions').select('name, status').eq('id', APPROVED_INSTITUTION).single()
    );
    const total = await count('inquiries', { institution_id: APPROVED_INSTITUTION });
    const accepted = await count('inquiries', { institution_id: APPROVED_INSTITUTION, status: 'accepted' });
    const pendingOrRead = (
      await must(db.from('inquiries').select('status').eq('institution_id', APPROVED_INSTITUTION))
    ).filter((r: { status: string }) => r.status === 'pending' || r.status === 'read').length;
    const shortlisted = await count('saved_scholars', { institution_id: APPROVED_INSTITUTION });

    await page.goto('/institution');
    await expect(page.locator('h1')).toHaveText(institution.name);
    await expect(page.getByTestId('stat-total-inquiries')).toHaveText(String(total));
    await expect(page.getByTestId('stat-awaiting-inquiries')).toHaveText(String(pendingOrRead));
    await expect(page.getByTestId('stat-accepted-inquiries')).toHaveText(String(accepted));
    await expect(page.getByTestId('stat-shortlisted')).toHaveText(String(shortlisted));
    expect(total).toBeGreaterThanOrEqual(1); // the seeded inquiry
    await expect(page.getByText('Average response time')).toHaveCount(0);
    await expect(page.getByText(institution.status === 'approved' ? 'Verified Academic Partner' : 'Pending verification')).toBeVisible();
  });

  test('nav badge and profile page show the real institution and its real verification status', async ({ page }) => {
    const institution = await must(
      db
        .from('institutions')
        .select('name, status, website, location, contact_email')
        .eq('id', APPROVED_INSTITUTION)
        .single()
    );
    await page.goto('/institution/profile');
    await expect(page.getByTestId('institution-status-badge')).toHaveText(
      institution.status === 'approved' ? 'Verified' : /Pending verification|Verification declined|Suspended/
    );
    await expect(page.getByLabel('Institution Name *')).toHaveValue(institution.name);
    await expect(page.getByLabel('Official Website')).toHaveValue(institution.website ?? '');
    await expect(page.getByLabel('Primary Academic Contact Email *')).toHaveValue(institution.contact_email);
    await expect(page.getByTestId('profile-verification')).toContainText(
      institution.status === 'approved' ? 'Verified Academic Partner' : /Pending verification|Verification declined|Account suspended/
    );
    // The old fixture is gone.
    await expect(page.getByText('academic.dean@wts.edu')).toHaveCount(0);
    await expect(page.getByText('Reformed / Presbyterian')).toHaveCount(0);
  });

  test('saving a harmless field persists, shows a real message, and never touches trust columns', async ({ page }) => {
    const before = await must(
      db.from('institutions').select('website, status, slug, accreditation_body, accreditation_status').eq('id', APPROVED_INSTITUTION).single()
    );
    const newWebsite = `https://e2e-profile-${Date.now()}.example.edu`;
    try {
      await page.goto('/institution/profile');
      await page.getByLabel('Official Website').fill(newWebsite);
      await page.getByRole('button', { name: 'Save Profile Settings' }).click();
      await expect(page.getByTestId('profile-save-success')).toBeVisible();

      const after = await must(
        db.from('institutions').select('website, status, slug, accreditation_body, accreditation_status').eq('id', APPROVED_INSTITUTION).single()
      );
      expect(after.website).toBe(newWebsite);
      expect({ ...after, website: before.website }).toEqual(before); // trust columns unchanged

      await page.reload();
      await expect(page.getByLabel('Official Website')).toHaveValue(newWebsite);

      // Invalid input is refused with a visible, per-field error and nothing is saved.
      await page.getByLabel('Official Website').fill('javascript:alert(1)');
      await page.getByRole('button', { name: 'Save Profile Settings' }).click();
      await expect(page.getByTestId('profile-save-error')).toBeVisible();
      await expect(page.getByText('Enter a full web address')).toBeVisible();
      const refused = await must(db.from('institutions').select('website').eq('id', APPROVED_INSTITUTION).single());
      expect(refused.website).toBe(newWebsite);
    } finally {
      // Restore the original value for the other specs.
      await db.from('institutions').update({ website: before.website }).eq('id', APPROVED_INSTITUTION);
    }
  });

  test('a client-supplied trust column or institution id is ignored by the profile API', async ({ request }) => {
    const before = await must(db.from('institutions').select('status, slug').eq('id', APPROVED_INSTITUTION).single());
    const res = await request.patch('/api/institution/profile', {
      data: { status: 'suspended', slug: 'hijacked', institutionId: 'e1000000-0000-0000-0000-0000000000ff' },
    });
    // Nothing editable was provided, so nothing is written and the trust columns stay intact.
    expect(res.status()).toBe(400);
    const after = await must(db.from('institutions').select('status, slug').eq('id', APPROVED_INSTITUTION).single());
    expect(after).toEqual(before);
  });

  test('outreach log lists the real inquiry, not the old fixtures', async ({ page }) => {
    await page.goto('/institution/inquiries');
    await expect(page.getByText(SEEDED_INQUIRY_MESSAGE)).toBeVisible();
    await expect(page.getByText('academic.dean@wts.edu')).toHaveCount(0);
    await expect(page.getByText('Dr. Marcus Vance')).toHaveCount(0);
  });

  test('shortlist shows the real saved scholars and no fixtures', async ({ page }) => {
    const names = (
      await must(db.from('scholars').select('full_name').in('id', SHARED_SHORTLIST_SCHOLARS))
    ).map((r: { full_name: string }) => r.full_name);
    expect(names.length).toBe(2);

    await page.goto('/institution/saved');
    await expect(page.getByRole('heading', { name: /Shortlists/ })).toBeVisible();
    for (const name of names) {
      await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('Top candidate for our Fall 2027 modular intensive')).toHaveCount(0);
  });

  test('removing a scholar deletes only that row, and a failed removal keeps it and says so', async ({ page }) => {
    const removalScholar = await must(
      db.from('scholars').select('id').eq('slug', REMOVAL_SCHOLAR.slug).single()
    );
    await must(
      db
        .from('saved_scholars')
        .upsert(
          { institution_id: APPROVED_INSTITUTION, scholar_id: removalScholar.id, notes: 'E2E removal' },
          { onConflict: 'institution_id,scholar_id' }
        )
        .select('id')
    );
    const sharedBefore = await count('saved_scholars', { institution_id: APPROVED_INSTITUTION });

    await page.goto('/institution/saved');
    const removeButton = page.getByRole('button', { name: `Remove ${REMOVAL_SCHOLAR.fullName} from shortlist` });
    await expect(removeButton).toBeVisible();

    // Failure: the server refuses, the card stays and the user is told.
    await page.route(DELETE_SCHOLAR_URL, (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Internal error"}' })
        : route.continue()
    );
    await removeButton.click();
    await expect(page.getByRole('alert').filter({ hasText: 'could not remove' })).toBeVisible();
    await expect(removeButton).toBeVisible();
    expect(await count('saved_scholars', { institution_id: APPROVED_INSTITUTION, scholar_id: removalScholar.id })).toBe(1);

    // The error is cleared when the tab changes.
    await page.getByRole('tab', { name: /Saved Courses/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'could not remove' })).toHaveCount(0);
    await page.getByRole('tab', { name: /Shortlisted Scholars/ }).click();

    // Success: the explicit DELETE removes it and nothing is added back.
    await page.unroute(DELETE_SCHOLAR_URL);
    await removeButton.click();
    await expect(removeButton).toHaveCount(0);
    // Accessibility: the removal is announced politely and focus moves to the list heading.
    await expect(page.getByTestId('saved-announcement')).toHaveText(
      `Removed ${REMOVAL_SCHOLAR.fullName} from the shortlist`
    );
    await expect(page.getByRole('heading', { name: /Shortlisted scholars \(\d+\)/ })).toBeFocused();
    expect(await count('saved_scholars', { institution_id: APPROVED_INSTITUTION, scholar_id: removalScholar.id })).toBe(0);
    expect(await count('saved_scholars', { institution_id: APPROVED_INSTITUTION })).toBe(sharedBefore - 1);

    // It is gone for real after a reload, and the shared rows are still there.
    await page.reload();
    await expect(page.getByRole('button', { name: `Remove ${REMOVAL_SCHOLAR.fullName} from shortlist` })).toHaveCount(0);
    for (const id of SHARED_SHORTLIST_SCHOLARS) {
      expect(await count('saved_scholars', { institution_id: APPROVED_INSTITUTION, scholar_id: id })).toBe(1);
    }
  });

  test('removing a saved course deletes only that bookmark', async ({ page, request }) => {
    const removalScholar = await must(
      db.from('scholars').select('id').eq('slug', REMOVAL_SCHOLAR.slug).single()
    );
    const course = await must(
      db.from('courses').select('id').eq('scholar_id', removalScholar.id).eq('slug', REMOVAL_SCHOLAR.courseSlug).single()
    );
    await must(
      db
        .from('saved_courses')
        .upsert({ institution_id: APPROVED_INSTITUTION, course_id: course.id }, { onConflict: 'institution_id,course_id' })
        .select('id')
    );

    await page.goto('/institution/saved');
    await page.getByRole('tab', { name: /Saved Courses/ }).click();
    const removeButton = page.getByRole('button', { name: `Remove ${REMOVAL_SCHOLAR.courseTitle} from saved courses` });
    await expect(removeButton).toBeVisible();
    await removeButton.click();
    await expect(removeButton).toHaveCount(0);
    expect(await count('saved_courses', { institution_id: APPROVED_INSTITUTION, course_id: course.id })).toBe(0);

    // The API refuses a non-UUID id and is idempotent for an absent one.
    expect((await request.delete('/api/institution/saved-courses?courseId=nope')).status()).toBe(400);
    const again = await request.delete(`/api/institution/saved-courses?courseId=${course.id}`);
    expect(again.status()).toBe(200);
    expect(await again.json()).toEqual({ success: true, removed: false });
  });
});

test.describe('scholar persona', () => {
  test.use({ storageState: storageStatePath('scholar') });

  const PROFILE_LABELS: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Under review',
    approved: 'Published',
    hidden: 'Hidden',
    rejected: 'Not approved',
  };

  test('dashboard shows this scholar’s real status, counts and availability', async ({ page }) => {
    const scholar = await must(
      db.from('scholars').select('id, profile_status').eq('slug', SCHOLAR_PERSONA.slug).single()
    );
    const inquiries = await count('inquiries', { scholar_id: scholar.id });
    const publicCourses = await count('courses', { scholar_id: scholar.id, visibility: 'public' });
    const { data: availability, error: availabilityError } = await db
      .from('availability_profiles')
      .select('is_available_for_hire')
      .eq('scholar_id', scholar.id)
      .maybeSingle();
    if (availabilityError) throw new Error(availabilityError.message);

    await page.goto('/dashboard');
    await expect(page.locator('h1')).toHaveText(SCHOLAR_PERSONA.fullName);
    await expect(page.getByTestId('dashboard-profile-status')).toHaveText(PROFILE_LABELS[scholar.profile_status]);
    await expect(page.getByTestId('dashboard-revision-text')).toContainText(/Live revision|Not published yet/);
    await expect(page.getByTestId('dashboard-inquiry-count')).toHaveText(String(inquiries));
    expect(inquiries).toBeGreaterThanOrEqual(1); // the seeded inquiry
    await expect(page.getByTestId('dashboard-inquiry-trend')).toContainText(/vs previous 30 days|Same as previous|No inquiries/);
    await expect(page.getByTestId('dashboard-course-count')).toHaveText(String(publicCourses));
    await expect(page.getByTestId('dashboard-availability-badge')).toHaveText(
      availability?.is_available_for_hire ? 'Available' : availability ? 'Not available' : 'Not set'
    );
    // Removed: no view data exists, so none is shown.
    await expect(page.getByText('Public Directory Views')).toHaveCount(0);
    await expect(page.getByText('+18%')).toHaveCount(0);
  });

  test('inbox lists the real inquiry from the real institution', async ({ page }) => {
    const institution = await must(
      db.from('institutions').select('name').eq('id', APPROVED_INSTITUTION).single()
    );
    await page.goto('/dashboard/inquiries');
    await expect(page.getByText(SEEDED_INQUIRY_MESSAGE)).toBeVisible();
    await expect(page.getByRole('heading', { name: institution.name }).first()).toBeVisible();
    await expect(page.getByText('Trinity Evangelical Divinity School')).toHaveCount(0);
    await expect(page.getByText('Southern Baptist Theological Seminary')).toHaveCount(0);
  });

  test('a failed accept rolls the status back and tells the user; the contact email stays hidden until accepted', async ({ page }) => {
    // Arrange: the seeded inquiry is awaiting (the PATCH below is intercepted, so nothing changes in the database).
    await must(
      db.from('inquiries').update({ status: 'pending' }).eq('message', SEEDED_INQUIRY_MESSAGE).select('id')
    );

    // Data minimisation: the institution contact email is not in the page or its RSC payload before acceptance.
    const html = await (await page.request.get('/dashboard/inquiries')).text();
    expect(html).not.toContain(PERSONA_EMAILS.institution);

    await page.goto('/dashboard/inquiries');
    const card = page.getByTestId('inquiry-card').filter({ hasText: SEEDED_INQUIRY_MESSAGE });
    await expect(card).toHaveAttribute('data-status', 'pending');
    await expect(card).toContainText('Awaiting response');
    await expect(page.getByText(PERSONA_EMAILS.institution)).toHaveCount(0);

    await page.route(/\/api\/inquiries\/[^/?]+$/, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Internal error"}' })
        : route.continue()
    );
    await card.getByRole('button', { name: 'Accept Opportunity' }).click();

    // The dialog is labelled, takes focus, does not show the email before acceptance, and closes on Escape.
    const dialog = page.getByRole('dialog', { name: /Accept Inquiry from/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toContainText(PERSONA_EMAILS.institution);
    await expect(dialog.getByRole('textbox')).toBeFocused();

    await dialog.getByRole('button', { name: 'Confirm Acceptance' }).click();
    await expect(dialog.getByRole('alert')).toContainText('could not update this inquiry');
    await expect(card).toHaveAttribute('data-status', 'pending'); // rolled back
    await expect(card).toContainText('Awaiting response');
    await expect(page.getByText(PERSONA_EMAILS.institution)).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    const row = await must(db.from('inquiries').select('status').eq('message', SEEDED_INQUIRY_MESSAGE).single());
    expect(row.status).toBe('pending');
  });

  test('tabs are keyboard-navigable and awaiting includes pending items', async ({ page }) => {
    await page.goto('/dashboard/inquiries');
    const all = page.getByRole('tab', { name: 'All', exact: true });
    await all.focus();
    await page.keyboard.press('ArrowRight');
    const awaiting = page.getByRole('tab', { name: /Awaiting response/ });
    await expect(awaiting).toBeFocused();
    await expect(awaiting).toHaveAttribute('aria-selected', 'true');
    await expect(awaiting).toHaveAttribute('aria-controls', 'inbox-panel');
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await expect(page.getByTestId('inquiry-card').first()).toBeVisible();
  });

  test('analytics is clearly labelled as sample data', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const banner = page.getByTestId('analytics-sample-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('role', 'note');
    await expect(banner).toContainText('Sample data — analytics are coming soon');
    await expect(banner).toContainText('They are not measurements of your profile or your visitors.');
    await expect(page.getByText('Live Feed')).toHaveCount(0);
  });
});
