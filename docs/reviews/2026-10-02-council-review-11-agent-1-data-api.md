# Council Review #11 — Agent 1: Data and API State Audit

**Auditor:** Council Agent 1 (Data & API State Auditor)  
**Date:** 2026-10-02  
**Scope:** Read-Only Audit of Schema, Database Utilities, API Routes, Views, Seeds, and Multi-Tenant Security  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Schema & Migrations Inventory
The database schema consists of **35 tables** managed across 13 migrations in `supabase/migrations/`:
* **RLS Coverage:** 100% enforced. All 35 tables have `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` active with 123 distinct policies (`npm run audit:rls` passes 35/35; `npm run audit:security` passes 6/6).
* **Inventory by Domain:**
  - *Auth & Core Accounts (3):* `accounts`, `institutions`, `institution_users`
  - *Faculty & Profiles (4):* `scholars`, `scholar_profile_revisions`, `profile_reviews`, `availability_profiles`
  - *Taxonomy & Confessions (6):* `disciplines`, `scholar_disciplines`, `traditions`, `scholar_traditions`, `confessional_standards`, `scholar_confessions`
  - *Credentials & Media (3):* `credentials`, `publications`, `media_links`
  - *Curriculum & Licensing (4):* `courses`, `course_disciplines`, `saved_courses`, `course_licensing_agreements`
  - *Inquiries, Shortlists & Moderation (6):* `inquiries`, `saved_scholars`, `search_rate_limits`, `pilot_feedback`, `pilot_feedback_rate_limits`, `reports`
  - *Postings & Endorsements (3):* `scholar_endorsements`, `institution_endorsements`, `institution_postings`
  - *Speaking Bureau (1):* `speaker_topics`
  - *Consortia & Contracts (5):* `institution_subscriptions`, `institution_contracts`, `contract_milestones`, `consortiums`, `consortium_members`
* **Unreferenced/Orphan Table:** `course_disciplines` (join table for secondary course disciplines) has RLS enabled with 5 policies, but 0 application references in `lib/` or `app/` (courses use `primary_discipline_id`).
* **RPC-Encapsulated Tables:** `pilot_feedback_rate_limits` and `search_rate_limits` have no application ORM calls; they are queried solely via `SECURITY DEFINER` database functions.

---

## 2. Lib & Server Utilities
Data utilities in `lib/` span 21 domain directories:
* `lib/supabase/` (SSR/Admin clients), `lib/domain/` (types, queries, diff), `lib/profiles/` (dossier, CV parser, revision actions), `lib/inquiries/` (actions, queries, export), `lib/postings/` (applicant service, postings service), `lib/accreditation/` (ATS matrix), `lib/contracts/`, `lib/licensing/`, `lib/consortium/`, `lib/speakers/`, `lib/subscriptions/`, `lib/endorsements/`, `lib/admin/`, `lib/auth/`, `lib/feedback/`, `lib/ai/`, `lib/media/`, `lib/analytics/`, `lib/notifications/`, `lib/i18n/`, `lib/seo/`.
* **Identified Gaps:**
  - **Missing Modules:** `lib/courses/` and `lib/review/` do not exist. Logic is fragmented between `lib/domain/`, `lib/licensing/`, and `lib/admin/`.
  - **Zero Colocated Tests:** There are 0 test files inside `lib/`. All 49 test suites (251 tests) are centralized in `tests/unit/` and `tests/integration/`.
  - **No Database Persistence in Revision Actions:** `lib/profiles/revision-actions.ts` provides pure data transformation helpers but zero database mutations to persist staged revisions.

---

## 3. API Routes & Server Actions
* **Server Actions (`lib/auth/auth-actions.ts`):** `loginWithPassword`, `signupScholar`, `signupInstitution`, `signOutAction`.
* **Route Handlers (33 total across `app/api/` and `app/auth/`):**
  - *Public (4):* `/auth/signout`, `/auth/callback`, `GET /api/postings`, `GET /api/scholars/[id]/endorsements`.
  - *Rate-Limited Public (1):* `POST /api/feedback`.
  - *Scholar Role (9):* `POST /api/postings/[id]/express-interest`, `GET /api/dashboard/contracts`, `POST /api/dashboard/contracts/[id]/accept`, `GET /api/dashboard/licensing`, `POST /api/dashboard/licensing/[id]/sign`, `GET/POST/PATCH/DELETE /api/scholars/speaker-topics`, `POST /api/scholars/[id]/endorsements`, `GET/POST /api/scholars/media`, `PATCH/DELETE /api/scholars/media/[id]`.
  - *Institution User Role (13):* `POST /api/postings`, `GET/POST /api/inquiries`, `PATCH /api/inquiries/[id]`, `GET /api/institution/saved-scholars/export`, `GET/POST /api/institution/saved-scholars`, `GET/POST /api/institution/saved-courses`, `GET/POST /api/institution/consortium`, `POST/DELETE /api/institution/consortium/members`, `GET/POST /api/institution/contracts`, `POST /api/institution/subscription/upgrade`, `GET /api/institution/subscription`, `POST /api/institution/endorsements`, `GET/POST /api/institution/licensing`, `POST /api/ai/match-faculty`.
  - *Admin Role (6):* `POST /api/admin/institutions/[id]`, `GET /api/admin/triage`, `PATCH /api/admin/triage/[id]`, `POST /api/admin/reports/[id]`, `GET /api/admin/reviews`, `GET/POST /api/admin/reviews/[id]`.
* **Vulnerabilities Flagged:**
  - `GET/PATCH /api/institution/contracts/[id]`: No session or role check in handler.
  - `saved-scholars`, `saved-courses`, and `inquiries/[id]`: Contain non-production bypasses allowing unauthenticated access to default UUID `f2000000-0000-0000-0000-000000000001`.
  - Raw database error details returned to clients in `lib/inquiries/actions.ts` and `lib/admin/actions.ts`.

---

## 4. App Pages / Views
Compiles **48 page views** across `app/`. No empty route stubs exist.
* **Client Mock Stubs:** `app/dashboard/profile/page.tsx` and `app/dashboard/preview/page.tsx` store revisions in browser `sessionStorage` against static mock data, decoupled from Supabase.
* **Unprotected Shell Layouts:** `app/dashboard/layout.tsx` and `app/(institution)/institution/layout.tsx` lack server-side auth redirects, rendering workspace chrome to unauthenticated visitors.

---

## 5. Seed / Fixture Data Audit
`supabase/seed.sql` and `scripts/seed-pilot-cohort.ts` provide realistic taxonomies (9 disciplines, 6 traditions, 12 confessions, 14 scholars).
* **Missing Data:**
  1. `public.saved_scholars` & `public.saved_courses`: 0 rows seeded; shortlists start empty.
  2. `public.profile_reviews`: 0 rows seeded; review inbox begins empty.
  3. Pending/Draft Revisions: 100% of seeded revisions are `status = 'approved'`.
  4. Confessional Scruples: 100% of seeded confessions are full/strict subscription; `with_exceptions` is never demonstrated.

---

## 6. Top 5 Critical Gaps
1. **ADR 0005 Disconnect in Scholar Profile Editor:** `app/dashboard/profile/page.tsx` persists edits to `sessionStorage` rather than staging records in `public.scholar_profile_revisions`.
2. **Service-Role RLS Bypass in Inquiries Actions:** `lib/inquiries/actions.ts` uses `createAdminClient()` for mutations, circumventing PostgreSQL RLS.
3. **Missing Route Auth & Error Leakage:** `GET/PATCH /api/institution/contracts/[id]` lacks auth validation; error responses leak raw postgres error strings.
4. **Missing Root Next.js Middleware:** `lib/supabase/middleware.ts` is never mounted at repository root (`middleware.ts`), disabling global session refresh and edge route protection.
5. **Orphan Schema Objects & Fragmented Course Utilities:** `course_disciplines` is an unused schema table; `lib/courses/` and `lib/review/` directories are missing from `lib/`.
