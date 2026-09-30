# Council Agent 1: Data and API State Audit (Council Review #10)

**Date:** 2026-09-30  
**Auditor:** Council Agent 1 (Data & API State Audit)  
**Status:** Complete (READ-ONLY)  
**Target Repository:** `/Users/rjulia/programs/FaithFullScholars`

---

### 1. Schema & Migrations Inventory
The schema contains **35 tables** managed across 13 migrations in `supabase/migrations/`. PostgreSQL Row Level Security (RLS) is enabled and forced (`FORCE ROW LEVEL SECURITY`) on all 35 tables (`npm run audit:rls` passes 35/35).

* **Orphaned Schema Definition:** `course_disciplines` has RLS enabled with 5 policies, but has **0 application references** in `lib/` or `app/`. Course queries directly reference `courses.primary_discipline_id`, leaving the secondary disciplines join table unused.
* **RPC-Encapsulated Tables:** `pilot_feedback_rate_limits` and `search_rate_limits` have no direct ORM/query references; they are accessed exclusively through `SECURITY DEFINER` database functions (`check_pilot_feedback_rate_limit`, `check_search_rate_limit`).
* **Table List:** `accounts`, `availability_profiles`, `confessional_standards`, `consortiums`, `consortium_members`, `contract_milestones`, `courses`, `course_disciplines`, `course_licensing_agreements`, `credentials`, `disciplines`, `inquiries`, `institutions`, `institution_users`, `institution_contracts`, `institution_endorsements`, `institution_postings`, `institution_subscriptions`, `media_links`, `pilot_feedback`, `pilot_feedback_rate_limits`, `profile_reviews`, `publications`, `reports`, `saved_courses`, `saved_scholars`, `scholars`, `scholar_confessions`, `scholar_disciplines`, `scholar_endorsements`, `scholar_profile_revisions`, `scholar_traditions`, `search_rate_limits`, `speaker_topics`, `traditions`.

---

### 2. Lib & Server Utilities
Key utility modules in `lib/`:
* `lib/supabase/`: SSR and admin clients (`createClient`, `createAdminClient`, `updateSession`).
* `lib/domain/`: Core types (`types.ts`), query layer (`queries.ts`), diff engine (`diff.ts`), and taxonomies (`taxonomies.ts`).
* `lib/profiles/`: `cv-parser.ts`, `dossier-service.ts`, `revision-actions.ts`.
* `lib/inquiries/`: `actions.ts`, `queries.ts`, `rate-limiter.ts`, `export-dossier.ts`.
* `lib/accreditation/`: `ats-matrix-generator.ts`, `ats-matrix-service.ts`.
* `lib/contracts/`, `lib/subscriptions/`, `lib/consortium/`, `lib/licensing/`, `lib/postings/`, `lib/speakers/`, `lib/endorsements/`, `lib/admin/`, `lib/auth/`, `lib/feedback/`, `lib/ai/`, `lib/media/`, `lib/analytics/`.

**Gaps Identified:**
* **Missing Architectural Folders:** `lib/courses/` and `lib/review/` do not exist; logic is fragmented between `domain`, `licensing`, and `admin`.
* **Test Colocation Gap:** Zero tests are colocated near the source inside `lib/`. All 48 test suites are centralized in `tests/unit/`, `tests/integration/`, and `tests/e2e/`.
* **Non-Persistent Revision Actions:** `lib/profiles/revision-actions.ts` provides pure data builders and validation, but contains no database mutations to insert or update `scholar_profile_revisions`.

---

### 3. API Routes & Server Actions
* **Server Actions (`lib/auth/auth-actions.ts`):** `loginWithPassword` (Public), `signupScholar` (Public), `signupInstitution` (Public), `signOutAction` (Public/Authenticated).
* **Route Handlers (33 total):**
  * **Public (5):** `app/auth/signout` (GET/POST), `app/auth/callback` (GET), `app/api/feedback` (POST), `app/api/postings` (GET), `app/api/scholars/[id]/endorsements` (GET).
  * **Critical Auth Vulnerabilities (4):**
    * `GET /api/institution/saved-scholars` & `POST`: Accepts client `institutionId` and executes queries via `createAdminClient()` without session verification.
    * `GET /api/institution/saved-courses` & `POST`: Accepts client `institutionId` and executes queries via `createAdminClient()` without session verification.
    * `PATCH /api/inquiries/[id]`: Calls `respondToInquiry` which updates status and sends email alerts via `createAdminClient()`.
    * `GET /api/institution/contracts/[id]` & `PATCH`: No session or role verification in the route handler.
  * **Scholar (9):** `POST /api/postings/[id]/express-interest`, `GET /api/dashboard/contracts`, `POST /api/dashboard/contracts/[id]/accept`, `GET /api/dashboard/licensing`, `POST /api/dashboard/licensing/[id]/sign`, `GET/POST/PATCH/DELETE /api/scholars/speaker-topics`, `POST /api/scholars/[id]/endorsements`, `GET/POST /api/scholars/media`, `PATCH/DELETE /api/scholars/media/[id]`.
  * **Institution User (11):** `POST /api/postings`, `GET/POST /api/inquiries`, `GET /api/institution/saved-scholars/export`, `GET/POST /api/institution/consortium`, `POST/DELETE /api/institution/consortium/members`, `GET/POST /api/institution/contracts`, `POST /api/institution/subscription/upgrade`, `GET /api/institution/subscription`, `POST /api/institution/endorsements`, `GET/POST /api/institution/licensing`, `POST /api/ai/match-faculty` (Tier Gated).
  * **Admin (4 endpoints, 6 handlers):** `app/api/admin/institutions/[id]`, `app/api/admin/triage`, `app/api/admin/triage/[id]`, `app/api/admin/reports/[id]`, `app/api/admin/reviews`, `app/api/admin/reviews/[id]`.

---

### 4. App Pages / Views
47 total page views. Flagged items:
* **Client-Side Stub (`app/dashboard/profile/page.tsx`):** Uses hardcoded mock data (`DEFAULT_PUBLISHED_SNAPSHOT`) and stores draft edits and review submissions in browser `sessionStorage` (`fs_draft_revision`), completely decoupled from Supabase.
* **Insecure Fallback (`app/(institution)/institution/saved/accreditation/page.tsx`):** Falls back to hardcoded UUID `f2000000-0000-0000-0000-000000000001` if unauthenticated.
* **Unprotected Shells:** `app/dashboard/layout.tsx` and `app/(institution)/institution/layout.tsx` lack server-side auth redirects, allowing anonymous visitors to load the application portal chrome.
* **Dev Auth Bypass:** `app/(admin)/admin/layout.tsx` allows anonymous access when `NODE_ENV === 'development'`.

---

### 5. Seed / Fixture Data Audit
`supabase/seed.sql` and `scripts/seed-pilot-cohort.ts` provide high-fidelity taxonomies (9 disciplines, 6 traditions, 12 historic confessional standards, 14+ scholars).

**Missing Scenarios & Edge Cases:**
1. **Zero Seeded Inquiries:** `public.inquiries` has **0 rows**. Both scholar and institution inboxes start completely empty.
2. **Zero Pending/Draft Revisions:** 100% of seeded revisions are `status = 'approved'`. The admin review queue (`/admin/reviews`) has 0 pending submissions.
3. **No Confessional Exceptions:** 100% of seeded confessions are `adherence_level = 'full_subscription'` with `exception_notes = NULL`. Real-world academic scruples (`with_exceptions`) are entirely absent.
4. **No Inactive Postings:** All postings are `published`; no expired or draft states exist.

---

### 6. Top Critical Gaps for Data/API Security & Completeness
1. **Service-Role RLS Bypass & Missing Route Auth:** `app/api/institution/saved-scholars`, `saved-courses`, and `inquiries/[id]` execute database mutations via `createAdminClient()`, completely bypassing PostgreSQL RLS and exposing cross-tenant data to unauthenticated requests.
2. **ADR 0005 Disconnect in Scholar Dashboard:** The scholar profile editor in `app/dashboard/profile/page.tsx` persists to browser `sessionStorage` rather than staging records to `scholar_profile_revisions`.
3. **Admin Auth Bypass & Untrusted Metadata:** `verifyStaffUser()` relies on client-writable `user_metadata.role` rather than `accounts.role`, and all admin routes bypass auth entirely in development mode (`NODE_ENV === 'development'`).
