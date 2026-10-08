# Run Report — 2026-10-08: Posting Applications (PR #69)

## 1. Run Metadata
- **Branch:** `feat/posting-applications`
- **Head reviewed:** `10aba83` (after `209a4da`, `ebaaa73`; rebased onto `fd73735`)
- **Execution status:** VERIFIED (CI green on `10aba83`), AWAITING OWNER APPROVAL, PRODUCTION MIGRATION AND MERGE. The builder was interrupted by an account usage limit and resumed with no work lost.

## 2. Intent
Make express interest work, replace guessed applicants with real applications, and give institutions a sealed record of what the scholar applied with, without exposing contact details early.

## 3. Architecture, Security & RLS Impact
- **ADR 0027** (partially supersedes ADR 0020); spec `docs/superpowers/specs/2026-10-08-posting-applications.md`.
- One additive migration, `20261012090000_posting_applications.sql`: `posting_applications`, `posting_application_notes`, `posting_application_events` (FORCE RLS; no INSERT or DELETE grant on applications). The only insert path is `submit_posting_application` (definer, `search_path = ''`). A transition-table guard binds every `authenticated` or `anon` caller, admin included. Contact release is audited; the applicant reads a redacted timeline via `get_application_events` (no reviewer ids).
- `lib/postings/applicant-service.ts` leaves the service-role allow-list. New routes: withdraw, status, notes, contact. New page `/dashboard/applications`.

## 4. Council and Review Gates
- Synthesis: `docs/reviews/2026-10-08-council-review-17-synthesis.md`. Agents 1, 2+3 and 7 plus implementation validation in one pass; Agents 4 and 5 omitted for a single slice. No Critical findings.
- `pr-review` on `209a4da`: no Critical. Re-check of `ebaaa73` found the `safeNextPath` bypass (fixed in PR #70, `fd73735`), applicant visibility of reviewer ids, reveal-event flooding and a non-upgrade-safe rename; the last three fixed in `10aba83`.
- PRs #67 and #68 carry their own run reports.

## 5. Verification Results
| Check | Status | Details |
|---|---|---|
| CI on `10aba83` | PASS (per orchestrator) | lint, typecheck, unit-tests with integration, policy matrix, `audit:rls`, `audit:security`, test-surface, build, E2E |
| Failure proofs | PASS (in CI suite) | a removal probe per `-- check:` line; 25 parallel submits give 20 accepted; 2 on one posting give 1; admin-party, redacted-column and dedupe tests |

The Documenter did not re-run the suites.

## 6. Documenter Updates
`CHANGELOG.md` (checked: one heading per type; deploy line added), `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md` and `docs/product/roadmap.md` (next slice corrected to the conference hub), the spec status, ADR 0027 status, Council 17 synthesis, this report. `README.md` already described the slice accurately; no change.

## 7. Residual Risk
Contact is the login email; posting deletion blocked once applications exist; matrix capped at 500 rows with no truncation notice; rate-limit constant lives in the migration; notifications not built.

## 8. Follow-up
1. Apply migrations `20261010090000`, `20261011090000`, `20261012090000` in order via the SQL Editor, then merge, then smoke-test one application end to end.
2. Truncation notice for the 500-row matrix.
3. Email notifications.
4. Next slice: the conference hub.
