import { test, expect } from '@playwright/test';

test.describe('Scholar Profile & Dossier Journey', () => {
  test('renders scholar profile dossier with academic credentials and endorsements', async ({ page }) => {
    await page.goto('/scholars/calvin-edwards');

    // Verify scholar name and title
    await expect(page.locator('h1')).toContainText('Dr. Calvin Edwards');

    // Verify doctoral degrees section
    await expect(page.locator('text=Education & Terminal Degrees')).toBeVisible();

    // Verify doctrinal alignment card (ADR 0001)
    await expect(page.locator('text=Doctrinal Stance & Historic Confessional Alignment')).toBeVisible();

    // Verify peer endorsements card (§21)
    await expect(page.locator('text=Faculty Endorsements & Commendations')).toBeVisible();
    await expect(page.getByRole('button', { name: /Endorse Colleague/i })).toBeVisible();
  });

  test('clicking Endorse Colleague opens the commendation modal', async ({ page }) => {
    await page.goto('/scholars/calvin-edwards');
    await page.waitForLoadState('domcontentloaded');

    const endorseBtn = page.getByRole('button', { name: /Endorse Colleague/i });
    await expect(endorseBtn).toBeVisible();
    // Wait for hydration by ensuring button is clickable and small wait
    await page.waitForTimeout(500);
    await endorseBtn.click();

    // Verify modal dialog appears
    await expect(page.locator('text=Endorse Dr. Calvin Edwards')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Academic Relationship')).toBeVisible();
    await expect(page.locator('text=Theological / Subject Focus Area')).toBeVisible();
  });
});
