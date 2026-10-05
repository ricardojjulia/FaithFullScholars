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
     - **Consortiums:** only approved institutions may found one. Other institutions join as `pending` and must accept themselves.
2. **Policy matrix.** `tests/integration/policy-matrix.json` is the declared write contract per table and persona:
   - Every column must be declared writable or not, with a probe value, or skipped with a reason.
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
  - Add billing.
