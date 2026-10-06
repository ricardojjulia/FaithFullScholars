import { test as setup, expect } from '@playwright/test';
import { PERSONA_EMAILS, storageStatePath, type Persona } from './personas';

/**
 * Signs in each persona through the real /login form (Supabase Auth, SSR
 * cookies) and saves the session for specs that need it. Users are created by
 * scripts/ci-setup-test-users.mjs with the per-run TEST_USER_PASSWORD.
 */
const password = process.env.TEST_USER_PASSWORD;

for (const persona of Object.keys(PERSONA_EMAILS) as Persona[]) {
  setup(`sign in as ${persona}`, async ({ page }) => {
    expect(password, 'TEST_USER_PASSWORD must be set (see scripts/ci-setup-test-users.mjs)').toBeTruthy();

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(PERSONA_EMAILS[persona]);
    await page.locator('input[name="password"]').fill(password!);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });

    await page.context().storageState({ path: storageStatePath(persona) });
  });
}
