import { test, expect } from '@playwright/test';

test.describe('Distinguished Scholar Dossier & Media Showcase Journey (ADR 0014)', () => {
  test('renders distinguished fellow badge, academic IDs, and media showcase on scholar profile', async ({ page }) => {
    await page.goto('/scholars/calvin-edwards');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Scholar Hero & Distinguished Badge
    await expect(page.locator('h1')).toContainText('Dr. Calvin Edwards');
    await expect(page.getByText('Distinguished Fellow').first()).toBeVisible();

    // 2. Verify Academic Identifiers (ORCID & Google Scholar)
    await expect(page.locator('text=ORCID: 0000-0002-1825-0097')).toBeVisible();
    await expect(page.locator('text=Google Scholar')).toBeVisible();

    // 3. Verify Board Dossier action button
    const dossierBtn = page.getByRole('link', { name: /Board Dossier/i });
    await expect(dossierBtn).toBeVisible();

    // 4. Verify Media Showcase Section
    await expect(page.locator('text=Media & Lecture Showcase')).toBeVisible();
    await expect(page.locator('text=The Federal Principle in 17th Century Reformed Dogmatics')).toBeVisible();

    // 5. Verify Click-to-Play Zero-CLS Media Facade
    const playBtn = page.getByRole('button', { name: /Play lecture: The Federal Principle/i });
    await expect(playBtn).toBeVisible();
    await playBtn.click();

    // Iframe embed should replace poster
    const iframe = page.locator('iframe[title="The Federal Principle in 17th Century Reformed Dogmatics"]');
    await expect(iframe).toBeVisible();
  });

  test('renders board-ready print dossier with SBL citations and terminal credentials', async ({ page }) => {
    await page.goto('/scholars/calvin-edwards/dossier');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Dossier Header & Candidate Title
    await expect(page.locator('h1')).toContainText('Dr. Calvin Edwards');
    await expect(page.getByText('Candidate Dossier')).toBeVisible();
    await expect(page.getByText('Distinguished Fellow').first()).toBeVisible();

    // 2. Verify Academic Identifiers
    await expect(page.locator('text=0000-0002-1825-0097')).toBeVisible();

    // 3. Verify Terminal Degrees Section
    await expect(page.locator('text=Academic Credentials & Degrees')).toBeVisible();

    // 4. Verify SBL / Chicago formatted publications
    await expect(page.locator('text=Select Publications & Research Bibliography (SBL Handbook of Style)')).toBeVisible();

    // 5. Verify Confessional Subscription & Theological Foundations
    await expect(page.locator('text=Confessional Standards & Doctrinal Affirmation')).toBeVisible();
    await expect(page.getByText('Westminster Confession of Faith', { exact: true })).toBeVisible();

    // 6. Verify Print Action Button
    const printBtn = page.getByRole('button', { name: /Print \/ Save PDF Dossier/i });
    await expect(printBtn).toBeVisible();
  });
});
