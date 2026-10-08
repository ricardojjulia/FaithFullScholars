# Test-surface gate and E2E personas

Adopted from ChurchCore-LMS (COUNCIL-2026-031 D5–D7) on 2026-10-05.

## Test-surface gate (`npm run test:surface`, CI job `test-surface`)

`scripts/test-surface.mjs` discovers every product surface from the filesystem:

| Kind | Id format | Source |
|---|---|---|
| Page | `page:/institution/postings/[id]/applicants` | `app/**/page.tsx` (route groups and `@slots` dropped) |
| API method | `api:GET /api/inquiries` | each exported HTTP method in `app/**/route.ts` |
| Server Action | `action:lib/auth/auth-actions.signupInstitution` | `export async function` and `export const x = async` in `'use server'` modules under `app/` or `lib/` |
| Edge Function | `edge:<name>` | `supabase/functions/<name>/` (none today) |

Route discovery also catches re-exports such as `export { GET }`, `export { handler as GET }`, and `export const { GET } = …`.

CI fails unless every surface either:

- is named by a `covers('…')` call in a test (`tests/support/covers.ts`; the call is a no-op at runtime and is read statically), or
- has an exemption in `tests/surface/exemptions.json` with `surface`, `reason`, `owner`, `added`, and `expires` (`YYYY-MM-DD`).

**Exemption expiry:** `expires` must fall at most 60 days after `added`, and `added` cannot be in the future. Extending an exemption therefore means changing its `added` date, which reviewers see in the diff. CODEOWNERS covers `tests/surface/`, `tests/support/covers.ts`, and the gate script.

CI also fails on:

- a `covers()` tag that matches no surface (a typo);
- an exemption that is stale (the surface is now covered), unknown, invalid, or expired;
- discovering fewer than 50 surfaces (`MIN_SURFACES`). This catches a wrong working directory or a layout change.

The gate is declarative. A `covers()` tag asserts that a test *intends* to exercise a surface, and reviewers check that the test really does. An optional `tests/surface/a11y-known.json` lists tolerated accessibility violations, with the same reason, owner, and expiry discipline.

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
   - It also seeds data for `tests/e2e/portal-real-data.spec.ts`, idempotently: one inquiry from the institution to the scholar, an availability row for the scholar, and an isolated third scholar (`e2e-removal-scholar`, approved, one public course) that the spec adds to and removes from the shortlist so the two shared shortlist rows are never touched. The scholar must be `approved` because an institution can only read approved profiles under RLS, so it also appears in the public directory; no spec asserts an exact directory total, so this is harmless, and specs must keep it that way. Specs read expected values from the database with the service role (`tests/e2e/portal-fixtures.ts`, local stack only).
3. The Playwright `setup` project signs each persona in through the real `/login` form and saves its session outside the repository (`tests/e2e/personas.ts`).
4. Specs opt in with `test.use({ storageState: storageStatePath('scholar') })`. `tests/e2e/role-boundaries.spec.ts` checks every persona's access at both page and API level.

**Artifacts.** CI disables Playwright traces, because traces record request bodies and cookies, including the persona password and sessions, and failed-run artifacts are public on this repo. Screenshots are kept. Locally, traces are kept on failure.

**Required checks.** `test-surface` and `E2E Tests` are not required by the `main` ruleset yet. Once they have been stable, add them under Settings → Rules → Rulesets → Default → required status checks, alongside `lint`, `typecheck`, `unit-tests`, and `build`.

Anonymous "demo" access to the portals was removed in ADR 0022, so specs for protected areas must sign in. Running locally requires a local Supabase stack plus the same environment variables.
