import { test, expect } from '@playwright/test';
import { storageStatePath } from './personas';
import { covers } from '../support/covers';

/**
 * Role boundaries through the real login flow (ADR 0022): every persona reaches
 * its own workspace and is refused elsewhere — at the page AND the API level.
 */
covers(
  'page:/login',
  'page:/dashboard',
  'page:/institution',
  'page:/institution/saved',
  'page:/admin/institutions'
);

test.describe('anonymous visitor', () => {
  test('is sent to /login from the scholar and institution workspaces', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/institution');
    await expect(page).toHaveURL(/\/login/);
  });

  test('cannot read any protected API', async ({ request }) => {
    for (const path of ['/api/inquiries', '/api/institution/saved-scholars', '/api/admin/reviews']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(401);
    }
  });
});

test.describe('scholar', () => {
  test.use({ storageState: storageStatePath('scholar') });

  test('reaches the scholar workspace and their own inbox', async ({ page, request }) => {
    const res = await page.goto('/dashboard');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);
    expect((await request.get('/api/inquiries')).status()).toBe(200);
  });

  test('is refused by the institution portal and admin console', async ({ page, request }) => {
    expect((await page.goto('/institution'))?.status()).toBe(404);
    expect((await page.goto('/admin/institutions'))?.status()).toBe(404);
    expect((await request.get('/api/institution/saved-scholars')).status()).toBe(403);
    expect((await request.get('/api/admin/reviews')).status()).toBe(403);
  });
});

test.describe('institution member', () => {
  test.use({ storageState: storageStatePath('institution') });

  test('reaches the institution portal and its own shortlist', async ({ page, request }) => {
    const res = await page.goto('/institution/saved');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/institution\/saved/);
    expect((await request.get('/api/institution/saved-scholars')).status()).toBe(200);
  });

  test('cannot read another institution or the admin console', async ({ page, request }) => {
    const other = 'e1000000-0000-0000-0000-000000000002';
    expect((await request.get(`/api/institution/saved-scholars?institutionId=${other}`)).status()).toBe(403);
    expect((await page.goto('/admin/institutions'))?.status()).toBe(404);
  });
});

test.describe('platform admin', () => {
  test.use({ storageState: storageStatePath('admin') });

  test('reaches the admin console and admin APIs', async ({ page, request }) => {
    const res = await page.goto('/admin/institutions');
    expect(res?.status()).toBe(200);
    expect((await request.get('/api/admin/reviews')).status()).toBe(200);
  });
});
