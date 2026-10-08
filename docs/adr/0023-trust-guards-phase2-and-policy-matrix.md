# ADR 0023: Trust Guards Phase 2 and the Policy Matrix as the Write Contract

- **Status:** Accepted
- **Date:** 2026-10-05
- **Deciders:** Core Engineering (Council Review 12, owner-approved Prompt B)
- **Builds on:** ADR 0022

---

## Context

Council Review 12 (`docs/reviews/2026-10-05-council-review-12-synthesis.md`, finding C-1) found the bug class from ADR 0022 in tables #47 did not cover. Policies there authorize *rows*, not *columns* or *state transitions*, and do not require an approved institution:

- **`institution_subscriptions`:** any member, even of a pending institution, could set its own tier and limits. `POST /api/institution/subscription/upgrade` did this with no payment.
- **`institution_contracts`:** the institution could set `accepted`, which is the scholar's decision. The scholar could rewrite compensation.
- **`contract_milestones`:** either side could rewrite amounts and statuses.
- **`course_licensing_agreements`:** a license could be requested for a course the scholar doesn't offer. Either side could forge the other's signature or mark the license `active`. Terms could be changed after the other party signed.
- **`institution_endorsements`:** a pending institution could issue "credential verified" endorsements.
- **`consortiums` / `consortium_members`:** a pending institution could create a consortium and list any institution as an *active* member without its consent.

Separately, `audit:rls` and `audit:security` **passed on a database with these holes**. They prove policies exist, not what policies permit. Each defect so far was found by a human or agent reading policy text.

## Decision

1. **Guards.** Migration `20261005150000_trust_guards_phase2.sql` extends the ADR 0022 trigger pattern:
   - The triggers are `SECURITY INVOKER` and fail closed via `private.is_restricted_caller()`.
   - Cross-table reads go through small owner-privileged helpers in the non-exposed `private` schema.
   - Rules are expressed as *who may make which transition*:
     - **Subscriptions:** members may only add one to the usage counter. Plan changes are staff-only until billing exists.
     - **Contracts:** the scholar responds and the institution offers or administers. Terms lock after the scholar responds.
     - **Milestones:** the scholar submits; the institution verifies and pays. Amounts lock after acceptance.
     - **Licensing:** each side signs only for itself. Status is `active` only with both signatures. New terms void the counterparty's signature. Active terms are frozen. A course can only be licensed from the scholar who offers it.
     - **Endorsements:** only approved institutions may issue them. "Credential verified" requires the institution's owner or admin.
     - **Consortiums:** only approved institutions may found one. Other institutions join as `pending`. No self-service acceptance flow exists yet, so platform staff confirm memberships.
     - **Deletes and walk-backs:** milestones cannot be deleted after the scholar responds, and an active license can only move to `terminated`.
2. **Policy matrix.** `tests/integration/policy-matrix.json` is the declared write contract per table and persona:
   - Every column must be declared writable or not, with a probe value, or skipped with a reason. The runner fails if a probe doesn't change the value: Postgres `now()` is constant within a transaction, so a no-op write would otherwise pass vacuously.
   - It covers 14 scenarios over 11 tables. Columns maintained by triggers (`updated_at`) are skipped.
   - `tests/integration/policy-matrix.test.ts` fails CI on undeclared or stale columns, and on any probe whose real-role outcome differs from the declaration.
   - New columns on covered tables are therefore *decided*, not silently writable.
3. **Product consequences, made explicit rather than faked:**
   - The upgrade route returns 403 with a "contact the team" message.
   - The subscription page shows that message instead of a broken form; the form had posted form data to a JSON route.
   - Consortium invitations are created as `pending`.

## Consequences

- **Positive:** The ADR 0022 bug class is closed on every table with institution or scholar trust state that reviews have found. A machine-checked contract now protects it from regressions on those tables.
- **Negative:**
  - Plan changes and consortium activations need staff action until billing and invitation flows exist.
  - The matrix covers declared tables only. Adding a table to it is a review step.
- **Follow-up:**
  - Extend the matrix to every table with an UPDATE policy.
  - Consider default-deny column grants (Council Wildcard proposal 2) once the matrix guards regressions.
  - Add a member-side "accept consortium invitation" flow.
  - `institution_subscriptions` has no member INSERT policy, so the guard's INSERT branch is defense in depth. `incrementInquiryUsage`'s fallback upsert for a missing subscription row fails silently. Provision subscription rows server-side.
  - Add billing.

---

## Status note (2026-10-08): institution profile role gate

Migration `20261010090000_db_followups.sql` closes the "any institution member can edit the profile" gap. A new `private.is_institution_admin(uuid)` helper (SECURITY DEFINER, `search_path=''`, keyed on `auth.uid()`, true for role `owner` or `admin`) has a public SECURITY INVOKER wrapper, following the 20261004120000 pattern. The `institutions` UPDATE policy is replaced with `USING` and `WITH CHECK` of `is_institution_admin(id) OR is_admin()`. A recruiter's or member's update now matches zero rows, which `updateInstitutionProfile` already reports as 403. The trust-column trigger (`guard_institutions`) is unchanged and still applies to owners and admins.

The app mirrors the rule for UX only: `getSessionContext` carries `institutionRoles`, `PATCH /api/institution/profile` returns 403 early, and the profile page is read-only for other roles. Unknown or missing roles fail closed. The database policy is the boundary.

A preflight in the migration aborts if any institution has members but none is an owner or admin, so no institution is locked out. Institutions with no members are unaffected (only platform admins can edit them). The policy matrix gains an `institutions` x `institution_recruiter` scenario (no column writable, `requireVisible`), and `tests/integration/institution-profile-roles.test.ts` proves the behaviour with real roles plus a rollback probe that restores the old policy.
