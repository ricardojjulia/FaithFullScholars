# Run Report — 2026-10-08: Small Database Follow-ups (branch `fix/db-followups`)

## 1. Run Metadata
- **Branch:** `fix/db-followups` (draft PR)
- **Spec:** `docs/superpowers/specs/2026-10-08-db-followups.md`
- **Execution status:** built and locally verified (lint, typecheck, unit, test-surface, version:check). Integration and policy-matrix results come from CI (no local database). Migration `20261010090000` is not applied to production.

## 2. Intent
Restrict institution profile edits to owners and admins at the data layer, and drop the unused legacy search limiter.

## 3. Architecture, Security & RLS Impact
- **Migration:** `20261010090000_db_followups.sql`, idempotent: ownerless-institution preflight, `private.is_institution_admin` plus public wrapper, `institutions` UPDATE policy replaced (USING and WITH CHECK), `DROP FUNCTION IF EXISTS check_search_rate_limit` and `DROP TABLE IF EXISTS search_rate_limits` without CASCADE.
- **App:** `institutionRoles` in the session context, 403 in `PATCH /api/institution/profile`, read-only profile form for recruiters and members.
- **Scripts:** `verify-deployment.ts` and `verify-pilot-readiness.ts` check `rate_limit_buckets` / `check_rate_limit`.
- **ADRs:** 0023 status note, 0026 note.

## 4. Verification
Local: `npm run lint`, `tsc --noEmit`, `vitest --project unit`, `test:surface`, `version:check`. CI results for the head SHA are in the PR.
Proof of failure (in-suite): rollback probe restores the old policy and shows the recruiter update succeeds; a probe recreates the legacy table and shows the existence check sees it; the policy-matrix recruiter scenario fails if any column becomes writable.

## 5. Decision
Owner decision, 2026-10-08: the "hide the dean's email" follow-up is closed as not worth doing, because `institutions.contact_email` is already public.

## 6. Deploy
Preflight (every institution has an owner), apply migration `20261010090000`, then merge.

## 7. Residual Risk
Owners can still edit `contact_email` (public by design). A deployment with an ownerless institution fails the preflight and needs an owner assigned first.

## 8. Follow-up
None open from this slice. Next slice (owner order): the applications rebuild.
