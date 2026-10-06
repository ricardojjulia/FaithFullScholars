# FaithFull Scholars — System Architecture & Topology

> **Source of truth:** [`FAITHFULL_SCHOLARS_FULL_PLAN.md`](FAITHFULL_SCHOLARS_FULL_PLAN.md)
> **Security baseline:** [ADR 0022](adr/0022-session-derived-identity-and-rls-helper-isolation.md) · [ADR 0023](adr/0023-trust-guards-phase2-and-policy-matrix.md)
> **Version:** `0.1.0` (pre-GA, see [VERSIONING](../VERSIONING.md))

---

## 1. High-Level Topology

FaithFull Scholars is a **Next.js 16 App Router** application on **Vercel**, backed by **Supabase** (PostgreSQL, Auth and Storage). Authorization is enforced in the database with Row Level Security. Application code only shapes what users see.

```mermaid
flowchart TB
    subgraph Client ["Browser"]
        PublicUI["Public Directory: scholars, courses, speakers, opportunities, topic hubs"]
        ScholarUI["Scholar Workspace (/dashboard)"]
        InstitutionUI["Institution Portal (/institution)"]
        AdminUI["Admin Console (/admin)"]
    end

    subgraph Edge ["Vercel Edge & Next.js Server"]
        Proxy["proxy.ts: session refresh, CSP / HSTS headers"]
        RSC["React Server Components + Page Guards"]
        Routes["Route Handlers (app/api/*)"]
        Services["Domain Services (lib/*)"]
    end

    subgraph Supabase ["Supabase"]
        Auth["Auth (GoTrue)"]
        PG["PostgreSQL: FORCE RLS on public tables"]
        Private["private schema: DEFINER helpers & guard triggers"]
        Storage["Storage: CVs, syllabi, media"]
    end

    subgraph External ["External Services"]
        Gemini["Google Gemini: CV & syllabus extraction"]
        Email["Transactional email abstraction"]
    end

    Client --> Proxy --> RSC
    Client --> Routes
    RSC --> Services
    Routes --> Services
    Services -- "user JWT (RLS-scoped)" --> PG
    Services -- "service_role (admin review RPC, seeding)" --> PG
    Services --> Auth
    Services --> Storage
    Services --> Gemini
    Services --> Email
    PG --- Private
```

---

## 2. Request Lifecycle & Trust Boundaries

Every request derives identity from the **session**, never from a client-supplied identifier. Layouts do not protect pages in Next.js 16, so each protected page calls its own guard.

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant P as proxy.ts
    participant G as Page Guard / Route Handler
    participant S as getSessionContext()
    participant DB as PostgreSQL (RLS + triggers)

    B->>P: request + auth cookies
    P->>P: refresh session, set security headers
    P->>G: forward
    G->>S: resolve user, role, scholarId, institution access
    S->>DB: SELECT as the signed-in user (RLS applies)
    S-->>G: session context (or null → 401 / redirect)
    G->>DB: read / write with the RLS-scoped client
    DB->>DB: policies filter rows, guard triggers refuse trust-column changes (42501)
    DB-->>G: rows or a refusal
    G-->>B: response with generic errors only (no SQL detail)
```

### Security invariants
- **RLS is the boundary.** Every public table has `FORCE ROW LEVEL SECURITY`. Application `WHERE` clauses are never the only protection.
- **Trust columns are guarded.** Roles, publication status, verification status and tiers can be changed only by admins or the service role. The guard triggers fail closed through `private.is_restricted_caller()`.
- **Helpers stay private.** SECURITY DEFINER helpers live in the unexposed `private` schema with `search_path = ''`.
- **The service role is fenced.** An ESLint rule blocks importing the service-role client from user-facing code. Admin decisions go through one service-role-only RPC.
- **Behaviour is tested, not just presence.** Integration suites sign in as real roles. The policy matrix fails on any undeclared column write or on a probe that silently changes nothing.

---

## 3. Profile Revision & Admin Review

Approved profiles stay live while edits are reviewed ([ADR 0005](adr/0005-draft-published-profile-revisions.md)). The persisted lifecycle and the atomic review function are defined in ADR 0024 and land with PR #56.

```mermaid
sequenceDiagram
    autonumber
    actor Sch as Scholar
    participant API as /api/scholars/revisions
    participant DB as PostgreSQL
    actor Adm as Admin
    participant RPC as review_profile_revision()

    Sch->>API: PUT draft (allow-listed snapshot)
    API->>DB: insert/update own open revision (guard trigger checks transition)
    Sch->>API: POST /submit
    API->>DB: draft → submitted (submitted_at set by DB)
    Adm->>RPC: approve / request_changes / reject (service role only)
    RPC->>DB: lock scholar, then revision, verify status is submitted
    RPC->>DB: publish scalar fields, supersede previous, write profile_reviews (one transaction)
    DB-->>Sch: status visible in the dashboard banner
```

---

## 4. Core Data Model

```mermaid
erDiagram
    ACCOUNTS ||--o| SCHOLARS : "owns"
    ACCOUNTS ||--o{ INSTITUTION_USERS : "member of"
    INSTITUTIONS ||--o{ INSTITUTION_USERS : "has"
    SCHOLARS ||--o{ SCHOLAR_PROFILE_REVISIONS : "stages"
    SCHOLARS ||--o{ PROFILE_REVIEWS : "audited by"
    SCHOLAR_PROFILE_REVISIONS ||--o{ PROFILE_REVIEWS : "decided in"
    SCHOLARS ||--o{ CREDENTIALS : "holds"
    SCHOLARS ||--o{ PUBLICATIONS : "authored"
    SCHOLARS ||--o{ COURSES : "teaches"
    SCHOLARS ||--o{ SCHOLAR_DISCIPLINES : "teaches in"
    SCHOLARS ||--o{ SCHOLAR_TRADITIONS : "belongs to"
    SCHOLARS ||--o{ SCHOLAR_CONFESSIONS : "affirms"
    CONFESSIONAL_STANDARDS ||--o{ SCHOLAR_CONFESSIONS : "affirmed as"
    SCHOLARS ||--o| AVAILABILITY_PROFILES : "offers"
    INSTITUTIONS ||--o{ INQUIRIES : "sends"
    SCHOLARS ||--o{ INQUIRIES : "receives"
    INSTITUTIONS ||--o{ SAVED_SCHOLARS : "shortlists"
    SCHOLARS ||--o{ SAVED_SCHOLARS : "saved as"
    INSTITUTIONS ||--o{ INSTITUTION_POSTINGS : "publishes"

    ACCOUNTS {
        uuid id PK "equals auth.users.id"
        text role "scholar, institution_user or admin"
    }
    SCHOLARS {
        uuid id PK
        uuid account_id FK
        text profile_status
        uuid published_revision_id FK
        uuid draft_revision_id FK
    }
    SCHOLAR_PROFILE_REVISIONS {
        uuid id PK
        uuid scholar_id FK
        text status
        jsonb snapshot_data
        text admin_notes
    }
    INSTITUTIONS {
        uuid id PK
        text status
    }
    PROFILE_REVIEWS {
        uuid id PK
        uuid revision_id FK
        uuid reviewer_account_id FK
        text action
    }
```

Later phases add subscriptions, contracts and milestones, course licensing, consortia, endorsements and speaker topics. Each is covered by RLS and, where it carries trust state, by guard triggers ([ADR 0023](adr/0023-trust-guards-phase2-and-policy-matrix.md)).

---

## 5. CI & Release Pipeline

```mermaid
flowchart LR
    Push["Push / PR to main"] --> Lint["lint + version check"]
    Push --> Types["typecheck"]
    Push --> Surface["test-surface gate"]
    Push --> Tests["unit + integration (local Supabase, real roles, policy matrix, audit:rls, audit:security)"]
    Push --> Build["next build"]
    Push --> E2E["Playwright E2E (real /login personas)"]
    Lint & Types & Surface & Tests & Build --> Required{"Required checks (ruleset)"}
    Required --> Review["pr-review + Council + Copilot review"]
    Review --> Merge["Squash merge to main"]
    Merge --> Vercel["Vercel production deploy"]
```

Production database migrations are applied deliberately: run a preflight query, apply in the hosted SQL editor, verify grants, then deploy the app. See [`deployment/staging-verification-protocol.md`](deployment/staging-verification-protocol.md).

---

## 6. Directory Structure

```text
app/                 Next.js App Router: (admin), (auth), (institution) route groups, dashboard, public pages, api/
components/          UI by domain (scholars, institution, admin, forms, shell, …)
lib/                 Domain services: auth/session, supabase clients, profiles, admin, search, ai, i18n, …
supabase/migrations/ Ordered SQL migrations (RLS, guards, functions); never edit a merged one
scripts/             Audits (RLS, security), seeding, deploy verification, test-surface gate
tests/               unit/, integration/ (live DB, real roles, policy matrix), e2e/ (Playwright), surface/
docs/                Plan, ADRs, product, deployment, testing, factory, reviews
proxy.ts             Session refresh and security headers (Next.js 16 proxy convention)
```
