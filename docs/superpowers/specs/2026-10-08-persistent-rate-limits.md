# Spec: Persistent, Enforced Rate Limits

- **Status:** Story approved by the owner on 2026-10-08. Technical brief approved 2026-10-08 (gate 5).
- **Order:** slice 1 of the remaining known-broken fixes. The owner chose the order rate limits → real portal data → applications → conference hub (later).
- **Extends:** ADR 0008 (search abuse gating), ADR 0022 (follow-up: the inquiry cap is bypassable).
- **Branch:** `fix/persistent-rate-limits`

## Problem

Research on `main`, 2026-10-07:

- **The search limiter is never called.**
  - `lib/search/rate-limiter.ts` calls the Postgres RPC `check_search_rate_limit`.
  - No production code calls `checkSearchRateLimit`; only the tests do.
  - So ADR 0008's "15/min anonymous, 120/min authenticated, 429 with Retry-After" is enforced nowhere.
- **The RPC grant is too broad.** `check_search_rate_limit` is granted to `authenticated`.
  - Any signed-in user can call it directly with an arbitrary fingerprint and limit.
  - That lets them use up another client's allowance or flood the table.
  - The table also has no cleanup, so it grows without bound.
- **The inquiry cap can be bypassed.** The cap (10 per hour per institution) lives in a module-level `Map` (`lib/inquiries/rate-limiter.ts`).
  - It resets on every serverless cold start and is not shared across instances.
  - Direct PostgREST inserts skip it entirely.
- **Failure is silent.** On any database error the search limiter fails open with only a `console.warn`.
- **Stale CHANGELOG.** The CHANGELOG mentions a `record_search_query` function that no migration defines.

## Story

As **the platform**, I enforce rate limits that survive restarts, are shared across instances and cannot be bypassed by calling the database directly. As a result, scraping the scholar directory and spamming scholars with inquiries are actually limited.

### Acceptance criteria

#### A. One persistent limiter primitive
1. A single SECURITY DEFINER function `public.check_rate_limit(key, window, max)` with `search_path=''`.
   - It records a hit atomically and returns allowed, remaining and reset time.
   - EXECUTE is granted to `service_role` only. `anon` and `authenticated` cannot call it.
2. The key is always derived on the server:
   - `search:<hashed client IP>` or `search:user:<account>`;
   - `inquiry:<institution_id>`.
   - A client never supplies the key or the limit.
3. Old buckets are cleaned up. Expired rows are deleted on write, or by a bounded cleanup inside the function, so the table cannot grow without bound. No external scheduler is required.
4. The over-broad grant on `check_search_rate_limit` is removed. It is either dropped or re-pointed to the new primitive and granted to `service_role` only.

#### B. Search is actually limited (ADR 0008)
5. The public directory search (`/scholars`, every request with search or filter parameters) applies 15 per minute to anonymous visitors and 120 per minute to signed-in users.
6. Over the limit, the visitor gets a clear, friendly "too many searches, try again in N seconds" state, and API responses return 429 with a `Retry-After` header.
7. If the limiter itself errors, search **stays available**: it fails open for reads. The failure is logged as an error that names the cause in the log only, never in the response.
8. The client IP comes from the platform's forwarded-for header (Vercel). It is hashed before storage. Raw IPs are never stored.

#### C. Inquiries are capped at the database
9. Sending more than 10 inquiries per hour per institution is refused, whether through the app or directly against the database API.
   - The refusal is a guard that counts recent `inquiries` rows, so no separate counter is needed.
   - The error is `Unauthorized:`-style and maps to a friendly 429 in the app.
10. This write limit **fails closed**: if the check cannot run, the inquiry is not sent.
11. The in-memory `Map` limiter is removed.

#### D. Tests and gates
12. Real-role integration tests:
    - `anon` and `authenticated` cannot execute the limiter functions;
    - the limiter allows exactly N concurrent hits and refuses the N+1th;
    - the window resets;
    - expired rows are cleaned;
    - the 11th inquiry within an hour is refused for an institution member, both through PostgREST and through the app action, while another institution is unaffected.
    - Each guard is proven to fail when removed (in-suite rollback probe, as in ADR 0025).
13. Unit tests cover the search page and API 429 behaviour, `Retry-After`, the fail-open read path, and the fail-closed write path.
14. The policy matrix and `audit:rls` stay green. The stale `record_search_query` CHANGELOG claim is corrected.

### Non-goals
- Rate limits for applications. They arrive with the applications slice, using this primitive.
- Upstash or Vercel KV, or any new dependency. Postgres is adequate at pilot scale.
- Per-plan inquiry quotas. The monthly subscription allowance stays as it is.
- Analytics or search-query logging.

## Owner decisions
1. Order: rate limits → real portal data → applications → conference hub (2026-10-07).
2. Defaults proposed, pending story approval:
   - Postgres-backed (no new dependency);
   - reads fail open with error logging, writes fail closed;
   - limits as ADR 0008 (search 15/120 per minute) and 10 inquiries per hour per institution;
   - client IP from Vercel's `x-forwarded-for`, hashed.

## Technical brief

### Migration `20261008090000_persistent_rate_limits.sql` (idempotent; no data changes)

1. **Table `public.rate_limit_buckets`** (FORCE RLS, no policies, so the API cannot reach it):
   - `key text`, `window_start timestamptz`, `hits int NOT NULL DEFAULT 0`, `PRIMARY KEY (key, window_start)`;
   - an index on `window_start`.
2. **`public.check_rate_limit(p_key text, p_window_seconds int, p_max int)`**
   - SECURITY DEFINER, `search_path=''`.
   - **Input checks:** non-empty key of at most 200 characters, window 1 to 86400 seconds, max 1 to 10000.
   - **Fixed window:** the window start is `to_timestamp(floor(epoch / window) * window)`.
   - **Count:** `INSERT … ON CONFLICT (key, window_start) DO UPDATE SET hits = hits + 1 RETURNING hits`. The upsert is atomic, so concurrent calls count exactly.
   - **Cleanup:** before the upsert, delete at most 100 rows whose `window_start` is more than 1 day old. This bounds the cleanup cost per call and needs no external scheduler.
   - **Returns** `TABLE(allowed boolean, remaining int, reset_at timestamptz)`.
   - **Permissions:** `REVOKE ALL FROM PUBLIC, anon, authenticated`; `GRANT EXECUTE TO service_role`.
3. **Legacy limiter.** `REVOKE EXECUTE ON public.check_search_rate_limit FROM PUBLIC, anon, authenticated`; grant it to `service_role` only. It is not dropped yet; existing tests reference it. `search_rate_limits` stays in place, unused, and its removal is a recorded follow-up.
4. **Inquiry cap at the database:** `private.guard_inquiry_rate()`, BEFORE INSERT on `inquiries`.
   - For restricted callers only.
   - Takes `pg_advisory_xact_lock(hashtextextended('inquiry-rate:' || NEW.institution_id, 0))` so concurrent inserts serialise per institution.
   - Counts `inquiries` rows for that institution with `created_at > now() - interval '1 hour'`.
   - When the count is 10 or more, raises `Unauthorized: inquiry rate limit reached` with SQLSTATE **`FS429`**.
   - Admins and the service role are exempt.
   - This needs no counter table and covers direct PostgREST inserts. If the check cannot run, the insert transaction fails, so it fails closed by construction.

### App
- **`lib/rate-limit/limiter.ts`** (new; server-only; added to the ESLint admin-client allow-list).
  - `checkLimit(key, windowSeconds, max)` calls the RPC through the service-role client.
  - Returns `{allowed, remaining, resetAt, failed}`.
  - Callers decide what failure means: reads fail open, logging the SQLSTATE only; writes fail closed.
- **`lib/rate-limit/client-key.ts`**
  - Reads the first `x-forwarded-for` hop, then `x-real-ip`, then `unknown`.
  - Hashes it with SHA-256 using the optional `RATE_LIMIT_SALT` env var (empty if unset) and returns `search:ip:<hex16>`.
  - Signed-in users are keyed by account instead: `search:user:<uuid>`.
- **`lib/search/rate-limiter.ts`** is rewritten on top of the primitive, keeping the ADR 0008 limits (anonymous 15 per minute, authenticated 120 per minute) and `getRateLimitHeaders`.
- **Wiring:**
  - `app/scholars/page.tsx`: when the request carries search or filter parameters, check the limit. When it is exceeded, render a friendly "Too many searches. Try again in N seconds." state instead of results. A page cannot set a status code, so the rendered state is the response.
  - `app/api/postings/route.ts` (the public opportunities listing JSON): return 429 with `Retry-After` and the rate-limit headers when the limit is exceeded.
- **Inquiry path:**
  - `lib/inquiries/actions.ts` drops the in-memory check and record, and maps SQLSTATE `FS429` to a friendly "You have reached the hourly inquiry limit" with status 429.
  - `lib/inquiries/rate-limiter.ts` is deleted.
  - Any API route using it returns 429.

### Tests
- **Integration, real roles:**
  - `anon` and `authenticated` cannot execute `check_rate_limit` or `check_search_rate_limit` (42501).
  - The service role gets exactly N allowed and then refused.
  - 20 parallel calls produce exactly N allowed.
  - Pre-aged buckets are deleted by the cleanup.
  - An institution member's 11th inquiry within the hour is refused (FS429) through PostgREST as `authenticated`, while another institution can still send.
  - Admin and service role are exempt.
  - A rollback probe drops the trigger and shows the 11th insert then succeeds.
- **Unit:**
  - client-key hashing (no raw IP in the key);
  - limiter fail-open and fail-closed;
  - the postings route 429 and `Retry-After`;
  - the scholars page limited state;
  - the inquiry action FS429 mapping.
- Policy matrix: no column changes. `audit:rls` covers the new table (FORCE RLS on; zero policies is intended, so document it if the audit requires a policy).

### Docs
- ADR 0026 (rate-limit primitive and DB-enforced write caps).
- ADR 0008 amendment.
- CHANGELOG, with the stale `record_search_query` claim corrected.
- README/HOWTO, adding the `RATE_LIMIT_SALT` env var (optional).

### Deploy
Apply the migration first. The new app needs the RPC. Until it exists, search fails open and the inquiry action keeps working, since the trigger simply isn't there yet. Then merge. Verify that the grants are service_role only and the trigger exists, then smoke-test search.
