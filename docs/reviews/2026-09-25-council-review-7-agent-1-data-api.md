# Council Review #7 — Agent 1: Data & API Audit

**Date:** 2026-09-25  
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
| **Academic Credentials & Media**| `credentials`, `publications`, `media_links` | 6 | ✅ PASS |
| **Curriculum & Licensing** | `courses`, `course_disciplines`, `saved_courses`, `course_licensing_agreements` | 15 | ✅ PASS |
| **Inquiries & Search Gating** | `inquiries`, `saved_scholars`, `search_rate_limits`, `pilot_feedback`, `pilot_feedback_rate_limits`, `reports` | 14 | ✅ PASS |
| **Institutional Endorsements** | `scholar_endorsements`, `institution_endorsements`, `institution_postings` | 17 | ✅ PASS |
| **Speaking Bureau** | `speaker_topics` | 6 | ✅ PASS |
| **Enterprise & Contracts** | `institution_subscriptions`, `institution_contracts`, `contract_milestones`, `consortiums`, `consortium_members` | 23 | ✅ PASS |

**Total Public Tables:** 35 | **Total Active RLS Policies:** 123 (0 bypasses, 0 recursive loops)

---

## 2. Server Utilities & Library Structure

All business logic in `lib/` is modular, typed, and accompanied by unit/integration tests:
- `lib/supabase/`: Client SSR (`server.ts`, `client.ts`, `middleware.ts`, `admin.ts` with service role isolation).
- `lib/profiles/`: Profile queries, revision staging, and assisted CV extraction (`cv-parser.ts`).
- `lib/search/`: Input sanitizer (`sanitize.ts`), query bounders, and AI Faculty Matcher (`ai-matcher.ts`).
- `lib/contracts/` & `lib/licensing/`: Contract lifecycle state machine and milestone progression.
- `lib/consortiums/` & `lib/speakers/`: Consortium multi-tenancy and speaking bureau queries.
- `lib/i18n/`: Bilingual reactive translation catalog (`en.json`, `es.json`) across 18 namespaces.

---

## 3. Route Handlers & Server Actions

All 34 Route Handlers in `app/api/` enforce authentication, schema validation, and authorization boundaries:
- **Public Endpoints**: `/api/feedback`, `/api/ai/match-faculty` (rate-limited via `search_rate_limits`).
- **Scholar Endpoints**: `/api/dashboard/contracts/[id]/accept`, `/api/dashboard/licensing/[id]/sign`, `/api/scholars/speaker-topics`, `/api/scholars/media`.
- **Institution Endpoints**: `/api/institution/subscription`, `/api/institution/contracts`, `/api/institution/endorsements`, `/api/institution/saved-scholars`, `/api/institution/licensing`, `/api/institution/consortium`.
- **Admin Endpoints**: `/api/admin/reviews`, `/api/admin/triage`, `/api/admin/institutions`, `/api/admin/reports`.

---

## 4. Live Production Database Verification

- **Remote Supabase Project**: `faithfull-scholars-prod` (`yxrvrjkzlumenlvczqjd`) in `us-east-1` under ChurchCore organization.
- **Pre-Flight Audit**: `verify:deploy` passed 21 of 21 checks against live AWS connection pooler.
- **Secret Leak Audit**: Zero private keys or database passwords leaked into client bundles.

---

## 5. Critical Findings & Data Integrity Notes

1. **Transaction Pooler vs. Session Pooler**: The application is configured to connect to port 5432 for session operations and direct migrations, with prepared statement safety enabled.
2. **Doctrinal Statement Encryption & Integrity**: Scholar doctrinal statements and confessional affirmations remain isolated to owner drafts until explicit admin approval promotes the snapshot.
3. **Multi-Tenant Consortium Isolation**: Consortium members are partitioned so non-consortium institutions cannot view private consortium-wide postings.
