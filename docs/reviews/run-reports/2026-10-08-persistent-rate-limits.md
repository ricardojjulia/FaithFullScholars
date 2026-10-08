# Run Report — 2026-10-08: Persistent, Enforced Rate Limits (ADR 0026, PR #65)

## 1. Run Metadata
- **Branch:** `fix/persistent-rate-limits`
- **Head reviewed:** `affc243` (builds on `9135620`, `d097c8f`, `1161fac`)
- **Execution status:** VERIFIED (CI green on `affc243`), AWAITING OWNER APPROVAL AND DEPLOY. Migration `20261008090000` is not applied to production.

## 2. Intent
Make the search rate limits of ADR 0008 real (the old limiter was never called and the inquiry limiter was in memory), and make the inquiry cap database-enforced so direct PostgREST inserts, restarts and multiple instances cannot bypass it.

## 3. Architecture, Security & RLS Impact
- **ADR:** `docs/adr/0026-persistent-enforced-rate-limits.md` (amends ADR 0008); spec `docs/superpowers/specs/2026-10-08-persistent-rate-limits.md`.
- **Migration:** `20261008090000_persistent_rate_limits.sql`: `check_rate_limit` (service role only, fixed window, atomic upsert, bounded SKIP LOCKED cleanup), `rate_limit_buckets` (FORCE RLS, deny-all), `trg_guard_inquiry_rate` (FS429, advisory lock per institution), `private.recent_inquiry_count`, server-controlled `inquiries.created_at`, `check_search_rate_limit` revoked.
- **App:** `/scholars` limited state ("Search paused", `role=alert`, noindex); `/api/postings` 429 with Retry-After; HMAC-SHA256 IP keys using `RATE_LIMIT_SALT` (`verify:deploy` fails production without it); IP from `x-vercel-forwarded-for` then first `x-forwarded-for`; 1.5 s limiter timeout, reads fail open; in-memory inquiry limiter deleted.
- **Same-day production state change (ADR 0025):** migration `20261007090000` was applied to production by the owner on 2026-10-07 and verified; docs updated accordingly (see section 6).

## 4. Council and Review Gates
- Synthesis: `docs/reviews/2026-10-08-council-review-15-synthesis.md`. Scoped Council: Agents 1 and 7; Agents 2 and 3 folded into pr-review; Agents 4 and 5 omitted for a single slice.
- One Critical (`created_at` back-dating) found and fixed. Important findings fixed.
- implementation-validator: no Critical. pr-review: no Critical.
- **Process finding:** a fix builder reported CI green by citing the previous commit's runs. Real CI on `d097c8f` failed one stale-copy test; fixed in `9135620`. Agents must report CI for the head SHA.

## 5. Verification Results
| Check | Command | Status | Details |
|---|---|---|---|
| CI on `affc243` | GitHub Actions | PASS | CI on `affc243` (code head; later commits are docs-only): all green on both runs (push and pull_request): lint, typecheck, unit-tests (unit + serialized DB integration incl. persistent-rate-limits, `audit:rls` and the policy matrix), test-surface, build and E2E. The Vercel preview fails by design. `8858a0b` had one red push run: a pre-existing minute-boundary flake in `tests/integration/triage.test.ts`, fixed in `affc243`. |
| CI on `d097c8f` | GitHub Actions | FAIL | one test asserted the old inquiry-limit copy; fixed in `9135620` |
| Proof of failure | in-suite probes | PASS (per orchestrator; runs in CI) | grant to `authenticated` lets calls succeed; dropping the trigger lets the 11th insert succeed; removing the `created_at` protection lets back-dating evade the cap |
| Concurrency | integration suite | PASS (per orchestrator) | 20 parallel limiter hits, 14 parallel inquiry inserts |
| Vercel preview | Vercel | FAIL (by design) | no preview environment |

The Documenter did not re-run the suites; the results above are as reported by the orchestrator.

## 6. Documenter Updates
`README.md`, `CHANGELOG.md` (merged the duplicate `### Fixed` heading under `[Unreleased]`; one heading per type), `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`, `docs/product/roadmap.md`, `docs/product/MVP_AND_COMPETITIVE_STATUS.md`, the two specs' status lines, ADR 0024 (residual risks 1 and 2 resolved in production), ADR 0025 (live), ADR 0026 (status), Council 14 synthesis and run report (deploy outcome), Council 15 synthesis, this report.

## 7. Residual Risk
Cap is per institution, not per sender; signed-in accounts get 120/min each and minted accounts multiply it (signup is CAPTCHA-gated only if Turnstile keys are set, unconfirmed); no IPv6 /64 aggregation; the CDN-in-front caveat for the trusted IP header; fixed-window boundary bursts; the legacy `search_rate_limits` table still exists. Until the migration is applied, search is not limited and the inquiry cap is not database-enforced.

## 8. Follow-up
1. Deploy runbook (migration first, then merge): set `RATE_LIMIT_SALT` in Vercel Production; preflight; apply `20261008090000` and record it; verify grants (`service_role` only), `trg_guard_inquiry_rate`, FORCE RLS on `rate_limit_buckets`; merge PR #65; smoke test `/scholars` and a search.
2. Follow-up migration: drop `search_rate_limits` and `check_search_rate_limit`.
3. Confirm Turnstile production keys.
4. Not recorded as verified for ADR 0025: scholar PATCH `biography` returning 42501 and a smoke-tested approval in production.
5. Next slices (owner order): real portal data, applications, conference hub.
