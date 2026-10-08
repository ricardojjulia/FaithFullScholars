import { test, expect } from '@playwright/test';
import { storageStatePath } from './personas';
import { covers } from '../support/covers';

covers('page:/institution/conferences', 'page:/scholars/[slug]');

/**
 * The conference hub (ADR 0021) runs on in-memory demo data, so it is a
 * staff-only preview. Institution users must not see it in navigation, must get
 * a "coming soon" notice when they open it directly, and public scholar profiles
 * no longer show invented conference appearances.
 */
test.describe('conference hub for an institution user', () => {
  test.use({ storageState: storageStatePath('institution') });

  test('is hidden from the institution navigation', async ({ page }) => {
    await page.goto('/institution');
    // the institution nav rendered (so the missing link is not a loading artefact) ...
    await expect(page.getByRole('link', { name: 'Overview', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Course Licensing', exact: true })).toBeVisible();
    // ... and it has no Conferences entry
    await expect(page.getByRole('link', { name: 'Conferences', exact: true })).toHaveCount(0);
  });

  test('shows a coming-soon notice, not the hub, when opened directly', async ({ page }) => {
    const res = await page.goto('/institution/conferences');
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId('conferences-coming-soon')).toBeVisible();
    await expect(page.getByRole('heading', { name: /coming soon/i })).toBeVisible();
    await expect(page.getByTestId('conference-preview-banner')).toHaveCount(0);
    await expect(page.getByText('Committee Interview Floor Docket')).toHaveCount(0);
    await expect(page.getByText('Saved to Committee Docket')).toHaveCount(0);
  });
});

test.describe('public scholar profile', () => {
  test('has no invented conference appearances', async ({ page }) => {
    await page.goto('/scholars/thomas-cranmer-davies');
    await expect(page.locator('h1')).toContainText('Thomas Cranmer-Davies');
    await expect(page.getByText('Annual Guild Conference Presentations')).toHaveCount(0);
    await expect(page.getByText('Acoustic Parallelism and Phonological Structures')).toHaveCount(0);
  });
});
