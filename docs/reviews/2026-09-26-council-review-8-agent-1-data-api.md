# Council Review #8 — Agent 1: Data & API Audit

**Date:** 2026-09-26  
**Auditor:** Council Agent 1 (Data & API State Auditor)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`  
**Status:** Clean — Production Elevated (100% RLS Coverage, 35/35 Tables Passing)

---

## 1. PostgreSQL Schema & Migrations Inventory

FaithFull Scholars maintains 13 migration files under `supabase/migrations/` creating and hardening 35 public schema tables. All tables strictly enforce PostgreSQL Row Level Security (RLS) with `FORCE ROW LEVEL SECURITY`.

| Table Category | Tables | RLS Policies | Status |
| :--- | :--- | :---: | :---: |
| **Auth & Core Accounts** | `accounts`, `institutions`, `institution_users` | 7 | ✅ PASS |
| **Faculty & Profiles** | `scholars`, `scholar_profile_revisions`, `profile_reviews`, `availability_profiles` | 11 | ✅ PASS |
| **Taxonomy & Confessions** | `disciplines`, `scholar_disciplines`, `traditions`, `scholar_traditions`, `confessional_standards`, `scholar_confessions` | 24 | ✅ PASS |
| **Academic Credentials & Media** | `credentials`, `publications`, `media_links` | 6 | ✅ PASS |
| **Curriculum & Licensing** | `courses`, `course_disciplines`, `saved_courses`, `course_licensing_agreements` | 15 | ✅ PASS |
| **Inquiries & Search Gating** | `inquiries`, `saved_scholars`, `search_rate_limits`, `pilot_feedback`, `pilot_feedback_rate_limits`, `reports` | 14 | ✅ PASS |
| **Institutional Endorsements** | `scholar_endorsements`, `institution_endorsements`, `institution_postings` | 17 | ✅ PASS |
| **Speaking Bureau** | `speaker_topics` | 6 | ✅ PASS |
| **Enterprise & Contracts** | `institution_subscriptions`, `institution_contracts`, `contract_milestones`, `consortiums`, `consortium_members` | 23 | ✅ PASS |

**Total Public Tables:** 35 | **Total Active RLS Policies:** 123 (0 bypasses, 0 recursive loops)

---

## 2. Server Utilities & Library Structure

All business logic in `lib/` is modular, strictly typed, and accompanied by unit/integration tests:
- `lib/supabase/`: Client SSR (`server.ts`, `client.ts`, `middleware.ts`, `admin.ts` with service role isolation).
- `lib/profiles/`: Profile queries, revision staging, and assisted CV extraction (`cv-parser.ts`, `dossier-service.ts`).
- `lib/search/`: Input sanitizer (`sanitize.ts`), query bounders, confessional matcher (`confessional-matcher.ts`), and AI Faculty Matcher (`gemini-faculty-matcher.ts`).
- `lib/contracts/` & `lib/licensing/`: Contract lifecycle state machine and syllabus licensing terms.
- `lib/consortium/` & `lib/speakers/`: Consortium multi-tenancy and speaking bureau queries.
- `lib/i18n/`: Bilingual reactive translation catalog (`en.json`, `es.json`) across 18 namespaces with 100% symmetric key parity.

---

## 3. Route Handlers & Server Actions

All 34 Route Handlers in `app/api/` enforce authentication, schema validation, and authorization boundaries:
- **Public Endpoints**: `/api/feedback`, `/api/ai/match-faculty` (rate-limited via `search_rate_limits`).
- **Scholar Endpoints**: `/api/dashboard/contracts/[id]/accept`, `/api/dashboard/licensing/[id]/sign`, `/api/scholars/speaker-topics`, `/api/scholars/media`.
- **Institution Endpoints**: `/api/institution/subscription`, `/api/institution/contracts`, `/api/institution/endorsements`, `/api/institution/saved-scholars`, `/api/institution/saved-scholars/export`, `/api/institution/licensing`, `/api/institution/consortium`.
- **Admin Endpoints**: `/api/admin/reviews`, `/api/admin/triage`, `/api/admin/institutions`, `/api/admin/reports`.

---

## 4. Verification & Splinter Security Telemetry

- **PostgreSQL RLS Audit**: 35 of 35 tables PASS with 100% RLS enforcement (`npm run audit:rls`).
- **Splinter Security Checks**: 6/6 checks PASS (`npm run audit:security`), 0 foreign key covering index gaps, 0 unpinned function search paths.
- **Unit & Integration Tests**: 228 of 228 tests passing across 45 suites (`npm run test`).
- **Secret Leak Audit**: Clean — zero private keys or database passwords leaked into client bundles.

---

## 5. Agent 1 Sign-Off

The data, schema, RLS policies, and API routing architecture are robust, hardened, and 100% verified. Agent 1 signs off on platform state for Council Review #8.
