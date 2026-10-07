# Council Review 14 — Synthesis: PR #62 Review-Gated Profile Content

- **Date:** 2026-10-07
- **Subject:** PR #62 (`feat/review-gated-profile-content`, ADR 0025, migration `20261007090000_review_gated_profile_content.sql`), reviewed through head `a5677ee`.
- **Scope statement:** This Council was scoped to a single vertical slice. Seats run: Agent 1 (data/API), Agents 2 and 3 (routes/pages, UX/shell), and Agent 7 (Stakeholder & Trust Lens). Agent 4 (feature/competitive) and Agent 5 (Wildcard) were deliberately omitted for this slice. Agent 6 (Documenter) wrote this record. Individual agent reports were not written as separate files; findings are consolidated below.
- **Result:** No real Critical findings. Merge awaits owner approval. Migration `20261007090000` is NOT applied to production (`20261006090000` is already applied).

## 1. Gates

- Story and brief approved by the owner on 2026-10-07. Owner decisions: unmatched taxonomy blocks approval; load real rows as the baseline; DB-backed slug pickers; operational fields self-service while slug and file paths are admin-only; first-is-primary is the default.
- `test-verifier`: AC1-16 all covered. It added child-table INSERT probes, a `scholars` INSERT probe and an anon public-read test. AC13 (onboarding) is now also covered by E2E via the paste path.
- `implementation-validator`: no Critical findings.
- `pr-review`: no security blockers. Important findings fixed: stale plan and PR body, deploy-order preflight, constraint errors mapped to FS002. Its Vercel point: the preview check always fails by design because there is no preview environment.

## 2. Per-seat summary

| Seat | Focus | Outcome |
|---|---|---|
| Agent 1 | Migration, guards, promotion, API | No Critical. Important findings (preflight enforcement, SQL scalar and year validation, constraint backstop, lossy aliases, deterministic order, integration-suite deadlock flake) fixed in `e86320f`. |
| Agents 2 and 3 | Routes, pages, UX | Reported 2 "Critical" items and a "diff not updated" item. The orchestrator verified on the PR branch that these were false positives (see section 3). Remaining Important findings (CV-import merge, explicit adherence, length caps, save-blocking reasons, row focus and announcements, admin hint and notes prefill) fixed in `a5677ee`. |
| Agent 7 | Stakeholder and trust | Art. 9 public-data notice added; explicit adherence choice; `strict_subscription` added. Retention and erasure remain in the GDPR slice. |

## 3. Process finding

Agents 2 and 3 ran concurrently with other agents in a single shared working tree. A concurrent checkout switch left them reading `main` instead of the PR branch, which produced the false "Critical" and "diff not updated" findings. The orchestrator re-verified each on the PR branch and found them absent. Recommendation: run parallel Council agents in isolated worktrees or against a pinned commit (`git show <sha>:path`), and have each report state the SHA it read.

## 4. Fixed

- `e86320f` (backend): enforced DO-block preflight; SQL scalar validation (caps, ORCID, Google Scholar CHECK pattern, years 1000-2100, whitespace) and constraint errors mapped to FS002; four lossy TS aliases removed after the theological-integrity review; deterministic ordering; integration test files run serially (cross-file deadlock flake).
- `a5677ee` (frontend): CV-import merge that never wipes or invents data, explicit confession adherence plus `strict_subscription`, Art. 9 notice, UI length caps, save-blocking reasons with counts, row-editor focus and announcements, preview and admin panel hints.

## 5. Feature summary (for reference)

- Allow-list guard on `scholars` (scholar may change only `contact_preference` and `draft_revision_id`); restricted INSERT leaves content NULL. Child-table guard blocks restricted INSERT/UPDATE/DELETE on `scholar_disciplines`, `scholar_traditions`, `scholar_confessions`, `credentials`, `publications`.
- Approval atomically promotes the five lists (validate-then-replace; absent unchanged, `[]` clears; first discipline and tradition primary). FS001 unmatched taxonomy; FS002 invalid snapshot.
- Live baseline drives editor and admin diff; canonical diff removes phantom diffs and detects a primary change. Lausanne Covenant added, Chicago slug fixed.

## 6. Accepted residual risk and follow-ups

1. Courses, media, speaker topics and availability remain self-service, unreviewed public free text.
2. Delete-and-insert changes row ids and `created_at`.
3. Non-primary disciplines and traditions are name-sorted, not draft-ordered.
4. GDPR retention, erasure and export (planned slice).
5. No component-level a11y tests (no DOM test library).
6. No admin E2E of approve-then-public-display (the integration anon read covers it); no E2E of legacy confession replacement.
7. Fonts depend on Google Fonts at build time; self-hosting is a follow-up.
8. Turnstile keys in Vercel production are unconfirmed.

## 7. Verification

- Proof of failure: the in-suite probes replace each guard or promotion inside a rolled-back transaction and assert the probe then succeeds. They run in CI on every push.
- CI on `a5677ee`: all green — lint, typecheck, unit tests including the serialized integration suite, test-surface, build and E2E. `e86320f` was green twice. The Vercel preview fails by design (no preview environment).
- `npm run audit:rls` was not reported to the Documenter for this run; not recorded as passed here.

## 8. Deploy runbook

Both migrations: `20261006090000` is ALREADY applied in production; `20261007090000` is not.

1. Merge, so the app deploys first.
2. Run the read-only preflight queries; the migration also self-checks (enforced `DO` block).
3. Apply migration `20261007090000` in the SQL Editor and record it in `supabase_migrations.schema_migrations`.
4. Verify: `review_profile_revision`, `promote_snapshot_lists` and `resolve_taxonomy_id` are executable by `service_role` only; 5 child guard triggers exist; a scholar PATCH of `biography` returns 42501; the Lausanne Covenant row exists.
5. Smoke test an approval.
