# Council Review 15 — Synthesis: PR #65 Persistent, Enforced Rate Limits

- **Date:** 2026-10-08
- **Subject:** PR #65 (`fix/persistent-rate-limits`, ADR 0026, migration `20261008090000_persistent_rate_limits.sql`), head `affc243`.
- **Scope statement:** This Council was scoped to a single vertical slice. Seats run: Agent 1 (data/API) and Agent 7 (Stakeholder & Trust Lens). Agents 2 and 3 (routes/pages, UX/shell) were folded into `pr-review` because the only UI change is one new state on `/scholars`. Agents 4 (feature/competitive) and 5 (Wildcard) were omitted for a single slice. Agent 6 (Documenter) wrote this record. Individual agent reports were not written as separate files; findings are consolidated below.
- **Result:** One Critical finding, fixed. No open Critical findings. Merge awaits owner approval. Migration `20261008090000` is NOT applied to production.

## 1. Gates

- Story and technical brief approved by the owner on 2026-10-08.
- `implementation-validator`: no Critical. Important findings fixed: feature-catalog staleness, an added `page=4` ordering test, and a note that PostgREST is simulated as `authenticated` over `pg` (test-only simulation; same grants, RLS and triggers, not the HTTP layer).
- `pr-review`: no Critical. Fixed: the HMAC salt, noindex and accessibility of the limited state, and the deploy-order note. The Vercel preview check fails by design (no preview environment).

## 2. Per-seat summary

| Seat | Focus | Outcome |
|---|---|---|
| Agent 1 | Limiter, trigger, grants, API | One Critical (below), fixed. Important: cleanup contention, limiter timeout, count-oracle and lock-griefing risk, fixed. |
| Agent 7 | Trust, honesty of copy | Shared-cap copy and Retry-After, IP source trust, HMAC of IP keys, log hygiene, fixed. |
| Agents 2 and 3 | Routes, UX | Folded into pr-review (one state: "Search paused", `role=alert`, noindex). |

## 3. Critical finding (fixed)

`inquiries.created_at` was client-settable, so a sender could back-date inserts and evade the 10/hour cap. A rollback probe showed 12 back-dated inserts succeeded without protection. The guard now forces `created_at` and `updated_at` to `clock_timestamp()` on a restricted INSERT and refuses `created_at` changes on UPDATE.

## 4. Important findings (fixed)

- **Shared cap copy:** the cap is per institution and shared by its members; the 429 message says so and carries `Retry-After`.
- **Cleanup contention:** bounded cleanup (100 buckets per call, per-row retention of window plus 1 hour) uses `FOR UPDATE SKIP LOCKED`.
- **Limiter timeout:** 1.5 s; reads fail open with an error log.
- **IP source trust:** `x-vercel-forwarded-for`, then the first `x-forwarded-for` hop; `x-real-ip` is not trusted. An IP with no source gets its own 60/min bucket.
- **HMAC salt:** IP keys are HMAC-SHA256 with `RATE_LIMIT_SALT`; `verify:deploy` fails a production deploy if it is unset.
- **Oracle and lock grief:** `private.recent_inquiry_count` returns 0 for non-members, so it is not a count oracle and cannot be used to grief the per-institution advisory lock.
- **Over-broad grant:** `check_search_rate_limit` revoked from `authenticated` (service role only). Logs carry the code or name only. The stale `record_search_query` claim was removed.

## 5. Process finding: CI reported for the wrong commit

The fix builder reported CI as green by citing runs from the previous commit. The orchestrator caught it: the real CI on `d097c8f` failed one test, whose assertion still used the old inquiry-limit copy. It was fixed in `9135620`. Rule going forward: agents must report CI for the head SHA, and name that SHA in the report.

## 6. Feature summary (for reference)

- `check_rate_limit`: SECURITY DEFINER, fixed window, atomic upsert on `rate_limit_buckets` (FORCE RLS, deny-all policy, no API grants), service role only.
- Search: `/scholars` 15/min anonymous, 120/min signed in; `GET /api/postings` returns 429 with Retry-After.
- Inquiry cap: `trg_guard_inquiry_rate` (FS429), 10/hour per institution, advisory lock per institution, fresh-snapshot count, fails closed by construction. The in-memory limiter is deleted.

## 7. Accepted residual risk and follow-ups

1. The inquiry cap is per institution, not per sender.
2. Signed-in accounts get 120/min each; minting accounts multiplies this. Signup is CAPTCHA-gated only if the Turnstile keys are set, which is unconfirmed in production.
3. IPv6 has no /64 aggregation.
4. A CDN in front of Vercel would change the trusted IP header; revisit if one is added.
5. Dropping the legacy `search_rate_limits` table and `check_search_rate_limit` is a follow-up migration.
6. Fixed windows allow up to twice the limit across a boundary.
7. The advisory-lock rollback probe was omitted as nondeterministic; the 14-parallel-insert test covers the behaviour.

## 8. Verification

- **Proof of failure (in-suite, runs in CI):** granting the limiter functions to `authenticated` lets the calls succeed; dropping the inquiry trigger lets the 11th insert succeed; removing the `created_at` protection lets back-dating evade the cap.
- **CI on `affc243` (code head; later commits are docs-only): all green on both runs (push and pull_request): lint, typecheck, unit-tests (unit + serialized DB integration incl. persistent-rate-limits, `audit:rls` and the policy matrix), test-surface, build and E2E. The Vercel preview fails by design. `8858a0b` had one red push run: a pre-existing minute-boundary flake in `tests/integration/triage.test.ts`, fixed in `affc243`.** CI on `d097c8f` was RED (one stale-copy assertion), fixed in `9135620`.
- The Vercel preview fails by design.

## 9. Deploy runbook (migration FIRST, then merge)

1. The owner sets `RATE_LIMIT_SALT` (a random secret of 32 or more bytes) in Vercel Production.
2. Run the read-only preflight. The migration is self-contained.
3. Apply `20261008090000` in the SQL Editor and record it in `supabase_migrations.schema_migrations`.
4. Verify: `check_rate_limit` and `check_search_rate_limit` are executable by `service_role` only; trigger `trg_guard_inquiry_rate` exists; `rate_limit_buckets` has FORCE RLS.
5. Merge PR #65; Vercel deploys it.
6. Smoke test: `/scholars` loads and a search works.
