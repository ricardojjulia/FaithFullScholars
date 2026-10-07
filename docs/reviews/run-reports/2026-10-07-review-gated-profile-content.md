# Run Report — 2026-10-07: Review-Gated Profile Content (ADR 0025, PR #62)

## 1. Run Metadata
- **Branch:** `feat/review-gated-profile-content`
- **Head reviewed:** `a5677ee` (builds on `e86320f`, `2a7fe47`)
- **Execution status:** VERIFIED, AWAITING OWNER APPROVAL (CI green on `a5677ee`; merge and production migration `20261007090000` not yet approved or applied)

## 2. Intent
Close ADR 0024 residual risks 1 (scholars can edit live profile content and relational lists directly, bypassing review) and 2 (approval publishes scalar fields only), without data loss on first approval.

## 3. Architecture, Security & RLS Impact
- **ADR:** `docs/adr/0025-review-gated-profile-content.md`; spec `docs/superpowers/specs/2026-10-07-review-gated-profile-content.md`.
- **Migration:** `20261007090000_review_gated_profile_content.sql` (enforced preflight, `scholars` allow-list guard, child-table guards on five tables, `promote_snapshot_lists`, `resolve_taxonomy_id`, SQL scalar validation, Lausanne Covenant row).
- **Behaviour:** validate-then-replace promotion; FS001 unmatched taxonomy, FS002 invalid snapshot; first discipline and tradition primary.
- **Frontend and lib:** live baseline loader, canonical diff, DB-backed slug pickers, credentials and publications editors, tradition picker, CV-import merge, explicit adherence, Art. 9 notice, admin panel hints.
- **Policy matrix:** gated `scholars` columns and five child tables.

## 4. Council and Review Gates
- Synthesis: `docs/reviews/2026-10-07-council-review-14-synthesis.md`. Scoped Council: Agents 1, 2, 3, 7; Agents 4 and 5 deliberately omitted for a single vertical slice. No real Critical findings; two reported "Critical" items were false positives from concurrent agents sharing one working tree (process finding).
- test-verifier: AC1-16 covered. implementation-validator: no Critical. pr-review: no security blockers; Important findings fixed.

## 5. Verification Results
| Check | Command | Status | Details |
|---|---|---|---|
| CI on `a5677ee` | GitHub Actions | PASS | lint, typecheck, unit tests including serialized integration suite, test-surface, build, E2E |
| CI on `e86320f` | GitHub Actions | PASS | green twice |
| Proof of failure | in-suite probes | PASS | each guard or promotion replaced inside a rolled-back transaction; probe then succeeds; runs in CI every push |
| Vercel preview | Vercel | FAIL (by design) | no preview environment; not a required check |

Local command output and `npm run audit:rls` were not reported to the Documenter for this run; not recorded as passed.

## 6. Documenter Updates
`docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`, `docs/product/roadmap.md`, `docs/product/MVP_AND_COMPETITIVE_STATUS.md`, `README.md`, the spec status line, ADR 0025 (residual risk), ADR 0024 cross-check (items 1 and 2 already marked RESOLVED by ADR 0025), CHANGELOG (entry already present; see flag below), Council 14 synthesis, this report.

## 7. Residual Risk
Courses, media, speaker topics and availability remain unreviewed self-service; delete-and-insert changes row ids and `created_at`; non-primary order is name-sorted; GDPR retention/erasure/export open; no component a11y tests; no admin E2E approve-then-public and no legacy confession replacement E2E; Google Fonts at build time; Turnstile keys in Vercel production unconfirmed. Until the migration is applied in production, the direct-edit bypass remains open there.

## 8. Follow-up
1. Deploy runbook (Council 14 section 8): merge, preflight, apply `20261007090000`, record in `schema_migrations`, verify grants, 5 guard triggers, scholar PATCH biography 42501, Lausanne row, smoke-test an approval.
2. GDPR slice: retention, erasure, export.
3. Self-host fonts; confirm Turnstile production keys.
4. Run parallel Council agents in isolated worktrees or pinned SHAs.
5. Flag (unrelated drift, not fixed): `CHANGELOG.md` `[Unreleased]` repeats `### Added`, `### Security`, `### Fixed`, `### Changed` headings in several places (pre-existing, spans many runs); needs a consolidation pass by the owner.
