# ADR 0026: Persistent, Enforced Rate Limits

- **Status:** Accepted. Built in PR #65; migration `20261008090000` not yet applied to production (pending deploy).
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
   - Cleanup is bounded and needs no scheduler: each call deletes at most 100 buckets, each retired one hour after its own window ended (the row stores `window_seconds`, so a day-long bucket is never deleted early). The cleanup subselect uses `FOR UPDATE SKIP LOCKED`, so concurrent callers never block each other.
   - Returns `(allowed, remaining, reset_at)`.
2. **Table `public.rate_limit_buckets`** has FORCE RLS, no grants for API roles, and one explicit deny-all policy for `anon` and `authenticated`. The policy is not needed for safety (no grants, no permissive policy), but `npm run audit:rls` requires every table to carry a policy, and the explicit policy documents the intent. The audit itself is unchanged.
3. **Keys are server-derived.** `search:ip:<HMAC-SHA256(RATE_LIMIT_SALT, ip)[0:16]>` or `search:user:<account>`. A client never supplies a key or a limit; raw IPs are never stored or logged.
   - **Secret.** `RATE_LIMIT_SALT` is the HMAC key and is **required in production**: `npm run verify:deploy` fails a production deploy without it. If it is unset the app never hashes unsalted: it uses a per-process random secret (limits then hold per instance only) and logs one warning per process when `NODE_ENV=production`.
   - **IP source.** `x-vercel-forwarded-for` first, then the first `x-forwarded-for` hop. `x-real-ip` is deliberately ignored because a client can set it. **CDN caveat:** both headers are trustworthy only when the request really arrives through Vercel's edge (which overwrites them). Behind another CDN or proxy in front of Vercel, the edge would see the proxy's address (everyone shares one bucket) or a spoofable header; configure the proxy to forward the true client IP, or self-host with an edge that overwrites `x-forwarded-for`.
   - **No usable IP.** Requests without either header share the `unknown` bucket, which has its own more generous limit (60 per minute) and logs a warning, so one missing header cannot lock out everyone at the anonymous 15 per minute.
4. **Search is enforced.** `/scholars` (any request with search, filter or page parameters) and `GET /api/postings` apply 15 per minute (anonymous) and 120 per minute (signed in). The page renders a "Search paused ... please wait N seconds" state (`role="alert"`, h2, decorative icon) because a page cannot set a status code, and every `/scholars` response carrying search parameters is `noindex` (so a limited response is never indexed; metadata does not call the limiter). The API returns 429 with `Retry-After` and `X-RateLimit-*` headers.
5. **Reads fail open, writes fail closed.** `checkLimit` is for reads only and always fails open: on an error, an exception or a 1.5 s timeout the request is allowed and the cause (SQLSTATE or `timeout`) is logged. `/scholars` also fails open if the session lookup throws. The write path (the inquiry cap) has no app-level check at all: it is a database trigger, so if the check cannot run the insert transaction fails, which is fail closed by construction. (The earlier unused `failOpen: false` option was removed.)
6. **Inquiry cap in the database.** `private.guard_inquiry_rate()` is a BEFORE INSERT trigger on `inquiries` for restricted callers (`private.is_restricted_caller()`, so admins and the service role are exempt).
   - It takes `pg_advisory_xact_lock` per institution so concurrent inserts serialise, counts `inquiries` rows from the last hour through a VOLATILE SECURITY DEFINER helper (a fresh snapshot after the lock, and not narrowed by the caller's RLS), and raises `Unauthorized: inquiry rate limit reached` with SQLSTATE `FS429` at 10 or more.
   - **`created_at` is server-controlled.** The cap counts `created_at`, which a client could otherwise back-date on INSERT or move backwards on UPDATE. For restricted callers the same trigger is `BEFORE INSERT OR UPDATE`: INSERT forces `created_at` and `updated_at` to `clock_timestamp()`, and UPDATE refuses any change to `created_at` (`Unauthorized: inquiry created_at cannot be changed`, 42501). It lives in `guard_inquiry_rate` rather than a re-issued `guard_inquiries` so the ADR 0022 guard stays verbatim and cannot drift; `trg_guard_inquiries` still fires first on both events. Counted rows cannot be deleted either (no DELETE policy). A rollback probe in the suite shows back-dating evades the cap when this protection is removed.
   - **No count oracle.** The helper and the lock are member-gated: `recent_inquiry_count` returns 0 unless the caller is a member of that institution (`private.is_institution_user`), and the guard only takes the lock and counts for members (a non-member's insert is refused by RLS anyway). The helper stays executable by the API roles because the guard runs as the caller; making the guard SECURITY DEFINER was rejected because `private.is_restricted_caller()` classifies callers by `current_user`, which a definer function would turn into the function owner.
   - No counter table: the inquiries are the count, so direct PostgREST writes are covered. If the check cannot run the insert transaction fails, which is fail closed by construction.
   - The trigger is named `trg_guard_inquiry_rate`. Same-event triggers fire alphabetically and `trg_guard_inquiries` sorts first (`i` before `y`), so existing guard messages are unchanged and the cap only runs on otherwise-valid inserts.
   - `sendInquiry` drops the in-memory `Map` (deleted with `lib/inquiries/rate-limiter.ts`) and maps `FS429` to status 429 with the message "Your institution has reached its limit of 10 inquiries per hour" (the cap is shared by everyone at the institution). `POST /api/inquiries` returns that status with a `Retry-After` computed from the oldest counted inquiry, read with the caller's own client under RLS.
7. **Legacy limiter (dropped 2026-10-08, migration `20261010090000`).** `check_search_rate_limit` is revoked from `PUBLIC`, `anon` and `authenticated` and granted to `service_role` only. It and `search_rate_limits` are no longer used; dropping them is a follow-up.
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
- ~~Drop `search_rate_limits` and `check_search_rate_limit` in a later migration.~~ Done in `20261010090000_db_followups.sql` (no CASCADE). `verify:deploy` and `verify:pilot` now check `rate_limit_buckets` and `check_rate_limit`.
- `x-forwarded-for` is only trustworthy behind Vercel; a self-hosted deployment must overwrite it at the edge.
- The inquiry cap is per institution, not per sender.
- Test-only simulation: the integration suite simulates PostgREST as the `authenticated` role over a direct `pg` connection (`SET LOCAL ROLE` plus `request.jwt.claims`). It exercises the same grants, RLS and triggers, but not the PostgREST HTTP layer.
- No advisory-lock rollback probe. Proving the lock is load-bearing needs the guard replaced with a lock-less version on a committed, shared function while concurrent inserts race, which would affect other integration files running in parallel against the same database and is nondeterministic. The concurrency test (14 parallel inserts commit exactly the remaining allowance) covers the behaviour instead.

## Deploy

Apply the migration first, because the new app needs the RPC. Until it exists, search fails open and inquiries keep working (the trigger is simply absent). Then merge and deploy. Verify that `check_rate_limit` and `check_search_rate_limit` are executable by `service_role` only, that `trg_guard_inquiry_rate` exists on `inquiries`, then smoke-test search.

## Verification

Real-role integration suite `tests/integration/persistent-rate-limits.test.ts`, with in-suite proof-of-failure probes (grant restored, trigger dropped, inside rolled-back transactions); unit tests for client keys, the limiter, the postings route, the `/scholars` limited state and the inquiry action mapping. `audit:rls` and the policy matrix stay green.
