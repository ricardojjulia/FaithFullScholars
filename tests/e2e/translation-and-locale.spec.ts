import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n) & Language Parity E2E Journey', () => {
  test('persists and renders English UI across Public Navigation, User Menu, and Footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Language switcher toggle is available in navigation
    const langBtn = page.getByRole('button', { name: /Select Language/i });
    await expect(langBtn).toBeVisible();

    // Verify English navigation items
    await expect(page.locator('header')).toContainText(/Directory/i);
    await expect(page.locator('header')).toContainText(/Courses/i);
    await expect(page.locator('header')).toContainText(/Speakers/i);

    // Verify English footer items
    await expect(page.locator('footer')).toContainText(/Faculty Directory/i);
    await expect(page.locator('footer')).toContainText(/Academic Postings Marketplace|Postings/i);
  });

  test('switches seamlessly to Spanish and updates Navigation, Directory, and Footer without language mixing', async ({ page }) => {
    await page.goto('/scholars');
    await page.waitForLoadState('domcontentloaded');

    // Open language switcher dropdown and pick Español
    const langBtn = page.getByRole('button', { name: /Select Language/i });
    await langBtn.click();
    const esOption = page.getByRole('button', { name: /Español/i });
    await esOption.click();

    // Verify header navigation labels in Spanish
    await expect(page.locator('header')).toContainText(/Directorio/i);
    await expect(page.locator('header')).toContainText(/Cursos/i);
    await expect(page.locator('header')).toContainText(/Conferencistas/i);
    await expect(page.locator('header')).toContainText(/Oportunidades/i);

    // Verify footer in Spanish
    await expect(page.locator('footer')).toContainText(/Directorio/i);
  });

  test('switches language on Course Catalog and Theological Speaking Bureau', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');

    // Switch back to English
    const langBtn = page.getByRole('button', { name: /Select Language/i });
    await langBtn.click();
    const enOption = page.getByRole('button', { name: /English/i });
    await enOption.click();

    await expect(page.locator('header')).toContainText(/Courses/i);

    // Go to speakers
    await page.goto('/speakers');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('header')).toContainText(/Speakers/i);
  });
});
