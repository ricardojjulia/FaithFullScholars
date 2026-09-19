# Pilot Feedback & Error-Triage System — Implementation, Usage, and Integration Playbook

A low-friction, in-product feedback and automatic-error-capture loop for pilot/demo users, with server-side deduplication, rate limiting, and a staff triage workspace. This is the single highest-leverage tool for the MVP → full-product journey: it turns raw pilot usage into structured, prioritized signal without asking pilot users to file tickets, and it is the concrete mechanism for closing an "external validation" gate (a real user completing real usage, uncoached) that no amount of internal audit can substitute for.

This playbook is written to be portable to any codebase, any stack. Adapt naming, database, and framework specifics; keep the architecture, the data-boundary rules, and the operational discipline.

---

## 0. Why this exists

Pilot and demo users rarely file good bug reports. They hit something confusing or broken, shrug, and move on — and you never hear about it. This system closes that gap two ways:

1. **Manual capture** — a floating, always-available feedback button lets a user flag a bug, error, unexpected result, or improvement idea in under 10 seconds, in context, without leaving the page.
2. **Automatic capture** — a global error boundary silently reports unhandled UI errors the moment they happen, with the same context a manual report would carry, so you learn about crashes even when the user never says a word.

Both funnel into one deduplicated, triageable queue that staff review — turning "a pilot church/customer is using this uncoached" from a hope into an instrumented, observable process. Treat this system itself as a Phase-A/pilot-gate requirement, not a nice-to-have: if you can't see what real users are hitting, you can't credibly claim the pilot validated anything.

---

## 1. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────┐
│ Client (only in demo/pilot mode — feature-gated, server-enforced)│
│                                                                   │
│  SessionProvider ──▶ session UUID, breadcrumbs (last 5 routes),  │
│                       elapsed session duration, SSR-safe          │
│         │                                                        │
│         ├──▶ FeedbackButton (manual) ──▶ modal: category + note  │
│         │                                                        │
│         └──▶ ErrorBoundary (automatic) ──▶ silent capture on     │
│               unhandled render error, non-blocking toast          │
│                                                                   │
│         both POST only contextual, untrusted data ───────────────┼──┐
└─────────────────────────────────────────────────────────────────┘  │
                                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Server: one submission endpoint                                     │
│  1. re-check the feature gate server-side (never trust the client)  │
│  2. validate/bound every field; reject malformed input               │
│  3. derive identity from the authenticated session — ignore any      │
│     identity the client claims to be                                 │
│  4. compute a normalized SHA-256 fingerprint server-side — ignore     │
│     any fingerprint the client claims                                │
│  5. atomic distributed rate limit (N submissions per session per     │
│     window) — in shared durable storage, not process memory          │
│  6. upsert on fingerprint: increment hit count, refresh context,      │
│     reopen if previously triaged, keep original created_at            │
└─────────────────────────────────────────────────────────────────────┘
                                                                       │
                                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Storage: one table, isolated from tenant/customer operational data   │
│  RLS/equivalent: only platform staff can read or mutate; the public   │
│  submission path writes only through a server-only privileged client  │
└─────────────────────────────────────────────────────────────────────┘
                                                                       │
                                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Staff triage workspace (platform-staff-only route)                    │
│  filter → open row → set action → mark processed → optimistic update  │
└─────────────────────────────────────────────────────────────────────┘
```

Three non-negotiable boundary rules, regardless of stack:
- **The feature gate is enforced on the server, not just hidden client-side.** A disabled feature flag that only hides a button is not a gate — the endpoint itself must refuse writes.
- **Identity and fingerprint are always server-derived, never client-supplied.** The browser is not a trusted source for "who is this" or "is this a duplicate."
- **Feedback storage lives in the platform/control-plane data boundary, not customer/tenant operational storage**, if your system has that split. It's operational telemetry about your product, not a customer's data.

---

## 2. FaithFull Scholars Implementation Details

In FaithFull Scholars, this playbook is implemented per **[ADR 0006](file:///Users/rjulia/programs/FaithFullScholars/docs/adr/0006-pilot-feedback-error-triage.md)**:

1. **Storage & RLS**:
   - `supabase/migrations/20260918193000_pilot_feedback_triage.sql` creates `pilot_feedback` and `pilot_feedback_rate_limits`.
   - 100% RLS enforced with server-only privileged service client writing submissions.
   - Atomic database stored procedure `check_feedback_rate_limit(session_uuid, max_tokens, window_seconds)` prevents burst spam.
2. **Server API**:
   - `app/api/feedback/route.ts`: Evaluates gate `NEXT_PUBLIC_DEMO_MODE`, parses session UUID, derives server-side authenticated identity, computes normalized SHA-256 fingerprint, and performs upsert on fingerprint collision.
   - `app/api/admin/triage/route.ts` & `app/api/admin/triage/[id]/route.ts`: Admin-only mutation routes protected by staff role check.
3. **Client Components**:
   - `components/feedback/feedback-provider.tsx`: SSR-safe session provider generating tab-scoped session UUID and tracking last 5 route breadcrumbs.
   - `components/feedback/feedback-button.tsx`: Accessible floating button with category selection (`BUG`, `ERROR`, `UNEXPECTED_RESULT`, `IMPROVEMENT`) and character-capped note.
   - `components/feedback/feedback-shell.tsx`: Root shell integration with React error boundary.
   - `components/feedback/triage-workspace.tsx`: Staff workspace on `/admin/triage` with category/date filters, hit count rankings, triage action selectors, and optimistic updates.
4. **Verification**:
   - `tests/unit/pilot-feedback.test.ts` (12 tests).
   - `tests/integration/triage.test.ts` (2 tests).
