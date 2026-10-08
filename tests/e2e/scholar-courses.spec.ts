import { test, expect } from '@playwright/test';
import { storageStatePath } from './personas';
import { APPROVED_INSTITUTION, SCHOLAR_PERSONA, serviceClient } from './portal-fixtures';
import { covers } from '../support/covers';

/**
 * My Courses for scholars (spec 2026-10-08-scholar-courses): create, publish,
 * edit, delete, and the licensing guard, all through the real UI as the scholar
 * persona. Database state is read with the service role.
 *
 * Catalogue visibility: the scholar persona is a DRAFT profile, and the public
 * catalogue only lists public courses of APPROVED scholars. So here we assert
 * the course is saved as public AND is correctly absent from /courses for the
 * draft persona; "visible to anonymous visitors" for an approved scholar is
 * proved at the database level by tests/integration/scholar-courses-rls.test.ts.
 * Mutating the shared persona to approved would race the other specs.
 *
 * Self-cleaning: every course this spec creates carries the RUN tag and is
 * removed in afterEach, so reruns are safe.
 */
covers(
  'page:/dashboard/courses',
  'page:/courses',
  'api:GET /api/scholars/courses',
  'api:POST /api/scholars/courses',
  'api:PATCH /api/scholars/courses/[id]',
  'api:DELETE /api/scholars/courses/[id]'
);

test.use({ storageState: storageStatePath('scholar') });
test.describe.configure({ mode: 'serial' });

const db = serviceClient();
const RUN = `E2E Courses ${Date.now().toString(36)}`;

async function personaScholarId(): Promise<string> {
  const { data, error } = await db.from('scholars').select('id').eq('slug', SCHOLAR_PERSONA.slug).single();
  if (error || !data) throw new Error('scholar persona missing');
  return data.id as string;
}

async function rowsFor(title: string) {
  const { data, error } = await db
    .from('courses')
    .select('id, title, visibility, level, scholar_id, delivery_modes')
    .eq('title', title);
  if (error) throw new Error(error.message);
  return data ?? [];
}

test.afterEach(async () => {
  await db.from('courses').delete().like('title', `${RUN}%`);
});

test('create is private, publish saves public, edit persists, delete removes', async ({ page }) => {
  const title = `${RUN} Romans`;
  const scholarId = await personaScholarId();

  await page.goto('/dashboard/courses');
  await expect(page.getByRole('heading', { name: 'My Courses' })).toBeVisible();
  // The old fixture courses must be gone.
  await expect(page.getByText('Exegesis of Romans & Galatians')).toHaveCount(0);

  // Create
  await page.getByRole('button', { name: 'Add course' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Title')).toBeFocused();
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Description').fill('A real course saved to the database.');
  await dialog.getByLabel('Level').selectOption('doctoral');
  await dialog.getByLabel('Online (self-paced)').check();
  await dialog.getByRole('button', { name: 'Add course' }).click();
  await expect(dialog).toHaveCount(0);

  const row = page.getByTestId('course-row').filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row.getByTestId('course-visibility')).toHaveText('Private');
  let [saved] = await rowsFor(title);
  expect(saved.visibility).toBe('private'); // owner decision: private until published
  expect(saved.scholar_id).toBe(scholarId);
  expect(saved.level).toBe('doctoral');
  expect(saved.delivery_modes).toEqual(['online_async']);

  // Survives a reload (it used to be lost)
  await page.reload();
  await expect(page.getByTestId('course-row').filter({ hasText: title })).toBeVisible();

  // Publish
  await page.getByRole('button', { name: `Publish ${title}` }).click();
  await expect(row.getByTestId('course-visibility')).toHaveText('Public');
  [saved] = await rowsFor(title);
  expect(saved.visibility).toBe('public');

  // Draft persona: not listed in the public catalogue until the profile is approved.
  await page.goto('/courses');
  await expect(page.getByText(title)).toHaveCount(0);

  // Edit
  await page.goto('/dashboard/courses');
  await page.getByRole('button', { name: `Edit ${title}` }).click();
  await page.getByRole('dialog').getByLabel('Level').selectOption('certificate');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  [saved] = await rowsFor(title);
  expect(saved.level).toBe('certificate');

  // Unpublish
  await page.getByRole('button', { name: `Unpublish ${title}` }).click();
  await expect(row.getByTestId('course-visibility')).toHaveText('Private');

  // Delete asks for confirmation first; cancel keeps it
  await page.getByRole('button', { name: `Delete ${title}` }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(await rowsFor(title)).toHaveLength(1);
  await page.getByRole('button', { name: `Delete ${title}` }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(row).toHaveCount(0);
  expect(await rowsFor(title)).toHaveLength(0);
});

test('a course with licensing agreements cannot be deleted', async ({ page }) => {
  const title = `${RUN} Licensed`;
  const scholarId = await personaScholarId();
  const created = await db
    .from('courses')
    .insert({ scholar_id: scholarId, title, slug: `e2e-licensed-${Date.now().toString(36)}`, level: 'graduate', visibility: 'private' })
    .select('id')
    .single();
  if (created.error || !created.data) throw new Error('could not seed course');
  const agreement = await db.from('course_licensing_agreements').insert({
    course_id: created.data.id,
    scholar_id: scholarId,
    institution_id: APPROVED_INSTITUTION,
    license_type: 'syllabus_only',
    term_duration: '1_semester',
  });
  if (agreement.error) throw new Error('could not seed agreement');

  await page.goto('/dashboard/courses');
  await page.getByRole('button', { name: `Delete ${title}` }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /licensing agreements/i })).toContainText(/private/i);
  await expect(page.getByTestId('course-row').filter({ hasText: title })).toBeVisible();
  expect(await rowsFor(title)).toHaveLength(1);
});

test('invalid input shows the server error and saves nothing', async ({ page }) => {
  await page.goto('/dashboard/courses');
  await page.getByRole('button', { name: 'Add course' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add course' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
