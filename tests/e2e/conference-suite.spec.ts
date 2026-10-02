import { test, expect } from '@playwright/test';

test.describe('Theological Guild Conference Suite (ADR 0021)', () => {
  test('renders search committee conference floor docket and deliberation rubric', async ({
    page,
  }) => {
    await page.goto('/institution/conferences');
    await page.waitForLoadState('domcontentloaded');

    // Verify main page title and badge
    await expect(page.locator('h1')).toContainText('Search Committee Conference Suite');
    await expect(page.locator('text=Annual Guild Conventions')).toBeVisible();

    // Verify conference tabs
    await expect(page.getByRole('button', { name: /ETS 2026/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /SBL \/ AAR 2026/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /EPS 2026/i })).toBeVisible();

    // Verify interview floor docket and deliberation rubric
    await expect(page.locator('text=Committee Interview Floor Docket')).toBeVisible();
    await expect(page.locator('text=Confidential Committee Deliberation Rubric')).toBeVisible();

    // Verify presenting faculty roster
    await expect(page.locator('text=Presenting Faculty & Monograph Sessions')).toBeVisible();
    await expect(page.locator('text=Dr. Thomas Cranmer-Davies').first()).toBeVisible();
    await expect(page.locator('text=Acoustic Parallelism and Phonological Structures').first()).toBeVisible();

    // Verify print button
    await expect(page.getByRole('button', { name: /Print Floor Docket/i })).toBeVisible();
  });

  test('displays conference presentation card on scholar profile', async ({ page }) => {
    await page.goto('/scholars/thomas-cranmer-davies');
    await page.waitForLoadState('domcontentloaded');

    // Verify guild conference presentations section
    await expect(
      page.locator('text=Annual Guild Conference Presentations (ETS / SBL / EPS)')
    ).toBeVisible();
    await expect(
      page.locator('text=Acoustic Parallelism and Phonological Structures')
    ).toBeVisible();
    await expect(page.locator('text=ETS 2026').first()).toBeVisible();
  });
});
