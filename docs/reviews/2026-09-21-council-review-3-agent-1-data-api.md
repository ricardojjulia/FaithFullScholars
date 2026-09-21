# Council Review 3 — Agent 1: Data & API Audit

**Review Date:** 2026-09-21  
**Agent:** Council Agent 1 (Data & API State Audit)  
**Status:** Complete (Read-Only)  
**Repo Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Schema & Migrations Inventory

FaithFull Scholars maintains 28 PostgreSQL tables across 9 sequential migrations in `supabase/migrations/`:
- `20260918000001_foundation.sql` (baseline schemas)
- `20260918000002_rls_and_institutions.sql` (initial RLS & institutional users)
- `20260918000003_courses_and_showcase.sql` (courses, syllabi, media)
- `20260918000004_pilot_feedback_and_triage.sql` (pilot triage)
- `20260919110000_search_rate_limits.sql` (anti-scraping token bucket)
- `20260920200000_database_security_hardening.sql` (Splinter indexing & search paths)
- `20260920213000_scholar_endorsements.sql` (peer commendations)
- `20260920220000_institution_postings_and_endorsements.sql` (dual-purpose marketplace)
- `20260921110000_copilot_review_remediations.sql` (RLS recursion & immutability triggers)

### Table Coverage & RLS Status (28/28 Enforced)

| Table | RLS Status | Policies | Active Domain Service |
|:---|:---|:---|:---|
| `accounts` | Enabled & Forced | 2 | `lib/supabase/server.ts` |
| `availability_profiles` | Enabled & Forced | 2 | `lib/domain/queries.ts` |
| `confessional_standards` | Enabled & Forced | 4 | `lib/domain/queries.ts` |
| `course_disciplines` | Enabled & Forced | 5 | `lib/courses/course-service.ts` |
| `courses` | Enabled & Forced | 2 | `lib/courses/course-service.ts` |
| `credentials` | Enabled & Forced | 2 | `lib/profiles/cv-parser.ts` |
| `disciplines` | Enabled & Forced | 4 | `lib/domain/queries.ts` |
| `inquiries` | Enabled & Forced | 3 | `lib/inquiries/inquiry-service.ts` |
| `institution_endorsements` | Enabled & Forced | 5 | `lib/endorsements/institutional-endorsement-service.ts` |
| `institution_postings` | Enabled & Forced | 6 | `lib/postings/postings-service.ts` |
| `institution_users` | Enabled & Forced | 2 | `lib/supabase/server.ts` |
| `institutions` | Enabled & Forced | 3 | `lib/domain/queries.ts` |
| `media_links` | Enabled & Forced | 2 | `lib/courses/course-service.ts` |
| `pilot_feedback` | Enabled & Forced | 2 | `lib/triage/feedback-service.ts` |
| `pilot_feedback_rate_limits` | Enabled & Forced | 1 | `lib/triage/feedback-service.ts` |
| `profile_reviews` | Enabled & Forced | 3 | `lib/review/review-service.ts` |
| `publications` | Enabled & Forced | 2 | `lib/profiles/cv-parser.ts` |
| `reports` | Enabled & Forced | 2 | `lib/review/review-service.ts` |
| `saved_courses` | Enabled & Forced | 2 | `app/api/institution/saved-courses/route.ts` |
| `saved_scholars` | Enabled & Forced | 2 | `lib/inquiries/export-dossier.ts` |
| `scholar_confessions` | Enabled & Forced | 4 | `lib/domain/queries.ts` |
| `scholar_disciplines` | Enabled & Forced | 4 | `lib/domain/queries.ts` |
| `scholar_endorsements` | Enabled & Forced | 6 | `lib/endorsements/endorsement-service.ts` |
| `scholar_profile_revisions` | Enabled & Forced | 3 | `lib/profiles/revision-service.ts` |
| `scholar_traditions` | Enabled & Forced | 4 | `lib/domain/queries.ts` |
| `scholars` | Enabled & Forced | 3 | `lib/domain/queries.ts` |
| `search_rate_limits` | Enabled & Forced | 4 | `lib/search/rate-limiter.ts` |
| `traditions` | Enabled & Forced | 4 | `lib/domain/queries.ts` |

---

## 2. Server Utilities & Test Distribution

- `lib/supabase/`: Server & client SSR cookie session managers (`server.ts`, `client.ts`).
- `lib/domain/`: Core queries, taxonomies, and view models (`queries.ts`, `taxonomies.ts`). Verified in `domain-models.test.ts`.
- `lib/postings/`: Opportunities validation & query abstractions (`postings-service.ts`). Verified in `institution-postings.test.ts`.
- `lib/endorsements/`: Colleague commendations and institutional endorsements (`endorsement-service.ts`, `institutional-endorsement-service.ts`). Verified in `scholar-endorsements.test.ts` and `scholar-endorsements-rls.test.ts`.
- `lib/analytics/`: Scholar engagement calculations (`scholar-analytics.ts`). Verified in `scholar-analytics.test.ts`.
- `lib/ai/`: Gemini CV parser, syllabus tagger, and faculty matcher. Verified in `ai-intelligence.test.ts`.
- `lib/inquiries/`: Structured inquiry validation, rate limits, CSV/dossier export. Verified in `inquiry-validation.test.ts` and `shortlist-export.test.ts`.
- `lib/search/`: Anti-scraping token-bucket rate limiter and sanitizer. Verified in `search-gating.test.ts` and `search-rate-limits.test.ts`.

---

## 3. API Route Authorization Inventory

All 17 Route Handlers enforce role-based access:
1. `GET /api/postings` — Public (filters published openings from approved institutions).
2. `POST /api/postings` — Verified Institution User only (`getUser()`, checks `institution_users`).
3. `POST /api/postings/[id]/express-interest` — Verified Scholar only (`getUser()`, requires approved profile).
4. `GET /api/institution/endorsements` — Public (displays active endorsements).
5. `POST /api/institution/endorsements` — Verified Institution User only (with role checking for verified credential).
6. `GET /api/scholars/[id]/endorsements` — Public (displays approved peer endorsements).
7. `POST /api/scholars/[id]/endorsements` — Authenticated Scholar only.
8. `POST /api/inquiries` — Public / Authenticated (rate-limited to 10 inquiries/hr).
9. `GET/PATCH /api/inquiries/[id]` — Scholar recipient or Institution sender.
10. `GET/POST /api/institution/saved-scholars` — Verified Institution User only.
11. `GET /api/institution/saved-scholars/export` — Verified Institution User only (RFC-4180 CSV / JSON).
12. `GET/POST /api/institution/saved-courses` — Verified Institution User only.
13. `POST /api/ai/match-faculty` — Authenticated Institution / Scholar (sanitized query).
14. `POST /api/feedback` — Rate-limited public pilot feedback (fingerprint/session).
15. `GET /api/admin/reviews` & `[id]` — Platform Admin only (`is_admin()`).
16. `GET /api/admin/institutions/[id]` — Platform Admin only.
17. `GET /api/admin/triage` & `[id]` — Platform Admin only.

---

## 4. Top 5 Data/API Gaps

1. **Speaking Bureau & Conference Topic Registry**: `availability_profiles` has boolean availability flags (`guest_lecture`, `conference_speaking`), but lacks lecture topics, sample recordings, travel requirements, or honorarium parameters.
2. **Consortium Multi-Institution Data Models**: Institutions currently exist as isolated single organizations; theological consortia (e.g. ACTS, BTI) lack parent/child consortium membership.
3. **Structured Registrar Credential Verification Metadata**: Endorsement `is_credential_verified` is boolean; no audit table records degree conferral verification dates or registrar contact references.
4. **Automated Search Inquiry Digest Emails**: Notifications are currently direct transactional mocks without batching digests for deans.
5. **Subscription Tier Enforcement**: No database table models institution subscription tiers (`institution_subscriptions`), feature quotas, or billing statuses.
