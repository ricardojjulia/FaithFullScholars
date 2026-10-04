# ADR 0009: Session-Derived Identity and RLS Helper Isolation

- **Status:** Accepted
- **Date:** 2026-10-04
- **Deciders:** Core Engineering
- **Supersedes:** none (corrects implementation of ADR 0008 §1)

---

## Context

A code review on 2026-10-04 found that authorization was not actually enforced on several request paths, despite the claims in the README:

1. **Client-chosen tenancy.** Inquiry, shortlist, and export routes used the service-role client (which bypasses RLS) and took `scholarId` / `institutionId` from the query string or body. Anyone could read any scholar's inquiry inbox or any institution's shortlist. Postings and institutional endorsements silently fell back to a hardcoded institution id.
2. **Self-assignable admin.** `verifyStaffUser` accepted `user_metadata.role`, which every user can edit for their own account.
3. **Environment bypass.** Admin routes skipped authorization when `NODE_ENV=development` or `ENABLE_DEV_ROUTES=true`.
4. **Recursive RLS helpers.** `public.is_admin()`, `get_current_scholar_id()`, and `is_institution_user()` were `SECURITY INVOKER`, so they read tables whose policies call the same helpers (for example `accounts` → `is_admin()` → `accounts`). The `institution_users` "manage" policy also queried its own table. Every integration test connected as a role that bypasses RLS, so this was never exercised.

## Decision

### Identity comes from the session, never the request
- `lib/auth/session.ts#getSessionContext` resolves the caller from `auth.getUser()` (verified by the auth server) and reads role and tenancy from `accounts`, `scholars`, and `institution_users`.
- `resolveInstitutionAccess` honours a requested institution only if the caller is a member of it. A route may never act for an institution the caller does not belong to.
- The admin role is `public.accounts.role = 'admin'`, the same source RLS uses. Auth `user_metadata` is never consulted. There are no environment-based authorization bypasses.

### Request paths use the caller's RLS-scoped client
- Inquiry and shortlist functions take a `SupabaseClient` parameter instead of creating a service-role client internally. Routes pass the user-scoped client, so Postgres RLS is the enforcing layer and the route check is a second line.
- The service role remains only where a privileged read is unavoidable and its result is never returned to the caller: looking up the recipient scholar's private email to send the notification. It is also used by staff-only admin modules after `verifyStaffUser`, and by pilot telemetry and rate-limit storage.

### RLS helpers run as owner from a non-exposed schema
- Migration `20261004120000_fix_rls_helper_recursion.sql` adds `private.is_admin()`, `private.get_current_scholar_id()`, `private.is_institution_user(uuid)`, and `private.is_institution_owner(uuid)`. They are `SECURITY DEFINER`, `STABLE`, with `search_path = ''`.
- `private` is not in PostgREST's exposed schemas (`supabase/config.toml` `[api].schemas`), so these functions are not callable via `/rest/v1/rpc`. This also keeps Splinter lints 0028/0029 clean.
- The existing `public.*` helpers keep their names and signatures as `SECURITY INVOKER` wrappers, so no existing policy had to change except the self-referencing `institution_users` policy.

## Consequences

- **Positive:** Cross-account reads and writes on these paths are denied by both the route and Postgres. Policies can now be evaluated for real `anon` and `authenticated` callers, which `tests/integration/rls-authenticated.test.ts` proves in CI.
- **Negative:** Until signup and login (Phase 2) ship, the scholar dashboard, institution portal, and admin console are unreachable for everyone. This is intentional: they previously "worked" only because they were unauthenticated.
- **Follow-up:** Phase 2 authentication; a column-level guard so only the recipient scholar can set `accepted`/`declined` (currently enforced in application code); a scholar→posting application model (express-interest now returns `501`); a persistent inquiry rate limiter (the current one is in-memory).
