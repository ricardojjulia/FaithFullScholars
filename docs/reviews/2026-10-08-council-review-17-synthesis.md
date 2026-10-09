# Council Review 17 — Synthesis: PR #69 Posting Applications

- **Date:** 2026-10-08
- **Subject:** PR #69 (`feat/posting-applications`; ADR 0027; spec `docs/superpowers/specs/2026-10-08-posting-applications.md`), head `10aba83`.
- **Scope statement:** Scoped to a single vertical slice. Agents 1 (data/API), 2+3 (routes/pages and UX/shell, combined) and 7 (Stakeholder & Trust Lens), plus implementation validation, ran in one pass. Agents 4 (feature/competitive) and 5 (Wildcard) were omitted for a single slice. Agent 6 (Documenter) wrote this record. Individual agent reports were not written as separate files; findings are consolidated below.
- **Numbering:** 16 was the last synthesis on this branch. PRs #67 and #68 are on other branches and carry their own run reports; if either adds a synthesis, renumber at merge.
- **Result:** No Critical findings. Important findings were fixed in `ebaaa73` and `10aba83`. Merged as PR #69 (`b1a5d0b`) after the production migration (see section 6). Applied 2026-10-09: `20261010090000` by Release run 37966269473, `20261011090000` by run 37967194469, `20261012090000` by run 37968165098; all smoke tests passed. Applied through the Release workflow, not the SQL Editor as planned in section 6.

## 1. Gates

- Story approved 2026-10-08. Brief approved with defaults: forward-only transitions, no reapply, deadline not enforced, all members triage.
- The builder was interrupted by an account usage limit, then resumed. No work was lost.
- `pr-review` on `209a4da`: no Critical findings.

## 2. Slice summary

A separate `posting_applications` table with a SQL-sealed dossier, one insert path (`submit_posting_application`), a transition-table guard, private institution notes, an audit trail, contact released at the interview stage, a 20-per-day database cap, the scholar's My applications page, and the applicant matrix on real data. Replaces the broken `inquiries`-based flow of ADR 0020.

## 3. Important findings (all fixed)

Fixed in `ebaaa73`:
- **I1, the "Confessional Fit" score misstated beliefs.** The owner decided to show declared facts only. The score was removed and declared confessions are shown beside the posting's standard.
- **I2, disclosure and retention copy, plus an unaudited contact reveal.** The disclosure names the login email and the retention rule; contact reveals are audited through `event_kind`.
- **I3, dialog accessibility.** Focus management and a live region added.
- **Admin bypass.** Platform admins who were a party could bypass the guard; the guards now bind any `authenticated` or `anon` caller, admin included.
- **Deploy checks** lacked the new tables; added.
- Migration renamed to `20261012090000` so it sorts after #67 and #68; minor UX and i18n fixes.

Found by the `pr-review` re-check of `ebaaa73`:
- **`safeNextPath` control-character bypass**, which the new login `next` redirect would have relied on. Fixed separately in PR #70 (merged `fd73735`). `/auth/callback` was already origin-checked, so production was never exploitable.
- **Applicant could read reviewers' `actor_account_id`.** Fixed with a definer `get_application_events` that omits it and removal of the applicant's table SELECT.
- **Reveal events could be flooded.** Fixed by deduping per actor per application per 24 hours.
- **The rename was not upgrade-safe.** Fixed with `ADD COLUMN IF NOT EXISTS`.

The last three landed in `10aba83`, rebased onto `fd73735`.

## 4. Proof of failure

- Each `-- check:` line has a removal probe in a rolled-back transaction.
- Concurrency: 25 parallel submits yield exactly 20 accepted; 2 on the same posting yield exactly 1.
- Tests for the admin-party guard, the redacted-timeline columns and the reveal dedupe.

## 5. Accepted residual risk and follow-ups

1. Contact is the account login email; there is no separate contact address.
2. A posting cannot be deleted once applications exist.
3. The matrix is capped at 500 rows with no truncation notice.
4. The rate-limit constant lives in the migration.
5. The applicant-member edge case is handled.
6. Notifications are not built.
7. Next slice: the conference hub.

## 6. Verification and deploy

- CI on `10aba83`: all green (lint, typecheck, unit-tests with integration, the policy matrix, `audit:rls` and `audit:security`, test-surface, build, E2E), verified by the orchestrator on the head SHA. The Documenter did not re-run the suites.
- **Production deploy order:** `20261010090000` (#67), `20261011090000` (#68), `20261012090000` (this PR), applied via the SQL Editor; then merge. Until applied, express interest fails.
