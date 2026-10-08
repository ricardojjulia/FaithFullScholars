# Council Review 16 — Synthesis: PR #66 Real Data on Portal Screens

- **Date:** 2026-10-08
- **Subject:** PR #66 (`fix/real-portal-data`; spec `docs/superpowers/specs/2026-10-08-real-portal-data.md`), head `fbdcd73`.
- **Scope statement:** Scoped to a single vertical slice. Agents 1 (data/API), 2+3 (routes/pages and UX/shell, combined) and 7 (Stakeholder & Trust Lens) ran in one pass. Agents 4 (feature/competitive) and 5 (Wildcard) were omitted for a single slice. Agent 6 (Documenter) wrote this record. Individual agent reports were not written as separate files; findings are consolidated below.
- **Result:** No Critical findings. Important findings were fixed in `fbdcd73`. Merge awaits owner approval. No database, RLS or migration change, so there is no deploy step beyond the merge.
- **Re-review of fbdcd73:** <pending>

## 1. Gates

- Story and brief approved by the owner on 2026-10-08. Decisions: Q1 include the Outreach Log; Q2 leave the institution layout unchanged; Q5 awaiting = pending plus read.
- `implementation-validator`: no Critical. Important items (profile fixture and nav chip, rollback test, read-inquiry inconsistency) fixed.
- `pr-review`: no Critical. The Vercel preview fails by design (no preview environment).

## 2. Slice summary

- Real data on `/institution`, `/institution/saved` (explicit idempotent DELETE, fixing the toggle-add bug), `/institution/inquiries` (Outreach Log), `/institution/profile` (new session-scoped, allow-listed `PATCH /api/institution/profile`; trust columns cannot be written), `/dashboard` and `/dashboard/inquiries`.
- The nav "Verified" badge uses the real institution status. Analytics is bannered and its cards labelled "Sample". The conference hub is a staff-only preview with honest wording; unused demo exports, the badge component and the public-profile appearances were deleted.

## 3. Important findings (all fixed in `fbdcd73`)

- **Fake states on lookup failure:** a session lookup failure showed "no profile", an empty inbox or a 404. It now shows an outage panel or returns 503, and fails closed.
- **Logs:** only the error code or name is recorded.
- **Awaiting consistency:** pending plus read everywhere, through shared tabs and labels.
- **Analytics card:** no longer reads as active.
- **Conference modal false claims** and **false "Verified" claims:** removed; the fabricated "Unknown Seminary approved" fallback is gone.
- **Data minimisation:** contact email is stripped until the inquiry is accepted.
- **Accessibility:** tabs with full keyboard support, a focus-trapped dialog, a live region for removals.
- **Tests:** inbox rollback extracted as pure functions with unit tests, plus an E2E that intercepts the PATCH. Exact head counts are used for the trend.

## 4. Accepted residual risk and follow-ups

1. `/dashboard/courses` still uses `INITIAL_COURSES` fixtures (known defect, not in this slice).
2. Any institution member, including a recruiter, can edit the profile (existing RLS).
3. `lookupFailed` is a single flag, so it fails closed broadly.
4. The E2E removal scholar is approved and visible in the directory.
5. Multiple memberships use the earliest one.
6. Next slice (owner-approved order): the applications rebuild.

## 5. Verification

- CI on `fbdcd73`: all green (lint, typecheck, unit-tests including integration, test-surface, build, E2E), verified by the orchestrator on the head SHA. The Vercel preview fails by design.
- The Documenter did not re-run the suites.
