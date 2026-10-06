# Run Report — 2026-10-06: Scholar Revision Lifecycle (ADR 0024, PR #56)

## 1. Run Metadata
- **Branch:** `feat/scholar-revision-lifecycle`
- **Head reviewed:** `c5ce497` (builds on `a498c56`, `0c3d04f`, `4cc2e71`, `24d2428`)
- **Execution status:** VERIFIED, AWAITING OWNER APPROVAL (CI green on c5ce497; merge and production migration not yet approved)

## 2. Intent
Close Council Review 12 finding A-3: scholar drafts lived only in `sessionStorage`, so no scholar could reach admin review. Also fix revision-table authorization defects (scholar could insert an `approved` revision, reject failed against the status CHECK, approval was non-atomic, `admin_notes` publicly readable).

## 3. Architecture, Security & RLS Impact
- **ADR:** `docs/adr/0024-scholar-revision-lifecycle-and-atomic-review.md`; spec `docs/superpowers/specs/2026-10-06-scholar-revision-lifecycle.md`.
- **Migration:** `20261006090000_scholar_revision_lifecycle.sql` (preflight, status CHECK, one-open-revision unique index, guard trigger, owner/admin-only SELECT, service-role-only `review_profile_revision()` RPC).
- **API:** `/api/scholars/revisions`, `/submit`, `/withdraw`; `POST /api/admin/reviews/[id]` via the RPC.
- **Frontend:** editor, onboarding, preview use persisted revisions; status banner; admin panel.
- **Policy matrix:** `scholar_profile_revisions` scenario added.

## 4. Council and Review Gates
- Synthesis: `docs/reviews/2026-10-06-council-review-13-synthesis.md` (scoped Council: Agents 1, 2, 3, 7; Agents 4 and 5 omitted for a single vertical slice). No Critical findings. Fixes in `c5ce497`.

## 5. Verification Results
| Check | Command | Status | Details |
|---|---|---|---|
| Lint | `npm run lint` | PASS | clean (local, on `c5ce497`) |
| Typecheck | typecheck script | PASS | clean (local) |
| Test surface | `npm run test:surface` | PASS | 0 problems |
| Unit | `npm run test` (unit) | PASS | 250/250, 39 files |
| Integration and E2E | CI | PASS | CI on c5ce497: all checks pass — lint, typecheck, test-surface, unit + real-role DB integration, build, E2E (Playwright, real logins) |
| Guard probe | probe branch (deleted) | evidence | without the guard trigger, 10 DB integration tests failed |
| E2E (prior head) | CI | evidence | 55/55 |

`npm run audit:rls` and `npm run build` were not reported to the Documenter for this run; not recorded as passed.

## 6. Documenter Updates
`docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`, `docs/product/roadmap.md`, `docs/product/MVP_AND_COMPETITIVE_STATUS.md`, `CHANGELOG.md`, `README.md`, ADR 0024 (amendments and residual-risk section), Council 13 synthesis, this report.

## 7. Residual Risk
See ADR 0024 "Residual risk and follow-ups". Headline: scholars can still edit live profile content directly under RLS (HIGH, pre-existing); approval promotes scalar fields only; Art. 9 retention of rejected and superseded snapshots; SECURITY DEFINER helpers depend on `private` staying unexposed. Owner-visible decision: feedback notes required for request_changes and reject.

## 8. Follow-up
1. Next slice: lock live content columns and child tables to the review path, with relational promotion on approval.
2. GDPR slice: retention, erasure, export for snapshots.
3. Deferred minor UX (Rejected admin tab, preview withdraw, onboarding `htmlFor`).
4. Deploy runbook in CHANGELOG and synthesis; production migration pending owner approval.
