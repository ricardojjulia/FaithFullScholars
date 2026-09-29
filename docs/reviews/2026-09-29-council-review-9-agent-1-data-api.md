# Council Review #9 — Agent 1: Data & API Audit

**Date:** September 29, 2026  
**Auditor:** Council Agent 1 (Data & API State Auditor)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`  
**Status:** Clean — Production Baseline Verified (100% RLS Coverage, 35/35 Tables Passing)

---

## 1. Schema & Migrations Inventory

FaithFull Scholars maintains 13 migration files under `supabase/migrations/` defining and hardening 35 public tables. All 35 tables enforce PostgreSQL Row Level Security via `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`. All foreign keys have dedicated covering indexes (0 unindexed foreign keys), preventing table-lock deadlocks and index scans during cascading joins.

| Category | Tables | RLS Policies | Status |
| :--- | :--- | :---: | :---: |
| **Auth & Core Accounts** | `accounts`, `institutions`, `institution_users` | 7 | ✅ PASS |
| **Faculty & Profiles** | `scholars`, `scholar_profile_revisions`, `profile_reviews`, `availability_profiles` | 11 | ✅ PASS |
| **Taxonomy & Confessions** | `disciplines`, `scholar_disciplines`, `traditions`, `scholar_traditions`, `confessional_standards`, `scholar_confessions` | 24 | ✅ PASS |
| **Credentials & Media** | `credentials`, `publications`, `media_links` | 6 | ✅ PASS |
| **Curriculum & Licensing** | `courses`, `course_disciplines`, `saved_courses`, `course_licensing_agreements` | 15 | ✅ PASS |
| **Inquiries & Gating** | `inquiries`, `saved_scholars`, `search_rate_limits`, `pilot_feedback`, `pilot_feedback_rate_limits`, `reports` | 14 | ✅ PASS |
| **Institutional Endorsements** | `scholar_endorsements`, `institution_endorsements`, `institution_postings` | 17 | ✅ PASS |
| **Speaking Bureau** | `speaker_topics` | 6 | ✅ PASS |
| **Enterprise & Consortia** | `institution_subscriptions`, `institution_contracts`, `contract_milestones`, `consortiums`, `consortium_members` | 23 | ✅ PASS |

**Total Public Tables:** 35 | **Total Active RLS Policies:** 123 (0 bypasses, 0 recursive loops)

---

## 2. Lib & Server Utilities

Data access and business logic in `lib/` are fully decoupled from UI layers, strictly typed, and backed by comprehensive unit and integration tests:
- `lib/supabase/`: SSR clients (`server.ts`, `client.ts`, `middleware.ts`) enforcing cookie-based session hydration and authenticated user resolution.
- `lib/domain/`: Core types (`types.ts`) and query services (`queries.ts`, `diff.ts`) backing profile lifecycle, revision staging, and doctrinal standards.
- `lib/profiles/`: Profile revision actions (`revision-actions.ts`), dossier compilation (`dossier-service.ts`), and CV extraction (`cv-parser.ts`).
- `lib/contracts/` & `lib/licensing/`: Lifecycle management for institutional bookings (`contract-service.ts`) and syllabus accreditation licensing (`licensing-service.ts`).
- `lib/consortium/` & `lib/speakers/`: Multi-campus seminary systems (`consortium-service.ts`) and speaking bureau engagements (`speaker-service.ts`).
- `lib/inquiries/` & `lib/postings/`: Inquiry workflows, PDF/dossier export, search rate-limiting, and institution faculty recruitment.
- `lib/search/` & `lib/ai/`: Input sanitization (`sanitize.ts`), theological confessional matching (`confessional-matcher.ts`), and Gemini AI semantic faculty matching (`gemini-faculty-matcher.ts`).
- `lib/i18n/`: Full bilingual reactive translation (`en.json`, `es.json`) across 18 namespaces with 100% key parity.

**Test Coverage:** 232 unit/integration tests across 46 suites (26 unit, 20 integration) validating service methods, state machines, and RLS boundaries.

---

## 3. API Routes & Server Actions

All 31 Route Handler files (47 HTTP methods) under `app/api/` enforce authentication, schema parsing, and role-based access control:
- **Public (Rate-Limited / Open)**: `/api/feedback` (POST), `/api/ai/match-faculty` (POST), `/api/postings` (GET), `/api/scholars/[id]/endorsements` (GET).
- **Scholar Role**: `/api/scholars/media` (GET, POST), `/api/scholars/media/[id]` (PATCH, DELETE), `/api/scholars/speaker-topics` (GET, POST, PATCH, DELETE), `/api/scholars/[id]/endorsements` (POST), `/api/dashboard/contracts` (GET), `/api/dashboard/contracts/[id]/accept` (POST), `/api/dashboard/licensing` (GET), `/api/dashboard/licensing/[id]/sign` (POST), `/api/postings/[id]/express-interest` (POST).
- **Institution User Role**: `/api/institution/subscription` (GET), `/api/institution/subscription/upgrade` (POST), `/api/institution/contracts` (GET, POST), `/api/institution/contracts/[id]` (GET, PATCH), `/api/institution/licensing` (GET, POST), `/api/institution/endorsements` (POST), `/api/institution/saved-scholars` (GET, POST), `/api/institution/saved-scholars/export` (GET), `/api/institution/saved-courses` (GET, POST), `/api/institution/consortium` (GET, POST), `/api/institution/consortium/members` (POST, DELETE), `/api/inquiries` (GET, POST), `/api/inquiries/[id]` (PATCH), `/api/postings` (POST).
- **Admin Role**: `/api/admin/reviews` (GET), `/api/admin/reviews/[id]` (GET, POST), `/api/admin/triage` (GET), `/api/admin/triage/[id]` (PATCH), `/api/admin/reports/[id]` (POST), `/api/admin/institutions/[id]` (POST).

---

## 4. App Pages & Navigation Routing

Next.js Turbopack compiles 58 distinct routes across `app/`. No orphaned routes or broken endpoints exist:
- Public discovery hubs (`/scholars`, `/courses`, `/speakers`, `/disciplines`, `/traditions`, `/opportunities`).
- Scholar authenticated workspace (`/dashboard`, `/dashboard/profile`, `/dashboard/courses`, `/dashboard/availability`, `/dashboard/contracts`, `/dashboard/licensing`, `/dashboard/analytics`, `/dashboard/media`).
- Institutional portal (`/institution`, `/institution/saved`, `/institution/postings`, `/institution/contracts`, `/institution/licensing`, `/institution/consortium`, `/institution/subscription`).
- Admin governance center (`/admin/reviews`, `/admin/triage`, `/admin/reports`, `/admin/institutions`).

---

## 5. Live Verification Telemetry

- **PostgreSQL RLS Coverage**: 35/35 tables PASS with 123 active policies (`npm run audit:rls`).
- **Splinter Security Checks**: 6/6 checks PASS (`npm run audit:security`), 0 unindexed foreign keys, 0 mutable search paths.
- **Vitest Test Suite**: 232/232 tests PASS across 46 suites (`npm run test`).
- **Build & Types**: 0 TypeScript compiler errors, 0 ESLint warnings, 58/58 routes compiled cleanly.

---

## 6. Data Model Health & Sign-Off Recommendation

The schema exhibits exemplary relational hygiene: immutable primary keys, strict foreign key constraints, explicit RLS enforcement on all tables, and zero security bypasses. Data layer multi-tenancy and institutional privacy are thoroughly safeguarded.

**Recommendation:** Unconditional **APPROVE** and sign-off for Council Review #9.
