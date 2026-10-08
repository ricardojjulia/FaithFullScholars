# Spec: Small Database Follow-ups

- **Status:** Story and technical brief approved by the owner on 2026-10-08 (gates 3 and 5).

## Story
As **the platform**, only an institution's owners and admins can change its public profile, and unused legacy database objects are removed.

### Acceptance criteria
1. **Restrict profile editing to owners and admins.**
   - Only institution members with role `owner` or `admin` (plus platform admins) can update their institution's profile. The database enforces this through a new helper and the institution UPDATE policy.
   - Recruiters and plain members see the profile read-only, with a short explanation.
   - The profile API returns 403 for them.
2. **Drop the legacy search limiter.**
   - The unused `search_rate_limits` table and `check_search_rate_limit` function are dropped. ADR 0026 replaced them.
   - The deploy checks (`verify:deploy`, `verify:pilot`) check the new limiter instead.
   - The legacy test is removed, and a test asserts that both objects no longer exist.
3. **Record a decision.** The "hide the dean's email" item is closed as not worth doing, because the institution's contact email is already public (owner decision, 2026-10-08). This is noted in the docs.
4. **Tests:**
   - real-role tests: a recruiter or member cannot update the institution; an owner or admin can;
   - the policy-matrix recruiter scenario;
   - each guard is proven to fail when removed.

### Deploy
One migration. Run the preflight first, to check that every institution has an owner.

## Technical brief
- **Migration** `20261010090000_db_followups.sql`, idempotent.
  - **Preflight:** abort if any institution has no member with the `owner` role.
  - **New helper:** `private.is_institution_admin(uuid)`: SECURITY DEFINER, `search_path=''`, true when the caller's role is owner or admin, keyed on `auth.uid()`. It has a public SECURITY INVOKER wrapper. Grants follow the `20261004120000` pattern.
  - **Institutions UPDATE policy:** drop the existing policy and recreate it as `USING (public.is_institution_admin(id) OR public.is_admin()) WITH CHECK (same)`. A denied update then matches zero rows, and the existing `updateInstitutionProfile` already returns 403 in that case.
  - **Legacy limiter:** `DROP FUNCTION IF EXISTS public.check_search_rate_limit(TEXT, INT, BOOLEAN);` and `DROP TABLE IF EXISTS public.search_rate_limits;`. No CASCADE.
- **App:**
  - `getSessionContext` also loads `institution_users.role`.
  - The profile page passes `canEdit`. Recruiters and members get a read-only form with an explanation.
  - `PATCH /api/institution/profile` returns 403 early for non-admin roles.
- **Scripts:**
  - `verify-deployment.ts`: replace `search_rate_limits` with `rate_limit_buckets`.
  - `verify-pilot-readiness.ts`: check `rate_limit_buckets` and `check_rate_limit`.
- **Tests:**
  - Delete `search-rate-limits.test.ts`. Assert that `to_regclass` and `to_regprocedure` return NULL for the dropped objects.
  - In `persistent-rate-limits.test.ts`, remove the legacy function from the grants test.
  - Add a policy-matrix `institutions` × `institution_recruiter` scenario (every column non-writable, with `requireVisible`).
  - Real-role tests: a recruiter or member update matches 0 rows; owner, admin and platform admin succeed. Include a rollback probe that restores the old policy.
  - Unit tests: the role-gated 403, and the read-only form.
- **Docs:**
  - ADR 0023 note (role gate).
  - ADR 0026 note (legacy limiter dropped).
  - Plan line about recruiters editing.
  - CHANGELOG.
  - Record the dean-email decision.
