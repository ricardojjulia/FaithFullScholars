# Test-surface gate and E2E personas

Adopted from ChurchCore-LMS (COUNCIL-2026-031 D5–D7) on 2026-10-05.

## Test-surface gate (`npm run test:surface`, CI job `test-surface`)

`scripts/test-surface.mjs` discovers every product surface from the filesystem:

| Kind | Id format | Source |
|---|---|---|
| Page | `page:/institution/postings/[id]/applicants` | `app/**/page.tsx` (route groups and `@slots` dropped) |
| API method | `api:GET /api/inquiries` | each exported HTTP method in `app/**/route.ts` |
| Server Action | `action:lib/auth/auth-actions.signupInstitution` | exported async functions in `'use server'` modules under `app/` or `lib/` |

CI fails unless every surface either:

- is named by a `covers('…')` call in a test (`tests/support/covers.ts`; the call is a no-op at runtime and is read statically), or
- has an exemption in `tests/surface/exemptions.json` with `surface`, `reason`, `owner`, and `expires` (`YYYY-MM-DD`, at most 60 days out).

CI also fails on:

- a `covers()` tag that matches no surface (a typo);
- an exemption that is stale (the surface is now covered), unknown, invalid, or expired.

**Baseline:** at adoption, 79 of 103 surfaces received baseline exemptions expiring 2026-12-02. Each expired exemption fails CI until it is replaced by a real test, so coverage has to grow rather than be waved through.

```bash
npm run test:surface              # report; exit 1 on any problem
node scripts/test-surface.mjs --list   # every discovered surface id
```

## E2E with real logins (`.github/workflows/e2e.yml`)

Runs on every PR against a production build and a disposable local Supabase stack:

1. `supabase start`. The anon key, service-role key, and a per-run random `TEST_USER_PASSWORD` are exported and masked.
2. `scripts/ci-setup-test-users.mjs` creates three personas through the Auth Admin API. It refuses to run against a non-local host. The seed `auth.users` rows cannot sign in through GoTrue, which is why fresh users are needed.
   - `admin`: an account with role `admin`.
   - `scholar`: an account with role `scholar` and a draft profile.
   - `institution`: an owner of the approved seed institution.
3. The Playwright `setup` project signs each persona in through the real `/login` form and saves its session outside the repository (`tests/e2e/personas.ts`).
4. Specs opt in with `test.use({ storageState: storageStatePath('scholar') })`. `tests/e2e/role-boundaries.spec.ts` checks every persona's access at both page and API level.

Anonymous "demo" access to the portals was removed in ADR 0022, so specs for protected areas must sign in. Running locally requires a local Supabase stack plus the same environment variables.
