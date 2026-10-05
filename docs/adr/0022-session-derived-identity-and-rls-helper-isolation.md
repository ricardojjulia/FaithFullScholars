# ADR 0022: Session-Derived Identity, Page-Level Guards, and RLS Helper Isolation

- **Status:** Accepted
- **Date:** 2026-10-04
- **Deciders:** Core Engineering
- **Related:** ADR 0008 (data protection), migration `20260921110000_copilot_review_remediations.sql` (partial recursion fix)

---

## Context

An authorization review on 2026-10-04 against `main` @ `e3da2fa` found:

1. **Client-chosen tenancy.** In any non-production environment (and in production whenever `ENABLE_DEV_ROUTES=true`), the shortlist, saved-course, and shortlist-export routes accepted an anonymous caller's `institutionId`, or defaulted to a seed institution. They read and wrote through the service role, which bypasses RLS. Several institution portal pages defaulted to a seed institution for anonymous visitors. `/institution/postings/[id]/applicants` returned another institution's applicant report this way.
2. **Layout-only guards.** `/admin/reviews`, `/admin/reviews/[id]`, `/admin/reports`, and `/admin/institutions` load data with the service role and relied on the admin layout for authorization. The Next.js docs (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, "Layouts and auth checks") say a layout "does not stop [route segments] from running or from appearing in the RSC Payload".
3. **Self-assignable admin.** `verifyStaffUser` and `/dev/status` accepted `user_metadata.role`, which every user can edit for their own account.
4. **Environment bypass.** Admin routes and pages skipped authorization when `NODE_ENV=development` or `ENABLE_DEV_ROUTES=true`. `PATCH /api/inquiries/[id]` skipped it whenever `NODE_ENV !== 'production'`.
5. **Self-grantable trust columns (found by `pr-review`, 2026-10-05).** UPDATE policies on `accounts`, `scholars`, `institutions`, and `inquiries` restrict *rows* but not *columns*, and have no `WITH CHECK`. Through PostgREST, using the public anon key and their own JWT, any signed-in user could:
   - set their own `accounts.role = 'admin'`;
   - approve, verify, or publish their own scholar profile;
   - approve their own institution or set its accreditation;
   - as an institution, accept an inquiry or rewrite its parties.

   The inquiry INSERT policy checked membership but not approval. The approval checks lived only in application code. The `accounts` escalation predates this ADR and was live on `main`.
6. **Recursive RLS helpers (partially fixed earlier).** `20260921110000` made `is_institution_user()` `SECURITY DEFINER`, but `is_admin()` and `get_current_scholar_id()` were still `SECURITY INVOKER`. So `accounts` → `is_admin()` → `accounts` still recursed. The `FOR ALL` "Institution owner or admin can manage users" policy still queried `institution_users` from inside its own policy, and `FOR ALL` policies also apply to `SELECT`. Postgres short-circuits `OR` at runtime, so the recursion appears only on rows where earlier conditions are false (for example draft scholars and other users' accounts). Existing anon-role tests only read rows that short-circuit.

## Decision

### Identity comes from the session, never the request
- `lib/auth/session.ts#getSessionContext` resolves the caller from `auth.getUser()` and reads role and tenancy from `accounts`, `scholars`, and `institution_users`.
- `resolveInstitutionAccess` honours a requested institution only if the caller is a member of it.
- The admin role is `public.accounts.role = 'admin'`, the same source RLS uses. No authorization decision reads auth `user_metadata` (the client user menu still uses it for display only). There are no environment-based authorization bypasses.

### Every protected server page guards itself
- `lib/auth/guards.ts` provides `requireStaffPage()` (404), `requireInstitutionMember()` (redirect to `/login`, or 404 for non-members), and `requireSignedIn()`.
- Each page that loads protected data calls a guard **before** fetching. Layout guards remain only as a user-experience redirect.

### Request paths use the caller's RLS-scoped client
- The inquiry and shortlist modules (`lib/inquiries/*`) and the ATS accreditation service take a `SupabaseClient` parameter. Routes and pages pass the user-scoped client, so Postgres RLS is the enforcing layer.
- The service role remains only where a privileged read is unavoidable and the result is never returned to the caller (for example, the recipient scholar's email for a notification). It is also used by staff modules behind a guard and by telemetry and rate-limit storage.

### RLS helpers run as owner from a non-exposed schema
- Migration `20261004120000_fix_rls_helper_recursion.sql` adds `private.is_admin()`, `private.get_current_scholar_id()`, `private.is_institution_user(uuid)`, and `private.is_institution_owner(uuid)`. They are `SECURITY DEFINER` with `search_path = ''`.
- `private` is not exposed by PostgREST (`supabase/config.toml` `[api].schemas`), so these are not `/rest/v1/rpc` endpoints. This also keeps Splinter lints 0028/0029 clean.
- The `public.*` helpers keep their names and signatures as `SECURITY INVOKER` wrappers. `is_institution_user` had already been made `SECURITY DEFINER` by `20260921110000`, so only `is_admin` and `get_current_scholar_id` were still recursing; it now also sits behind a wrapper, which moves it out of the exposed schema. The self-referencing `institution_users` `FOR ALL` policy is replaced. Institution owners can still add any account as a member; that is by design until an invitation and consent flow exists.
- **Deployment note:** `private` must not be in the hosted project's *Exposed schemas* setting (Dashboard → API). `supabase/config.toml` covers only local development and `config push`.

### Trust and privilege columns are protected in the database
- Migration `20261005090000_protect_trust_columns.sql` adds `BEFORE INSERT/UPDATE` triggers that follow the existing `prevent_scholar_tier_escalation` pattern. The restrictions apply only to `anon` and `authenticated` callers who are not admins, so the service role and server-side admin actions are unaffected. They protect:
  - `accounts`: `role`, `id`, and `email`;
  - `scholars`: `profile_status`, `verification_status`, `published_revision_id`, and `account_id`;
  - `institutions`: `status`, `slug`, and the accreditation fields;
  - `inquiries`: parties and content are immutable, and only the recipient scholar can accept or decline;
  - new rows start in their unprivileged state.
- The inquiry INSERT policy now requires an approved institution and an approved scholar.

## Consequences

- **Service role on request paths, by exception only.** Two kinds remain. Staff-only modules (`lib/admin/*`) are reached only after `verifyStaffUser` or `requireStaffPage`. Server-only reads never return their result to the caller: the recipient scholar's email for notifications, and `getPostingApplicantReport`, whose `institutionId` scope is now required and comes from `requireInstitutionMember`.
- **Positive:** Cross-tenant reads and writes on these paths are denied by both the application and Postgres. RLS policies evaluate correctly for real `anon` and `authenticated` callers, which `tests/integration/rls-authenticated.test.ts` proves in CI. Page guards are covered by `tests/unit/page-guards.test.ts`, which fails against the previous pages.
- **Negative:** Local and preview environments no longer offer anonymous "demo" access to the portals and admin console. Use real seeded accounts via `/login` instead.
- **Follow-up:** a persistent inquiry rate limiter (the in-memory one is also bypassed by direct inserts); scholar→posting applications (scholars cannot insert `inquiries` under RLS, so express-interest always fails); and replacing in-memory or seed demo data in conferences and the ATS matrix.
