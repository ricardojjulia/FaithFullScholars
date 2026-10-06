# Spec: Scholar Profile Revision Lifecycle (draft, submit, withdraw, review)

- **Status:** Story and technical brief approved by the owner on 2026-10-06 (feature-factory gates 3 and 5)
- **ADR:** 0024 (to be written before code). Extends ADR 0005, 0022, and 0023.
- **Branch:** `feat/scholar-revision-lifecycle`

## Problem

The scholar dashboard keeps profile drafts only in browser `sessionStorage`, so no scholar can ever reach admin review or be listed. Research also found these problems:

- A scholar can INSERT a revision already marked `approved`. The INSERT policy has no status check, and `processRevisionReview` approves any revision id.
- A scholar cannot submit. The UPDATE policy only allows `status='draft'` rows and has no WITH CHECK.
- Admin "reject" writes `rejected`, which the status CHECK forbids, so reject is broken.
- Approval never marks the prior published revision `superseded` and never clears `draft_revision_id`.
- The published revision's `admin_notes` are readable by anyone, including anonymous visitors.
- The editor's "published" baseline is a hard-coded demo scholar.

## Story

As a signed-in scholar, I save my profile draft and submit it for review, so that an admin can approve it and my profile is listed or updated, without anyone being able to bypass moderation.

### Acceptance criteria

#### A. Scholar flow (persisted)
1. Saving in the profile editor or the onboarding CV import creates or updates the scholar's **single open revision** (draft, submitted, or changes requested) in `scholar_profile_revisions`. New revisions start as `draft`.
2. The editor, onboarding, and preview load the signed-in scholar's real draft and real published profile. No demo data and no `sessionStorage` remain, so a reload or a different browser shows the same draft.
3. Submit moves `draft` to `submitted`. The database sets `submitted_at`. Success is reported only after the write commits, and errors are generic.
4. The scholar sees the revision's status: draft; submitted (read-only, with **Withdraw**); changes requested (with `admin_notes`); approved; or rejected (with the reason, plus an action to start a new draft).
5. After changes are requested, the scholar edits the same revision and resubmits it.
6. **Withdraw:** while a submitted revision is unreviewed, the scholar can pull it back to `draft`.
7. Submitting never changes `scholars.profile_status`. A new scholar stays `draft` until approved. An approved scholar stays listed with their current published profile while a revision is under review.

#### B. Database-enforced rules (not application code only)
8. A scholar's INSERT succeeds only for their own `scholar_id` with `status='draft'`, and never with `admin_notes`, `reviewed_at`, or `submitted_at` set. The database assigns `revision_number`.
9. The scholar's allowed transitions are:
   - draft → submitted
   - submitted → draft (withdraw, only while unreviewed)
   - changes_requested → draft
   - changes_requested → submitted

   Every other transition is refused.
10. `snapshot_data` is editable only while the revision is `draft` or `changes_requested`. A submitted revision cannot be edited.
11. A scholar can never set `approved`, `superseded`, `rejected`, or `changes_requested`, or change `admin_notes`, `reviewed_at`, `revision_number`, `scholar_id`, `created_at`, or `submitted_at`.
12. A scholar has at most one open revision (enforced by a partial unique index).
13. Revisions are readable only by the owning scholar and by admins. There is no scholar DELETE.
14. `scholars.draft_revision_id` can only point at the scholar's own open revision, or be NULL.
15. `rejected` becomes a valid status.

#### C. Admin
16. Approve, request-changes, and reject act only on `submitted` revisions, through one atomic database function that only `service_role` can execute. The audit row in `profile_reviews` is written in the same transaction.
17. **Approve:**
    - copies the scalar snapshot fields into `scholars`, but never `profile_tier` or `verification_status`;
    - sets `published_revision_id`;
    - sets `profile_status='approved'`, **unless the scholar is `hidden`, in which case they stay hidden**;
    - marks the prior published revision `superseded`;
    - clears `draft_revision_id`.
18. Reject is terminal for that revision and does not touch `profile_status` or the published profile. Request-changes keeps the revision editable by the scholar.

#### D. Tests and gates
19. Real-role database tests cover every forbidden path in B and every allowed path, with probe evidence that they fail when the guard is removed.
20. `scholar_profile_revisions` is added to the policy-matrix gate (`scholar` persona). `scholars.draft_revision_id` is declared there.
21. Admin function tests cover non-submitted refused, supersede and clear on approve, hidden preserved, reject, and EXECUTE denied to `anon` and `authenticated`.
22. Route unit tests carry `covers()` tags. The E2E flow is save → reload → submit → withdraw for the real-login scholar persona.

### Non-goals
- Promoting credentials, publications, disciplines, traditions, or confessions into their relational tables on approval. For first-time scholars, the editor diff shows these as "added".
- Notifications.
- The availability page.
- Rate limiting of saves.
- Multiple concurrent drafts.

## Owner decisions (2026-10-06)
1. Withdraw is allowed while a submitted revision is unreviewed.
2. Revisions are readable only by the owner and admins, which removes the public `admin_notes` exposure.
3. Approving a hidden scholar's revision keeps them hidden.
4. Resubmitting clears the previous `reviewed_at`, so withdraw still works. Prior `admin_notes` stay visible until the next decision, and the audit trail lives in `profile_reviews`.
5. Rejected is terminal for that revision. The scholar may start a new draft.

## Technical design (summary of the approved brief)

**Migration `20261006090000_scholar_revision_lifecycle.sql`** (idempotent, no data changes):
- Status CHECK gains `rejected`.
- `snapshot_data` must be a JSON object of 256 KB or less.
- Partial unique index `uq_scholar_one_open_revision`.
- `private.next_revision_number(scholar)` (DEFINER, advisory-locked max+1) and `private.revision_is_open_of(revision, scholar)` (DEFINER).
- `private.guard_scholar_profile_revisions()` (INVOKER, fail-closed via `private.is_restricted_caller()`, party flags COALESCEd):
  - enforces rules B8–B11;
  - assigns `revision_number`;
  - sets and clears `submitted_at`, clears `reviewed_at` on resubmit, and sets `updated_at`.
- Policies:
  - INSERT requires own `scholar_id` and `status='draft'`.
  - UPDATE uses USING and WITH CHECK (own and open), or admin.
  - SELECT is owner or admin only.
  - Any DELETE policy is dropped defensively.
- `private.guard_scholars` is extended for the `draft_revision_id` rule (B14).
- `public.review_profile_revision(revision, action, notes, reviewer)`:
  - SECURITY DEFINER;
  - EXECUTE revoked from PUBLIC, `anon`, and `authenticated`, granted to `service_role`;
  - locks the revision and the scholar row;
  - refuses non-submitted revisions (SQLSTATE `55000`) and missing ones (`P0002`);
  - performs approve, request-changes, or reject together with the audit insert atomically.

**API** (`app/api/scholars/revisions/`; session identity, RLS-scoped client, generic errors, 256 KB request cap checked before parsing):

| Method and path | Purpose |
|---|---|
| `GET /api/scholars/revisions` | Returns `{scholar, revision (open, or latest unpublished rejected), baseline}` |
| `PUT /api/scholars/revisions` | Saves a draft (create or update) |
| `POST /api/scholars/revisions/submit` | Submits the open revision |
| `POST /api/scholars/revisions/withdraw` | Withdraws an unreviewed submission |

- Shared logic lives in `lib/profiles/revision-service.ts` (`sanitizeSnapshot` allow-list that strips `profile_tier`, plus `loadRevisionState`).
- `draft_revision_id` is advisory. The open revision is always found by query.

**Admin:**
- `lib/admin/actions.ts` calls the RPC for approve, request-changes, and reject, keeps `hide`, and adds `code: 'not_found' | 'not_reviewable'`.
- The route maps those codes to 404 and 409.
- `ReviewActionPanel` shows the review actions only for `submitted`.
- `RevisionStatus` gains `'rejected'`.

**UI:**
- The profile, onboarding, and preview pages call the API.
- New `components/dashboard/revision-status-banner.tsx`.
- `ScholarProfileForm` gains a `readOnly` prop.

**Tests:**
- `tests/integration/scholar-revision-lifecycle.test.ts`
- Extended `admin-review.test.ts`
- Policy-matrix entries
- `tests/unit/scholar-revisions-api.test.ts`
- An E2E extension of `scholar-full-journey.spec.ts`
- Now-covered surfaces are removed from `tests/surface/exemptions.json`.

**Deploy:**
1. Run the preflight check for duplicate open revisions.
2. Apply the migration in the hosted SQL Editor.
3. Verify that `review_profile_revision` grants allow only `service_role`, and that Splinter lints 0028 and 0029 are clean.
4. Deploy the app after the migration.
