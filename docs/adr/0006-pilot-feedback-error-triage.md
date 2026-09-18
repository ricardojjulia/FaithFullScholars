# ADR 0006: Pilot Feedback & Automatic Error-Triage System

## Status
Accepted

## Context
During MVP and pilot deployment phases, real pilot and demo users rarely file formal bug tickets when encountering friction, confusing workflows, or minor rendering crashes; they typically abandon the flow unassisted. To credibly achieve external validation and uncoached real-world adoption, we require an in-product, low-friction feedback capture mechanism coupled with silent automatic error logging.

## Decision
We implement a unified telemetry and error triage subsystem governed by three non-negotiable architectural boundaries:

1. **Server-Enforced Feature Gate:**
   - Controlled via `NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED`.
   - When disabled, client components render `null`, detach event listeners, and perform zero `sessionStorage` writes.
   - Crucially, the server endpoint (`POST /api/feedback`) independently validates this gate and rejects writes with HTTP 403, preventing bypass via direct API calls.

2. **Server-Derived Identity & Normalized Fingerprinting:**
   - Client-supplied identity and fingerprint fields are strictly ignored.
   - User identity (email and role) is derived solely from the active Supabase server session (`supabase.auth.getUser()`); anonymous visitors store `null`.
   - Deduplication fingerprints are calculated server-side using SHA-256 over normalized inputs (lowercase, trimmed whitespace, collapsed interior spaces, stripped trailing slashes on routes).
   - Duplicate submissions increment `hit_count`, refresh the latest context, and automatically reopen previously resolved items (`processed = false`, `action = null`) to ensure regressions are immediately surfaced back to staff.

3. **Control-Plane Telemetry Isolation & Database RLS:**
   - Telemetry tables (`public.pilot_feedback`, `public.pilot_feedback_rate_limits`) live in the control-plane data boundary, isolated from customer and scholar domain tables.
   - PostgreSQL Row Level Security (RLS) is forced. Only authenticated staff holding the `admin` role are permitted to SELECT or UPDATE records directly.
   - Public submissions write exclusively through the privileged server-side Supabase client (`createAdminClient()`), preventing any tenant or public client from reading or tampering with triage records.

4. **Atomic Distributed Rate Limiting:**
   - Rate limiting is enforced atomically in PostgreSQL durable storage (`pilot_feedback_rate_limits`) rather than in server process memory, ensuring consistency across serverless and multi-instance environments.
   - Enforces a cap of 20 submissions per minute per session, returning HTTP 429 upon limit exhaustion.

## Threat Model & Operational Caveat
- **Session Identifier Rotation:** A browser-generated `sessionStorage` UUID can be rotated by a technical user or automated script. The per-session rate limit effectively prevents client UI loops and accidental flooding, but is not complete Sybil or distributed bot protection.
- **Error Masking:** The public submission endpoint masks all database and server errors, returning generic messages (HTTP 500) to ensure database schemas, credentials, and ports are never exposed.

## Migration & Deployment Order
The database migration `supabase/migrations/20260918193000_pilot_feedback_triage.sql` must be applied prior to or concurrently with the deployment of the `/api/feedback` route handlers.
