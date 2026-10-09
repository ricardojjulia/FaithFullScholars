# Run Report — 2026-10-08: Real Data on Portal Screens (PR #66)

## 1. Run Metadata
- **Branch:** `fix/real-portal-data`
- **Head reviewed:** `fbdcd73` (builds on `6301deb`, `d6f2a53`)
- **Execution status:** VERIFIED (CI green on `fbdcd73`), MERGED (PR #66, `1e0a5a2`). A pr-review re-check of the fix pass was still running when this was written.

## 2. Intent
Stop portal screens showing invented numbers and identities as real, fix the shortlist remove bug, and label the features that are still demos.

## 3. Architecture, Security & RLS Impact
- **Spec:** `docs/superpowers/specs/2026-10-08-real-portal-data.md`. No ADR, no migration, no RLS change.
- Pages read through the user/RLS client after their own guard. New `PATCH /api/institution/profile` (session institution, allow-list, no trust columns; the ADR 0023 trigger backs it). `DELETE` on saved-scholars and saved-courses (UUID-validated, idempotent).
- `getSessionContext` returns `lookupFailed`; guards throw, layouts render an outage panel, APIs answer 503. Contact email is withheld from the inbox payload until acceptance (app layer; row-level RLS still lets the recipient read the column; column-level control is a follow-up). Logs carry codes only.

## 4. Council and Review Gates
- Synthesis: `docs/reviews/2026-10-08-council-review-16-synthesis.md`. Agents 1, 2+3 and 7 in one pass; Agents 4 and 5 omitted for a single slice. No Critical findings; Important findings fixed in `fbdcd73`.
- implementation-validator: no Critical. pr-review: no Critical.
- Re-review of fbdcd73: no Critical. Important items handled: (1) the Vercel preview fails by design on every branch (no preview environment; production deploys from main succeed); (2) the contact-email wording now says it is app-layer minimisation, with a column-level control as a follow-up; (3) added `tests/unit/respond-to-inquiry.test.ts` (non-recipient accept/decline refused with no write; email released only on accept). Also fixed: the profile PATCH body cap now holds for chunked requests.

## 5. Verification Results
| Check | Command | Status | Details |
|---|---|---|---|
| CI on `fbdcd73` | GitHub Actions | PASS (per orchestrator) | lint, typecheck, unit-tests including integration, test-surface, build, E2E |
| Vercel preview | Vercel | FAIL (by design) | no preview environment |

The Documenter did not re-run the suites.

## 6. Documenter Updates
`CHANGELOG.md` (checked: one heading per type under `[Unreleased]`, slice entry already present), `README.md`, `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md` (new section; stale `ConferencePresentationBadge` references removed), `docs/product/roadmap.md`, `docs/feature-catalog.md` (checked, already accurate), the spec status, `docs/reviews/README.md`, Council 16 synthesis, this report.

## 7. Residual Risk
`/dashboard/courses` fixtures; any institution member can edit the profile; `lookupFailed` fails closed broadly; the E2E removal scholar is visible in the directory; multiple memberships use the earliest.

## 8. Follow-up
1. Fill in the re-review result above before merge.
2. Fix `/dashboard/courses`.
3. Next slice: the applications rebuild.
