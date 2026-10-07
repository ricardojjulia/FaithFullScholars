# ADR 0026: Persistent, Enforced Rate Limits

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Core Engineering (owner-approved story and brief, 2026-10-08)
- **Builds on:** ADR 0008, ADR 0022, ADR 0023, ADR 0025
- **Amends:** ADR 0008
- **Spec:** `docs/superpowers/specs/2026-10-08-persistent-rate-limits.md`

---

## Context

Research on `main` (2026-10-07) found that ADR 0008's limits were not enforced anywhere:

- **The search limiter was never called.** Only tests called `checkSearchRateLimit`.
- **The RPC grant was too broad.** `check_search_rate_limit` was executable by `authenticated`. Any signed-in user could call it with an arbitrary fingerprint and limit to use up another client's allowance or flood the table, which also had no cleanup.
- **The inquiry cap was bypassable.** The 10-per-hour cap lived in a module-level `Map`. It reset on every cold start, was not shared across instances, and direct PostgREST inserts skipped it.
- **Failure was silent.** Database errors made the search limiter fail open with a `console.warn`.

## Decision

1. **One primitive.** `public.check_rate_limit(p_key, p_window_seconds, p_max)` (migration `20261008090000_persistent_rate_limits.sql`) is SECURITY DEFINER with `search_path = ''` and `EXECUTE` for `service_role` only.
   - Fixed window, `window_start = to_timestamp(floor(epoch / window) * window)`.
   - Counting is one `INSERT ... ON CONFLICT (key, window_start) DO UPDATE SET hits = hits + 1 RETURNING hits`, which is atomic, so concurrent callers are counted exactly.
   - Inputs are validated (key 1 to 200 characters, window 1 to 86400 seconds, max 1 to 10000; SQLSTATE `22023`).
   - Cleanup is bounded and needs no scheduler: each call deletes at most 100 buckets older than one day.
   - Returns `(allowed, remaining, reset_at)`.
2. **Table `public.rate_limit_buckets`** has FORCE RLS, no grants for API roles, and one explicit deny-all policy for `anon` and `authenticated`. The policy is not needed for safety (no grants, no permissive policy), but `npm run audit:rls` requires every table to carry a policy, and the explicit policy documents the intent. The audit itself is unchanged.
3. **Keys are server-derived.** `search:ip:<sha256(salt + ip)[0:16]>` or `search:user:<account>`. The IP comes from the first `x-forwarded-for` hop (Vercel), then `x-real-ip`. The optional `RATE_LIMIT_SALT` env var salts the hash. Raw IPs are never stored or logged. A client never supplies a key or a limit.
4. **Search is enforced.** `/scholars` (any request with search, filter or page parameters) and `GET /api/postings` apply 15 per minute (anonymous) and 120 per minute (signed in). The page renders a friendly "Too many searches. Try again in N seconds." state because a page cannot set a status code; the API returns 429 with `Retry-After` and `X-RateLimit-*` headers.
5. **Reads fail open, writes fail closed.** If the limiter errors, search stays available and the SQLSTATE (only) is logged. `checkLimit(..., { failOpen: false })` is available for callers that need to fail closed. The inquiry cap needs no app-level check at all (next point).
6. **Inquiry cap in the database.** `private.guard_inquiry_rate()` is a BEFORE INSERT trigger on `inquiries` for restricted callers (`private.is_restricted_caller()`, so admins and the service role are exempt).
   - It takes `pg_advisory_xact_lock` per institution so concurrent inserts serialise, counts `inquiries` rows from the last hour through a VOLATILE SECURITY DEFINER helper (a fresh snapshot after the lock, and not narrowed by the caller's RLS), and raises `Unauthorized: inquiry rate limit reached` with SQLSTATE `FS429` at 10 or more.
   - No counter table: the inquiries are the count, so direct PostgREST writes are covered. If the check cannot run the insert transaction fails, which is fail closed by construction.
   - The trigger is named `trg_guard_inquiry_rate`. Same-event triggers fire alphabetically and `trg_guard_inquiries` sorts first (`i` before `y`), so existing guard messages are unchanged and the cap only runs on otherwise-valid inserts.
   - `sendInquiry` drops the in-memory `Map` (deleted with `lib/inquiries/rate-limiter.ts`), maps `FS429` to a friendly message and status 429, and `POST /api/inquiries` returns that status.
7. **Legacy limiter.** `check_search_rate_limit` is revoked from `PUBLIC`, `anon` and `authenticated` and granted to `service_role` only. It and `search_rate_limits` are no longer used; dropping them is a follow-up.
8. **ESLint allow-list.** `lib/rate-limit/limiter.ts` replaces `lib/search/rate-limiter.ts` in the service-role allow-list; the search module now goes through the limiter.

## Consequences

### Positive
- Limits survive restarts, are shared across instances and cannot be bypassed by calling the database directly.
- The over-broad grant is closed, and the bucket table cannot grow without bound.
- One primitive for future limits (applications, per the roadmap).

### Negative / Trade-offs
- Search requests now cost one extra database round trip. Postgres is adequate at pilot scale; Upstash or KV is a non-goal until measured need.
- Fixed windows allow a burst of up to twice the limit across a window boundary. Accepted for abuse gating.
- Clients sharing an IP (NAT, campus) share the anonymous allowance.
- Behind a proxy that does not set `x-forwarded-for`, all anonymous visitors share the `unknown` bucket. Vercel sets it.

### Residual risks and follow-ups
- Drop `search_rate_limits` and `check_search_rate_limit` in a later migration.
- `x-forwarded-for` is only trustworthy behind Vercel; a self-hosted deployment must overwrite it at the edge.
- The inquiry cap is per institution, not per sender.

## Deploy

Apply the migration first, because the new app needs the RPC. Until it exists, search fails open and inquiries keep working (the trigger is simply absent). Then merge and deploy. Verify that `check_rate_limit` and `check_search_rate_limit` are executable by `service_role` only, that `trg_guard_inquiry_rate` exists on `inquiries`, then smoke-test search.

## Verification

Real-role integration suite `tests/integration/persistent-rate-limits.test.ts`, with in-suite proof-of-failure probes (grant restored, trigger dropped, inside rolled-back transactions); unit tests for client keys, the limiter, the postings route, the `/scholars` limited state and the inquiry action mapping. `audit:rls` and the policy matrix stay green.
