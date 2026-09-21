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
9. [Remote Staging & Production Verification Protocol](docs/deployment/staging-verification-protocol.md)

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

- **Current Position:** Phase 0 through Phase 6, Steps 1–3, the Platform Translation Pipeline (Spanish `es`), the **Strategic Backlog Platform Capabilities (§21: Shortlist Export, Scholar Analytics, Citation-Grounded AI Faculty Matcher, and Peer Endorsements)**, the **Institutional Accounts Dual-Purpose Expansion (Academic Postings Marketplace & Authoritative Institutional Endorsements)**, the **UI & Typography Revamp (Aptos / Clean Modern Sans & Crisp Card Elevation)**, the **Modern Edge Vector Iconography Overhaul (`lucide-react`)**, the **SEO Topic Hubs & Schema.org JSON-LD Structured Metadata Engine**, the **Playwright Browser E2E Automation Suite**, and the **Pre-Flight Deployment Verification Tooling** are fully implemented, audited, and verified across all quality gates (130 vitest tests across 24 suites, 9 Playwright E2E tests, 28/28 tables RLS enforced, 0 Splinter security findings).
- **Institutional Accounts Dual-Purpose Expansion:**
  - **Academic Opportunities & Teaching Calls Portal:** Dedicated public directory (`/opportunities`, `/opportunities/[slug]`) and institution posting management workspace (`/institution/postings`, `/institution/postings/new`) for adjunct calls, modular intensives, sabbatical replacements, and full-time faculty chairs, complete with `JobPosting` Schema.org JSON-LD structured data and 1-click scholar dossier submission.
  - **Authoritative Institutional Endorsements:** Official institutional endorsements (`/institution/endorsements`, `components/scholars/scholar-endorsements-card.tsx`) featuring the Gold/Amber Institutional Shield, accredited seminary branding, verified credential badge, and official seal, distinguished from peer-to-peer scholar recommendations.
- **Deployment Pre-Flight Tooling (`verify:deploy`):** Automated pre-flight script (`scripts/verify-deployment.ts`) validating environment secrets, PostgreSQL connectivity, 100% RLS enforcement across all 28 public tables, 88 active security policies, pilot seed readiness, and scanning static production bundles (`.next/static/`) to mathematically verify zero sensitive server credentials leak into client chunks.
- **Public SEO Topic Hubs & Schema.org JSON-LD:**
  - Dedicated landing hubs for theological disciplines (`/disciplines`, `/disciplines/[slug]`) and historic confessional traditions (`/traditions`, `/traditions/[slug]`).
  - Search-engine crawlable taxonomy with rich Schema.org JSON-LD structured metadata (`BreadcrumbList`, `CollectionPage`, `ItemList`, `Person`, `EducationalOrganization`) dynamically injected for organic search visibility.
- **Playwright End-to-End Browser Automation Suite:** Full browser automation (`@playwright/test`, `playwright.config.ts`, `tests/e2e/`, `npm run test:e2e`) running headless Chromium across all 9 critical user journeys: public discovery, academic opportunities, scholar dossier credentials, confessional alignment, commendation modals, topic hubs, and institutional portals.
- **Peer Endorsements & Faculty Commendations System (§21):** Verified colleague attestations (`scholar_endorsements` table, 6 RLS policies, 3 covering indexes) supporting relationships (Supervisor, Colleague, Collaborator, Co-Author, Peer), authenticated commendation modal (`EndorseColleagueModal`), dossier display card (`ScholarEndorsementsCard`), and REST API (`/api/scholars/[id]/endorsements`).
- **Database Security Hardening & Splinter Advisor Compliance:**
  - Audited and hardened PostgreSQL database using official Supabase Security Advisor ([Splinter](https://github.com/supabase/splinter)) checks and catalog audits.
  - **Eliminated User Metadata Tampering Risk:** Replaced vulnerable `auth.jwt() -> 'user_metadata' ->> ...` lookups in RLS policies with authenticated identity references (`auth.uid()`), preventing privilege escalation or role spoofing.
  - **Function Search Path Hardening:** Explicitly pinned `search_path = public, pg_temp` across all stored functions and triggers (`handle_updated_at`, `record_search_query`, `is_admin`, `get_current_scholar_id`, `is_institution_user`), eliminating mutable search path injection vulnerabilities.
  - **Restricted Permissive Insert Policies:** Fixed `inquiries` policy to enforce target scholar existence checks rather than raw permissive true bypasses.
  - **Auth RLS InitPlan Optimization:** Converted all `auth.uid()` calls in RLS policies across 16 policies to scalar subqueries `(select auth.uid())`, allowing PostgreSQL to evaluate auth tokens once per query (InitPlan) instead of per row.
  - **Covering Indexes for Foreign Keys:** Added indexes for all unindexed foreign key relationships across joined tables (`scholar_disciplines`, `scholar_traditions`, `scholar_confessions`, `scholar_endorsements`, `institution_postings`, `institution_endorsements`, `inquiries`, `saved_scholars`, `saved_courses`, etc.), eliminating sequential scans during cascade operations.
  - **Defense-in-Depth RLS Enforcement:** Enabled `FORCE ROW LEVEL SECURITY` across all 28 public application tables.
  - **Automated Security Gate:** Created `scripts/audit-security.ts` (`npm run audit:security`), fully integrated into `npm run verify` and GitHub Actions CI.
- **Modern Edge Vector Iconography Overhaul (`lucide-react`):** Purged all dated unicode emojis and legacy glyphs across 43+ UI files in favor of sharp, purposeful vector SVG icons from `lucide-react`. Standardized stroke weights (`1.75-2px`), subtle micro-container icon boxes, and polished hover interactions matching Linear, Raycast, and Stripe design standards.
- **Clean Modern Sans & Aptos Typography Revamp:** Modernized typography across all layouts, dashboards, cards, headers, and navigation menus, eliminating dated browser default serifs in favor of **Aptos** and **Aptos Display** with `Plus_Jakarta_Sans` geometric fallback. Introduced `.card-crisp` micro-elevation and subtle border contrast, reserving fine literary serif typography (`.font-literary`) strictly for long-form doctrinal affirmations.
- **Dean & Search Committee Shortlist Export (§21):** RFC-4180 CSV export with UTF-8 BOM (`\uFEFF`) and CRLF formatting via `GET /api/institution/saved-scholars/export?format=csv` plus print-ready Academic Search Dossier report (`/institution/saved/dossier`).
- **Scholar Profile Analytics Dashboard (§21):** High-velocity scholar analytics engine (`/dashboard/analytics`) featuring 4 KPI metrics, zero-bloat SVG/CSS 8-week engagement velocity chart, institutional keyword attribution table, tradition affinity demographics, and algorithmic recommendations.
- **Citation-Grounded AI Faculty Matcher (§21):** Seminary provost search assistant (`/api/ai/match-faculty` & modal) combining Google Gemini LLM with an exhaustive deterministic theological heuristic baseline, generating fit scores (0-100%) and grounded citations across credentials, confessions, publications, and syllabi.
- **Remote Staging & Production Verification Protocol (Step 3):** Authoritative pre-flight deployment runbook (`docs/deployment/staging-verification-protocol.md`) establishing five non-negotiable gates: Supabase migration sync, remote multi-tenant RLS audit (100% pass across 28 tables), reference cohort population (`seed:pilot`), pilot readiness diagnostic (`verify:pilot`), and Vercel edge runtime smoke testing with strict security headers.
- **AI-Assisted CV & Syllabus Intelligence Engine (Step 2):** Google Gemini generative AI extractor (`lib/ai/gemini-cv-extractor.ts`) tailored for theological academia (Chicago/SBL publication parsing, doctoral degrees, confessional affinities) and course syllabus analyzer (`lib/ai/gemini-syllabus-tagger.ts`) extracting course codes, levels, learning outcomes, required primary texts, and delivery modes, paired with high-accuracy heuristic baseline fallbacks.
- **Production Edge Security Headers (Phase 6):** Strict HTTP security headers configured in `next.config.ts` including CSP with YouTube/Unsplash/Supabase whitelisting, HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Comprehensive E2E User Journeys (Phase 6):** Automated integration test suite (`tests/integration/e2e-user-journeys.test.ts`) covering all 4 core personas: scholar onboarding & revision staging, admin triage & snapshot promotion, public discovery & anti-scraping gating, and institutional outreach & shortlist lifecycle.
- **Pilot Reference Cohort:** 5 fully populated, approved reference scholars across Reformed, Baptist, Anglican, and Presbyterian traditions (Dr. Calvin Edwards, Dr. Sarah MacArthur, Dr. Thomas Cranmer-Davies, Dr. Marcus Aurelius Vance, Dr. Elizabeth Montgomery-Knox) with complete doctoral credentials, publications, course showcases, and availability profiles. All 7 diagnostic categories report 100% `PASS` via `npm run verify:pilot`.
- **Release Readiness Checklist & Pilot Diagnostic:** Production deployment checklist published in [`docs/deployment/release-readiness-checklist.md`](docs/deployment/release-readiness-checklist.md) and automated pilot readiness validator (`npm run verify:pilot`).
- **Data Isolation & Row Level Security:** 100% RLS compliance across all 28 PostgreSQL tables in the public schema (`institution_postings`, `institution_endorsements`, `scholar_endorsements`, `search_rate_limits`, `scholars`, `courses`, `inquiries`, `saved_scholars`, `saved_courses`, `scholar_profile_revisions`, `profile_reviews`, etc.).
- **Institution Inquiry & Shortlist Workflows (Phase 5):** Structured outreach modal on public profiles, scholar inquiry inbox (`/dashboard/inquiries`), institution portal (`/institution`, `/institution/inquiries`, `/institution/postings`, `/institution/endorsements`, `/institution/saved`, `/institution/profile`), bookmarked candidate shortlists and saved courses, 10 inquiries/hr rate limiting, and transactional notification email abstraction.
- **Admin Review & Trust Governance (ADR 0003, ADR 0005):** Administrative review queue (`/admin/reviews`) with side-by-side visual diff inspector comparing live published snapshots with submitted revision proposals, decision panel supporting Approve (promoting revisions to published snapshots), Request Changes, Reject, and Hide actions, immutable review audit trail in `profile_reviews`, institution verification queue (`/admin/institutions`), and reported content moderation (`/admin/reports`).
- **Revision Staging Model (ADR 0005):** Scholars stage profile edits, credentials, publications, and confessional changes in isolated draft revisions without modifying live published snapshots until admin review.
- **Assisted CV Onboarding:** Automated CV heuristic parser extracting degrees, awarding institutions, publications, and inferring theological disciplines and traditions.
- **Internationalization (i18n):** Complete platform translation framework with high-precision Spanish (`es`) theological message catalogs and universal switcher.
- **Search Abuse & Anti-Scraping Defenses:** Token-bucket rate limiting (15 req/min anonymous, 120 req/min authenticated), 3-page anonymous search cap with sign-in wall, and input sanitization stripping SQL `LIKE` wildcards.
- **LinkedIn Academic Design System:** Persistent universal app bar with `/` keyboard shortcut, "Me" dropdown menu, 3-column discovery layout, academic cover banners, 120px circular overlapping avatars, verified badges, and modular profile cards.
- **Verification Pipeline:**
  ```bash
  npm run verify
  npm run verify:deploy
  npm run test:e2e
  ```
  Runs all quality gates: `version:check`, `lint` (0 errors), `typecheck` (0 errors), `test` (24 suites, 130 tests), `audit:rls` (28/28 tables), `audit:security` (Splinter security advisor), Next.js Turbopack `build`, `verify:deploy` (13 checks), and Playwright E2E browser tests (9 tests).

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
