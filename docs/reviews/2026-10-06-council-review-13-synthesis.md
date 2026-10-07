# Council Review 13 — Synthesis: PR #56 Scholar Revision Lifecycle

- **Date:** 2026-10-06
- **Subject:** PR #56 (`feat/scholar-revision-lifecycle`, ADR 0024), reviewed after the `pr-review` gate fixes (`c5ce497`).
- **Scope statement:** This Council was scoped to a single vertical slice. Seats run: Agent 1 (data/API), Agents 2 and 3 (routes/pages, UX/shell), and Agent 7 (Stakeholder & Trust Lens). Agent 4 (feature/competitive) and Agent 5 (Wildcard) were deliberately omitted for this slice. Agent 6 (Documenter) wrote this record. Individual agent reports were not written as separate files; findings are consolidated below.
- **Result:** No Critical findings from any seat. Merge awaits owner approval. Migration `20261006090000` is NOT applied to production.

## 1. Per-seat summary

| Seat | Focus | Outcome |
|---|---|---|
| Agent 1 | Migration, guard trigger, RPC, API | Missing migration preflight; lock-order deadlock hypothesis; admin action fall-through and swallowed audit failure; size CHECK surfaced as 500. All fixed. Pre-existing live-row bypass reported as HIGH, accepted as next slice. |
| Agents 2 and 3 | Routes, pages, UX | Stale-tab submit and withdraw ignored the revision pin; 409 remount discarded edits; hidden-scholar state; onboarding lock on 409; admin panel unlocked after decision; label and aria gaps. Fixed. Three minor UX items deferred. |
| Agent 7 | Stakeholder and trust | Reviewer feedback could be empty; Art. 9 retention of rejected and superseded snapshots; admins can read all snapshots; approval publishing scope unclear to scholars. Notes made required, preview states published sections; retention deferred. |
| pr-review | Gate | No Critical. Important findings fixed in `c5ce497`. |

## 2. Fixed in `c5ce497`

- Migration preflight (duplicate open revisions; snapshot not a JSON object or over 256 KB), aborting with a clear message.
- Review function locks the scholar row first, avoiding deadlock with scholar `draft_revision_id` updates.
- `lib/admin/actions.ts`: unknown action returns `invalid_action`; hide audit failure returns `audit_failed` (route 500).
- Admin route: malformed JSON 400; notes required for request_changes and reject; notes capped at 2000 characters.
- Submit and withdraw honour the `revisionId` pin (409); DB size CHECK (23514) maps to 413.
- UX fixes listed in the CHANGELOG entry.
- New tests: `tests/unit/admin-review-route.test.ts`, `tests/unit/admin-review-actions.test.ts`; pin and 23514 cases in `scholar-revisions-api`; test-surface exemption for `POST /api/admin/reviews/[id]` removed.

## 3. Owner-visible decision

Feedback notes are now REQUIRED for request_changes and reject. The spec was silent. This is a reversible default; flagged for owner confirmation.

## 4. Accepted residual risk and follow-ups

1. **HIGH, pre-existing:** scholars can UPDATE live `scholars` content columns and child tables (disciplines, confessions, traditions, credentials, publications) directly under RLS, bypassing review. Next slice: lock content columns to the review path.
2. Approval publishes scalar fields only; relational sections are not promoted, so public pages and match-faculty do not reflect them. Pair with item 1.
3. Retention and erasure (GDPR Art. 9) of rejected and superseded snapshots; admin read access to all snapshots. Belongs to the GDPR slice.
4. Approve sets `profile_status='approved'` for any non-hidden scholar, including previously rejected ones. Deliberate.
5. `private.next_revision_number` and `private.revision_is_open_of` are SECURITY DEFINER and callable by anon and authenticated; safe only while `private` is not an exposed schema (confirmed: `graphql_public`, `public`).
6. Minor UX deferred: no "Rejected" admin tab, no withdraw in preview, onboarding labels lack `htmlFor`.

## 5. Verification

- Local on `c5ce497` (as reported by the orchestrator): lint clean, typecheck clean, `test:surface` 0 problems, unit 250/250 (39 files).
- Earlier evidence: removing the guard trigger made 10 DB integration tests fail (probe branch, deleted); E2E 55/55 on the prior head.
- CI on c5ce497: all checks pass — lint, typecheck, test-surface, unit + real-role DB integration, build, E2E (Playwright, real logins)

## 6. Deploy runbook

1. Preflight: `SELECT scholar_id, count(*) FROM scholar_profile_revisions WHERE status IN ('draft','submitted','changes_requested') GROUP BY 1 HAVING count(*) > 1;`
2. Apply migration `20261006090000` in the hosted SQL Editor (self-checks).
3. Verify `review_profile_revision` EXECUTE is granted only to `service_role`.
4. Deploy the app.
