import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against a production build backed by a disposable local Supabase
 * stack (.github/workflows/e2e.yml). Personas sign in through the real /login
 * flow in the `setup` project (tests/e2e/auth.setup.ts); specs opt in with
 * `test.use({ storageState: storageStatePath('<persona>') })`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3845',
    // No traces in CI: they record request bodies and cookies (the persona
    // password and session tokens) and failed-run artifacts are public.
    trace: process.env.CI ? 'off' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run start',
    port: 3845,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
