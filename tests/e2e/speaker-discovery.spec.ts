import { test, expect } from '@playwright/test';

test.describe('Theological Conference Speaker Bureau Discovery', () => {
  test('navigates from homepage to speakers directory via public nav', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify navigation link to speakers bureau
    const speakersNav = page.locator('nav a[href="/speakers"]').first();
    await expect(speakersNav).toBeVisible();
    await speakersNav.click();

    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/speakers/);
    await expect(page.locator('h1')).toContainText('Invite Confessional Scholars for Keynotes & Lectures');
  });

  test('displays speaker cards with keynote topics, travel preferences, and filters', async ({ page }) => {
    await page.goto('/speakers');
    await page.waitForLoadState('domcontentloaded');

    // Verify filter chips exist
    await expect(page.getByRole('link', { name: 'All Audiences', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Academic Symposium / Keynote', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pastoral / Chapel Address', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Church-Wide / Lay Conference', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Undergraduate / Student Ministry', exact: true })).toBeVisible();

    // Verify speaker cards
    await expect(page.locator('text=Dr. Calvin Edwards').first()).toBeVisible();
    await expect(page.locator('text=Dr. Marcus Aurelius Vance').first()).toBeVisible();
    await expect(page.locator('text=Dr. Thomas Cranmer-Davies').first()).toBeVisible();

    // Verify lecture topics on speaker cards
    await expect(page.locator('text=The Architecture of Federal Theology').first()).toBeVisible();
    await expect(page.locator('text=Reason, Revelation, and the Radical Gospel').first()).toBeVisible();

    // Filter by audience: Pastoral / Chapel Address
    await page.getByRole('link', { name: 'Pastoral / Chapel Address', exact: true }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/audience=pastoral/);

    // Verify relevant speakers remain visible
    await expect(page.locator('text=Dr. Calvin Edwards').first()).toBeVisible();
    await expect(page.locator('text=Dr. Thomas Cranmer-Davies').first()).toBeVisible();
  });

  test('displays speaking bureau card and lecture topics on scholar profile', async ({ page }) => {
    await page.goto('/scholars/calvin-edwards');
    await page.waitForLoadState('domcontentloaded');

    // Verify ScholarSpeakerTopicsCard is rendered
    await expect(page.locator('h2', { hasText: 'Speaking Bureau & Keynote Topics' })).toBeVisible();
    await expect(page.locator('text=The Architecture of Federal Theology').first()).toBeVisible();
    await expect(page.locator('text=Holding the Line: Confessional Fidelity in Pastoral Ministry').first()).toBeVisible();

    // Verify travel reach & honorarium badges
    await expect(page.locator('text=Travel Reach').first()).toBeVisible();
    await expect(page.locator('text=Honorarium Policy').first()).toBeVisible();

    // Verify Invite to Speak button opens inquiry modal
    const inviteBtn = page.getByRole('button', { name: /Invite to Speak/i }).first();
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    // Verify inquiry modal appears
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('role=dialog')).toContainText('Dr. Calvin Edwards');
  });
});
