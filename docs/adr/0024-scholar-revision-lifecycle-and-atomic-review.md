# ADR 0024: Scholar Revision Lifecycle and Atomic Admin Review

- **Status:** Accepted
- **Date:** 2026-10-06
- **Deciders:** Core Engineering (owner-approved story and brief, 2026-10-06)
- **Builds on:** ADR 0005, ADR 0022, ADR 0023
- **Spec:** `docs/superpowers/specs/2026-10-06-scholar-revision-lifecycle.md`

---

## Context

Scholar profile drafts lived only in browser `sessionStorage`, so no scholar could reach admin review. Review of the revision tables found these defects:

- A scholar could INSERT a revision already marked `approved`: the INSERT policy had no status check, and `processRevisionReview` approved any revision id.
- A scholar could not submit: the UPDATE policy allowed only `status='draft'` rows and had no WITH CHECK.
- Admin "reject" wrote `rejected`, which the status CHECK forbade.
- Approval never superseded the prior published revision and never cleared `draft_revision_id`. The approval was also several non-atomic client calls, with the audit insert failing silently.
- The published revision (including `admin_notes`) was readable by anyone, anonymous visitors included.

## Decision

1. **Migration `20261006090000_scholar_revision_lifecycle.sql`** follows the ADR 0022/0023 pattern:
   - The status CHECK gains `rejected`. `snapshot_data` must be a JSON object of at most 256 KB.
   - A partial unique index `uq_scholar_one_open_revision` allows one open revision (draft, submitted, changes_requested) per scholar.
   - `private.guard_scholar_profile_revisions()` is a `SECURITY INVOKER` trigger, fail-closed via `private.is_restricted_caller()`, with party flags COALESCEd to false. It enforces:
     - Insert: own scholar, `draft`, no reviewer fields. The database assigns `revision_number` (advisory-locked max+1).
     - Update: only these scholar transitions: draft to submitted, submitted to draft (withdraw, only while `reviewed_at` is NULL), changes_requested to draft or submitted. Reviewer fields, identity, and numbering are immutable. `snapshot_data` is editable only in draft or changes_requested. Approved, superseded, and rejected rows are frozen.
     - It sets `submitted_at`, clears `reviewed_at` on resubmit (so withdraw works again; prior `admin_notes` remain until the next decision and the audit trail lives in `profile_reviews`), and sets `updated_at`.
   - Policies: SELECT is owner or admin only. This removes the public published-revision clause and the public `admin_notes` exposure. INSERT requires own scholar and `draft`. UPDATE uses USING and WITH CHECK (own and open) or admin. There is no scholar DELETE.
   - `private.guard_scholars` additionally requires that `draft_revision_id` is NULL on restricted insert, and on restricted update points only at the scholar's own open revision or NULL. The pointer is advisory; the open revision is always found by query.
2. **`public.review_profile_revision(...)`** is a `SECURITY DEFINER` function executable only by `service_role`. It locks the scholar row first, then the revision (a scholar UPDATE of `draft_revision_id` locks scholar then FK-locks the revision, so the opposite order could deadlock), refuses non-submitted revisions (SQLSTATE `55000`) and missing ones (`P0002`), and performs approve, request_changes, or reject together with the `profile_reviews` audit insert in one transaction.
   - Approve supersedes the prior published revision, publishes the new one, and clears `draft_revision_id`. It sets `profile_status='approved'` unless the scholar is `hidden`, in which case they stay hidden. It copies scalar snapshot fields only, never `profile_tier` or `verification_status`.
   - Reject is terminal for the revision and does not touch `profile_status` or the published profile.
3. **API** (`/api/scholars/revisions`, `/submit`, `/withdraw`) uses the session identity and an RLS-scoped client. It accepts a 256 KB request cap checked before parsing, strips unknown snapshot keys (including `profile_tier`), and never accepts `scholar_id`, `status`, `revision_number`, or `admin_notes` from the client.
4. `lib/admin/actions.ts` calls the RPC through the existing admin client, keeps `hide`, and maps SQLSTATEs to `not_found` and `not_reviewable`, which the admin route returns as 404 and 409.
5. `tests/integration/policy-matrix.json` gains a `scholar_profile_revisions` scenario so every column is a declared decision.

## Consequences

- **Positive:** Moderation cannot be bypassed through PostgREST. Approval is atomic and audited. Public exposure of `admin_notes` is closed. Reject works.
- **Negative:**
  - Revisions are no longer publicly readable. Public pages must keep reading published data from `scholars` columns; relational promotion (credentials, publications, and so on) on approval is a follow-up.
  - Deploy needs a preflight for duplicate open revisions before the unique index is created.
- **Follow-up:** Promote relational snapshot sections on approval, notifications, and save rate limiting.

## Amendments from review (PR #56, commit `c5ce497`)

- The migration begins with a DO-block preflight that aborts with a clear message if any scholar has more than one open revision or any snapshot is not a JSON object of at most 256 KB.
- `lib/admin/actions.ts` returns `invalid_action` for unknown actions (previously fell through to hide) and `audit_failed` if the hide audit insert fails (route returns 500 with an honest message).
- The admin route returns 400 on malformed JSON. Feedback notes are required for `request_changes` and `reject` and capped at 2000 characters. The spec was silent on this; it is a reversible default and an owner-visible decision.
- Submit and withdraw honour the client `revisionId` pin (409 on a stale tab). The database size CHECK (23514) maps to 413.

## Residual risk and follow-ups

1. **RESOLVED by ADR 0025.** **HIGH, pre-existing:** a scholar can still UPDATE their live `scholars` content columns (`full_name`, `biography`, `doctrinal_statement_text`, and so on) and child tables (`scholar_disciplines`, `scholar_confessions`, `scholar_traditions`, credentials, publications) directly under RLS, bypassing revision review. Recommended next slice: lock content columns to the review path.
2. **RESOLVED by ADR 0025.** Approval publishes scalar fields only. Disciplines, traditions, confessions, credentials, and publications are not promoted to relational tables (spec non-goal). Public pages and match-faculty read relational tables, so they do not reflect approved revisions. Pair with item 1 as the next slice.
3. **Retention and erasure (GDPR Art. 9):** rejected and superseded revision snapshots, which can contain religious-belief data, are kept indefinitely, and admins can read the full snapshot of any revision. Belongs to the planned GDPR slice (retention, erasure, export).
4. Approve sets `profile_status='approved'` for any non-hidden scholar, including previously rejected profiles. This is deliberate.
5. `private.next_revision_number` and `private.revision_is_open_of` are `SECURITY DEFINER` and executable by `anon` and `authenticated` (needed because the guard trigger runs as invoker). Safe only while the `private` schema stays unexposed through the Data API (confirmed exposed schemas: `graphql_public`, `public`).
6. Minor UX deferred: the admin queue has no "Rejected" tab, the preview has no withdraw button, and onboarding labels lack `htmlFor`.
