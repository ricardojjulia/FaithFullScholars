import { test, expect } from '@playwright/test';

test.describe('SEO Topic Hubs & Structured Metadata Journey', () => {
  test('renders disciplines index and navigates to discipline hub', async ({ page }) => {
    await page.goto('/disciplines');

    await expect(page).toHaveTitle(/Theological Disciplines & Faculty Specialties/);
    await expect(page.locator('h1')).toContainText('Theological Disciplines & Specialties');

    // Find and click a discipline card
    const firstDiscipline = page.locator('a[href^="/disciplines/"]').first();
    await expect(firstDiscipline).toBeVisible();
    await firstDiscipline.click();

    // Verify we are on a discipline slug page
    await expect(page.locator('text=Faculty Specializing in')).toBeVisible();

    // Verify Schema.org JSON-LD microdata script tag is present
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScripts.first()).toBeAttached();

    const textContent = await jsonLdScripts.first().textContent();
    expect(textContent).toContain('BreadcrumbList');
  });

  test('renders traditions index and navigates to tradition hub', async ({ page }) => {
    await page.goto('/traditions');

    await expect(page).toHaveTitle(/Historical Theological Traditions & Confessional Families/);
    await expect(page.locator('h1')).toContainText('Theological Traditions & Confessions');

    // Navigate to a tradition
    const firstTradition = page.locator('a[href^="/traditions/"]').first();
    await expect(firstTradition).toBeVisible();
    await firstTradition.click();

    // Verify tradition hub elements
    await expect(page.locator('text=Historic Confessional Standards & Creeds')).toBeVisible();

    // Verify JSON-LD script tag
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScripts.first()).toBeAttached();
  });
});
