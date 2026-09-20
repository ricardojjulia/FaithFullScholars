# FaithFull Scholars

FaithFull Scholars is a planned professional network for professors in theological and biblical higher education. It is designed to help colleges, seminaries, churches, and ministry programs discover qualified scholars, review their curriculum vitae, inspect courses and sample teaching content, and understand their availability for adjunct teaching, guest lectures, curriculum review, and course licensing.

The application target is a Vercel-hosted Next.js app backed by Supabase for Auth, Postgres data, Row Level Security, and file storage for CV/profile assets.

## Planning Package

Start here if this repository is being read by an AI worker or implementation agent:

1. [Product Master Plan](docs/product/master-plan.md)
2. [Architecture Review](docs/architecture/architecture-review.md)
3. [Software Factory](docs/factory/software-factory.md)
4. [MVP Execution Plan](docs/superpowers/plans/2026-06-05-faithfull-scholars-mvp.md)
5. [Initial Product Spec](docs/superpowers/specs/2026-06-05-scholar-profile-network-design.md)
6. [Roadmap](docs/product/roadmap.md)
7. [Agent Ingestion Brief](docs/factory/agent-ingestion-brief.md)
8. [Vercel and Supabase Deployment](docs/deployment/vercel-supabase.md)

Initial ADRs:

- [ADR 0001: Scholar Profile Network First](docs/adr/0001-scholar-profile-network-first.md)
- [ADR 0002: External Media Hosting](docs/adr/0002-external-media-hosting.md)
- [ADR 0003: Admin-Reviewed Public Profiles](docs/adr/0003-admin-reviewed-publication.md)
- [ADR 0004: Vercel and Supabase Platform Baseline](docs/adr/0004-vercel-supabase-platform.md)
- [ADR 0005: Draft and Published Profile Revisions](docs/adr/0005-draft-published-profile-revisions.md)
- [ADR 0006: Pilot Feedback & Automatic Error Triage System](docs/adr/0006-pilot-feedback-error-triage.md)
- [ADR 0007: LinkedIn-Grade UI/UX and Academic Network Design System](docs/adr/0007-linkedin-ux-and-academic-network-design-system.md)
- [ADR 0008: Search Abuse Gating, Anti-Scraping Defenses & PII Protection](docs/adr/0008-search-abuse-gating-anti-scraping-and-pii-protection.md)

## Current Status & Verification

- **Current Position:** Phase 0 (Foundation), Phase 1 (Domain Foundation), Phase 2 (Public Discovery), **Milestone 2.5 (LinkedIn UI/UX & Search Abuse Gating)**, **Task 3.0 (Assisted CV Ingestion)**, **Phase 3 (Scholar Dashboard & Revision Staging)**, **Phase 4 (Admin Review, Visual Diff Inspector & Trust Governance)**, **Phase 5 (Institution Inquiry & Shortlist Workflows)**, **Phase 6 (MVP Release Hardening & Deployment Preparation)**, **Step 1 (Pilot Cohort Seed Expansion)**, and **Step 2 (AI-Assisted CV & Syllabus Intelligence Engine)** along with the **Platform Language Translation Pipeline (Spanish `es`)** are fully implemented, audited, and verified across all 6 quality gates (112 tests across 19 suites, 25/25 tables RLS enforced).
- **AI-Assisted CV & Syllabus Intelligence Engine (Step 2):** Google Gemini generative AI extractor (`lib/ai/gemini-cv-extractor.ts`) tailored for theological academia (Chicago/SBL publication parsing, doctoral degrees, confessional affinities) and course syllabus analyzer (`lib/ai/gemini-syllabus-tagger.ts`) extracting course codes, levels, learning outcomes, required primary texts, and delivery modes, paired with high-accuracy heuristic baseline fallbacks.
- **Production Edge Security Headers (Phase 6):** Strict HTTP security headers configured in `next.config.ts` including CSP with YouTube/Unsplash/Supabase whitelisting, HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Comprehensive E2E User Journeys (Phase 6):** Automated integration test suite (`tests/integration/e2e-user-journeys.test.ts`) covering all 4 core personas: scholar onboarding & revision staging, admin triage & snapshot promotion, public discovery & anti-scraping gating, and institutional outreach & shortlist lifecycle.
- **Pilot Reference Cohort:** 5 fully populated, approved reference scholars across Reformed, Baptist, Anglican, and Presbyterian traditions (Dr. Calvin Edwards, Dr. Sarah MacArthur, Dr. Thomas Cranmer-Davies, Dr. Marcus Aurelius Vance, Dr. Elizabeth Montgomery-Knox) with complete doctoral credentials, publications, course showcases, and availability profiles. All 7 diagnostic categories report 100% `PASS` via `npm run verify:pilot`.
- **Release Readiness Checklist & Pilot Diagnostic:** Production deployment checklist published in [`docs/deployment/release-readiness-checklist.md`](docs/deployment/release-readiness-checklist.md) and automated pilot readiness validator (`npm run verify:pilot`).
- **Data Isolation & Row Level Security:** 100% RLS compliance across all 25 PostgreSQL tables in the public schema (`search_rate_limits`, `scholars`, `courses`, `inquiries`, `saved_scholars`, `saved_courses`, `scholar_profile_revisions`, `profile_reviews`, etc.).
- **Institution Inquiry & Shortlist Workflows (Phase 5):** Structured outreach modal on public profiles, scholar inquiry inbox (`/dashboard/inquiries`), institution portal (`/institution`, `/institution/inquiries`, `/institution/saved`, `/institution/profile`), bookmarked candidate shortlists and saved courses, 10 inquiries/hr rate limiting, and transactional notification email abstraction.
- **Admin Review & Trust Governance (ADR 0003, ADR 0005):** Administrative review queue (`/admin/reviews`) with side-by-side visual diff inspector comparing live published snapshots with submitted revision proposals, decision panel supporting Approve (promoting revisions to published snapshots), Request Changes, Reject, and Hide actions, immutable review audit trail in `profile_reviews`, institution verification queue (`/admin/institutions`), and reported content moderation (`/admin/reports`).
- **Revision Staging Model (ADR 0005):** Scholars stage profile edits, credentials, publications, and confessional changes in isolated draft revisions without modifying live published snapshots until admin review.
- **Assisted CV Onboarding:** Automated CV heuristic parser extracting degrees, awarding institutions, publications, and inferring theological disciplines and traditions.
- **Internationalization (i18n):** Complete platform translation framework with high-precision Spanish (`es`) theological message catalogs and universal switcher.
- **Search Abuse & Anti-Scraping Defenses:** Token-bucket rate limiting (15 req/min anonymous, 120 req/min authenticated), 3-page anonymous search cap with sign-in wall, and input sanitization stripping SQL `LIKE` wildcards.
- **LinkedIn Academic Design System:** Persistent universal app bar with `/` keyboard shortcut, "Me" dropdown menu, 3-column discovery layout, academic cover banners, 120px circular overlapping avatars, verified badges, and modular profile cards.
- **Verification Pipeline:**
  ```bash
  npm run verify
  ```
  Runs all 6 quality gates: `version:check`, `lint` (0 errors), `typecheck` (0 errors), `test` (19 suites, 112 tests), `audit:rls` (25/25 tables), and Next.js Turbopack `build`.

## Product Shape

The recommended MVP is a Scholar Profile Network:

- Public scholar profiles with academic identity, biography, disciplines, affiliations, theological tradition, affirmed confessional standards, and personal doctrinal statements.
- Assisted CV onboarding with automated PDF extraction pre-filling draft profile fields to eliminate onboarding friction.
- CV and publication showcase, including downloadable CV files when the scholar chooses to publish them.
- Revision staging model keeping approved profiles live and searchable while ongoing edits are reviewed.
- Course showcase with syllabi, sample content, YouTube lecture links, reading lists, and free course previews.
- Availability signals for adjunct instruction, online courses, guest lectures, intensive modules, curriculum consulting, doctoral supervision, and conference speaking.
- Institutional discovery tools for colleges looking for qualified professors by discipline, availability, language, delivery format, and doctrinal or confessional fit.

Marketplace workflows such as formal booking, contracts, payments, and institution-to-scholar hiring pipelines are intentionally deferred until the directory and availability signals prove demand.
