# FaithFull Scholars Roadmap

## Current Position
Phase 0 (Foundation), Phase 1 (Domain Foundation), Phase 2 (Public Discovery), **Milestone 2.5 (LinkedIn-Grade UI/UX & Search Abuse Gating)**, **Task 3.0 (Assisted CV Ingestion & Onboarding)**, **Phase 3 (Scholar Dashboard & Revision Staging)**, **Phase 4 (Admin Review, Visual Diff Inspector & Trust Governance)**, **Phase 5 (Institution Inquiry & Shortlist Workflows)**, **Phase 6 (MVP Release Hardening & Deployment Preparation)**, **Phase 7 (Strategic Backlog Capabilities & AI Intelligence)**, the **Platform Language Translation Pipeline (Spanish `es`)**, the **Remote Staging & Production Verification Protocol**, **Phase 8 (Institutional Accounts Dual-Purpose Expansion & Authoritative Endorsements)**, **Phase 9 (Theological Conference Speaker Directory & Institutional Speaking Bureau)**, and **Phase 10 (Tiered Institutional Subscriptions & Booking Contracts Workflow)** are fully implemented, audited, and verified across all quality gates (158 tests across 30 suites, 15 Playwright E2E browser tests across 6 suites, 32/32 PostgreSQL tables RLS enforced with 110 policies, 0 Splinter security findings, 16 deployment pre-flight checks, Next.js 16 Proxy convention). Remaining post-MVP backlog items (Course Licensing, Credential Verification, Consortium Accounts, Premium Scholar Profiles) are cleanly cataloged for future follow-up. ~~Ready for live Vercel & Supabase pilot deployment.~~ **Not launch-ready (Council Review 12, 2026-10-05):** authorization defects were found and fixed in ADR 0022/0023. Scholar draft and submit (persisted in PR #56, awaiting owner approval and production migration; live-row content edits still bypass review), express-interest, institution invitations, live data in several portal screens, a persistent rate limiter, and GDPR/encryption are outstanding. The figures above predate that review. See `docs/reviews/2026-10-05-council-review-12-synthesis.md`.

## Phase 0: Foundation

Goal: Create the runnable app scaffold and quality gates.

Deliverables:

- Next.js TypeScript app.
- Vercel project configuration.
- Supabase local/remote configuration.
- Lint, build, unit test, and e2e test scripts.
- Baseline layout and homepage.

Exit criteria:

- `npm run verify` passes.
- App starts locally.

## Phase 1: Domain Foundation

Goal: Model the theological scholar network domain.

Deliverables:

- Database schema (including `confessional_standards`, `scholar_confessions`, and `scholar_profile_revisions`).
- Seed data for theological disciplines, traditions, and historical confessional standards.
- Domain types.
- Initial taxonomy.
- Supabase SQL migrations and RLS policies supporting live vs. draft revisions.
- Supabase Storage buckets for CV/profile assets and doctrinal statement files.

Exit criteria:

- Database can be created from schema.
- Seed data loads.
- Domain types match product spec.
- RLS blocks unauthorized direct access.

## Phase 2: Public Discovery

Goal: Let visitors discover approved scholars and courses.

Deliverables:

- Scholar directory.
- Scholar profile page (displaying credentials, courses, publications, confessional affirmations, and doctrinal statements).
- Course directory.
- Course detail page.
- Public search filters (discipline, availability, delivery mode, tradition, confessional standard, doctrinal statement).

Exit criteria:

- Draft profiles and unapproved revisions are never public.
- Approved scholars and public courses are discoverable with multi-criteria filters.

## Milestone 2.5: LinkedIn-Grade UI/UX & Search Abuse Gating

Goal: Elevate the public discovery experience to modern LinkedIn standards while implementing robust search rate-limiting, anti-scraping defenses, and PII protection (ADR 0007, ADR 0008).

Deliverables:

- Persistent universal top application bar with integrated search typeahead and scope selectors.
- Modern 3-column desktop layout for directory and discovery feeds (mini-profile & filters on left, main directory in center, recommendations & trust rail on right).
- Canonical LinkedIn-style profile card hierarchy: cover banner, 120px overlapping avatar, credential headline, action bar, and modular cards for degrees, publications, syllabi, and doctrinal affirmations.
- Search rate limiter: 15 req/min for anonymous callers and 120 req/min for signed-in users. The original `search_rate_limits` limiter was never called and is dropped by migration `20261010090000` (pending deploy); ADR 0026 (PR #65) replaces it with the enforced `check_rate_limit` and `rate_limit_buckets`, pending the production migration `20261008090000`.
- 3-page anonymous discovery cap (max 18 results) with sign-in wall preventing automated candidate harvesting.
- Search input sanitization and PII segregation.

Exit criteria:

- Directory and profile pages look and feel like modern LinkedIn tailored for theological academia.
- Automated rate limiter blocks search abuse with HTTP 429.
- Anonymous pagination beyond page 3 triggers authentication prompt.
- All quality gates (`npm run verify`) pass.

## Phase 3: Scholar Dashboard & Revision Staging (Completed)

Goal: Let scholars onboard easily, manage profiles, courses, media, CVs, availability, and submit revisions.

Deliverables:

- Assisted CV onboarding (PDF extraction, text paste, heuristic extraction of degrees, institutions, publications, disciplines).
- Profile editor with doctrinal statement and confessional standards management.
- Revision staging manager (ADR 0005): changes save to draft revisions without breaking live profiles, with real-time diff preview.
- Course and syllabi manager with modal creation and delivery mode tags.
- Availability manager for teaching formats, opportunity types, and academic terms.
- LinkedIn-grade profile preview matching public discovery look and feel.
- Complete platform i18n translation framework with Spanish (`es`) catalog and language switcher.

Exit criteria:

- [x] Scholars can onboard via CV upload or manual entry.
- [ ] Scholars can submit complete profiles or revision diffs for review. Persisted lifecycle shipped (PR #56, ADR 0024). Review-gated content and relational promotion on approval shipped in PR #62 (ADR 0025) and is live in production (migration `20261007090000` applied 2026-10-07).
- [x] Ownership checks prevent cross-profile edits.
- [x] All 6 quality gates pass (`npm run verify`).

## Phase 4: Admin Review, Visual Diff Inspector & Trust Governance (Completed)

Goal: Protect platform trust before public listing and moderate profile edits (ADR 0003, ADR 0005).

Deliverables:

- Review queue for initial profile submissions and revision diffs (`/admin/reviews`).
- Visual diff viewer (`RevisionDiffViewer`) comparing published baseline snapshot with submitted revision.
- Approve, request changes, reject, and hide actions with reviewer notes and publication promotion.
- Review history and audit log (`profile_reviews` table).
- Institution verification queue (`/admin/institutions`) with verify and reject workflows.
- Reported content moderation queue (`/admin/reports`) with dismiss, warn, hide, and remove actions.
- Persistent admin sub-navigation bar across reviews, institutions, reports, and error triage.

Exit criteria:

- [x] Admins control initial profile publication and revision promotions.
- [x] Review actions are auditable in `profile_reviews` table.
- [x] Institutions can be verified or rejected with audit trails.
- [x] Reported content items can be reviewed and moderated.
- [x] All 6 quality gates pass (`npm run verify`).

## Phase 5: Institution Inquiry & Shortlist Workflows (Completed)

Goal: Let approved institutions contact scholars through structured opportunity requests and manage recruitment shortlists (ADR 0008).

Deliverables:

- Structured faculty outreach inquiry modal (`StructuredInquiryModal`) for adjunct teaching, modular courses, guest lectures, etc.
- Candidate shortlisting and course bookmarking systems (`saved_scholars`, `saved_courses`) with persistence.
- Scholar Inquiry Inbox (`/dashboard/inquiries`) with status transitions (pending, accepted, declined, archived) and decision feedback.
- Institution Portal workspace (`/institution`, `/institution/inquiries`, `/institution/saved`, `/institution/profile`).
- Real data on portal screens (PR #66, pending merge): the institution home, shortlist, outreach log and profile and the scholar dashboard and inbox read the signed-in user's own rows; analytics is labelled sample data; the conference hub is a staff-only preview. Still on fixtures: `/dashboard/courses`. Next slice: the applications rebuild.
- Anti-spam rate limiting (10 inquiries/hr per institution) and input validation. Now a database trigger (ADR 0026, PR #65), pending the production migration `20261008090000`.
- Transactional email notification service abstraction (`email-service.ts`) with event logging.
- Unit and database integration tests verifying end-to-end communication workflows.

Exit criteria:

- [x] Approved institution users can send inquiries.
- [x] Unapproved institutions are blocked at API and RLS layers.
- [x] Spam-prone routes are rate-limited.
- [x] Scholar inbox displays incoming inquiries and allows accept/decline responses.
- [x] Candidates and courses can be shortlisted and viewed in the institution portal.
- [x] All 6 quality gates pass (`npm run verify`).

## Phase 6: MVP Release Hardening & Deployment Preparation (Completed)

Goal: Harden platform edge security, validate complete user journeys end-to-end, and prepare for production Vercel deployment and pilot cohort onboarding.

Deliverables:

- Strict Edge HTTP Security Headers (`next.config.ts`): CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, and frame ancestor blocking.
- Comprehensive End-to-End User Journey Integration test suite (`tests/integration/e2e-user-journeys.test.ts`) covering all 4 core personas (scholar onboarding, admin trust review, public discovery, institutional hiring).
- Production Release Readiness Checklist (`docs/deployment/release-readiness-checklist.md`).
- Pilot Cohort Diagnostic Inspector script (`scripts/verify-pilot-readiness.ts` / `npm run verify:pilot`).
- 100% passing automated quality gates (`npm run verify`).

Exit criteria:

- [x] Strict security headers enforced on all application routes.
- [x] All 4 persona flows verified in automated end-to-end integration tests.
- [x] Release checklist published and documented.
- [x] Diagnostic script verifies pilot seed baseline (taxonomy, confessions, traditions, RLS).
- [x] All 6 quality gates pass (`npm run verify` = 101 tests across 18 files, 25/25 tables RLS enforced).
- [x] MVP is ready to support a controlled pilot cohort of scholars and institutions.

## Phase 7: Strategic Backlog Capabilities & AI Intelligence (Completed)

Goal: Deliver strategic platform capabilities from the Post-MVP backlog (§21) empowering seminary deans, search committees, and theological scholars with AI-assisted discovery, analytics, and dossier exports.

Deliverables:

- **Dean & Search Committee Shortlist Export**: RFC-4180 compliant CSV export engine (`export-dossier.ts`) with UTF-8 BOM and CRLF formatting via `GET /api/institution/saved-scholars/export?format=csv` plus print-ready Academic Search Dossier report (`/institution/saved/dossier`).
- **Scholar Profile Analytics Dashboard**: High-velocity analytics engine (`/dashboard/analytics`, `scholar-analytics.ts`) featuring 4 KPI metrics, zero-bloat SVG/CSS 8-week engagement velocity chart, institutional keyword attribution table, tradition affinity demographics, and algorithmic recommendations.
- **Citation-Grounded AI Faculty Matcher**: Seminary provost search assistant (`/api/ai/match-faculty` & modal) combining Google Gemini LLM with an exhaustive deterministic theological heuristic baseline, generating fit scores (0-100%) and grounded citations across credentials, confessions, publications, and syllabi.
- **AI-Assisted CV & Syllabus Intelligence Engine**: Google Gemini generative AI extractor (`gemini-cv-extractor.ts`) tailored for theological academia (Chicago/SBL publication parsing, doctoral degrees, confessional affinities) and course syllabus analyzer (`gemini-syllabus-tagger.ts`) extracting course codes, levels, learning outcomes, required texts, and delivery modes.
- **Remote Staging & Production Verification Protocol**: Authoritative pre-flight deployment runbook (`docs/deployment/staging-verification-protocol.md`) establishing 5 non-negotiable gates.
- **Next.js 16 Proxy Convention Migration**: Replaced deprecated `middleware.ts` with canonical Next.js 16 `proxy.ts`.

Exit criteria:

- [x] Search committee dossiers can be exported to CSV or viewed in print-ready layout.
- [x] Scholars can inspect profile view and search engagement metrics with zero external charting bloat.
- [x] AI Faculty Matcher generates citation-grounded evaluations against academic portfolios.
- [x] CV and syllabus intelligence engines extract structured theological data with heuristic fallbacks.
- [x] Staging verification protocol published.
- [x] All 6 quality gates pass (`npm run verify` = 124 tests across 22 files, 25/25 tables RLS enforced, clean build).

## Phase 8: Platform Expansion & Authoritative Institutional Ecosystem (Completed)

Goal: Expand FaithFull Scholars into a dual-purpose institutional marketplace for faculty openings and authoritative institutional endorsements, backed by hardened database security, complete Playwright E2E testing, deployment pre-flight diagnostics, and refined typography and vector iconography.

Deliverables:

- **Institutional Accounts Dual-Purpose Expansion**:
  - **Academic Postings Marketplace** (`public.institution_postings`, `/opportunities`, `/opportunities/[slug]`): Seminaries and colleges publish adjunct calls, modular intensives, visiting fellowships, and full-time faculty appointments with confessional requirements, compensation terms, and direct scholar interest expressions (`/api/postings/[id]/express-interest`).
  - **Institutional Opportunities Management Portal** (`/institution/postings`, `postings-service.ts`): Seminary deans draft, edit, publish, fill, and archive openings.
  - **Authoritative Institutional Faculty Endorsements** (`public.institution_endorsements`, `/institution/endorsements`, `institutional-endorsement-service.ts`): Verified seminaries issue official institutional endorsements with relationship verification ('Current Faculty', 'Former Faculty', 'Visiting Scholar', etc.), displayed on scholar profiles with a distinctive gold institutional crest badge and clear distinction from peer colleague commendations.
- **Modern Sans Typography & Visual Polish**: Standardized modern typography on Aptos and Aptos Display with Plus Jakarta Sans fallback (`font-sans` and `font-display`) across all dashboard shells, inquiry management, and administrative tables, reserving literary serif strictly for historical confessions.
- **Refined Vector Iconography**: Replaced ASCII unicode glyphs with crisp, accessible inline SVG iconography across public nav, dashboard tabs, action buttons, and status indicators.
- **Database Security Hardening & Splinter Integration**: Added automated Splinter SQL security advisor check (`npm run audit:security`), resolved all foreign key unindexed warnings (Splinter 0001), pinned search paths (`SET search_path = public, pg_temp`) on all stored procedures (Splinter 0011), and enforced 100% RLS across all 28 tables.
- **End-to-End Testing Suite with Playwright**: Implemented browser journey test suite (`npm run test:e2e`) covering scholar directories, faceted filtering, profile views, inquiries, opportunities marketplace, and institution portals.
- **Deployment Pre-Flight Tooling & Pilot Fixtures**: Built automated pre-flight script (`npm run verify:deploy`) validating 15 deployment checks and client bundle secret leak scans, plus pilot cohort seed script (`npm run seed:pilot`) and automated cohort validator (`npm run verify:pilot`).
- **Topic Hubs for SEO & Taxonomy Navigation**: Created indexable `/disciplines` and `/traditions` hubs with Schema.org JSON-LD structured data for Google Search crawling and prospective student/dean discovery.

Exit criteria:

- [x] Opportunities directory `/opportunities` allows public discovery and type filtering for theological appointments.
- [x] Institution users can post, manage, and close faculty opportunities via `/institution/postings`.
- [x] Scholars can express interest in opportunities through authenticated interest submissions.
- [x] Seminaries can issue official institutional endorsements with relationship status via `/institution/endorsements`.
- [x] Scholar profiles prominently distinguish authoritative institutional endorsements from peer colleague commendations.
- [x] 100% PostgreSQL Row Level Security enforced across all 28 public tables.
- [x] Splinter security advisor passes with 0 findings across all 6 checks.
- [x] Playwright E2E browser tests pass cleanly across all primary user workflows.
- [x] Deployment pre-flight script verifies environment, database, taxonomy, faculty, and zero client secret leaks.
- [x] Full test suite passes: 134 vitest unit/integration tests across 25 suites, 9 Playwright E2E tests, clean Next.js 16 build.

## Phase 9: Theological Conference Speaker Directory & Institutional Speaking Bureau (Completed)

Goal: Expand FaithFull Scholars with a dedicated speaking bureau directory (`/speakers`) and public keynote topic showcase, enabling academic conference committees, seminary chapel coordinators, and pastoral pastors to discover and invite verified confessional scholars for keynotes, retreats, and lectures.

Deliverables:

- **Theological Speaking Bureau Directory** (`/speakers`, `speaker-service.ts`): Public searchable roster of approved faculty open to conference speaking and guest lecturing, with target audience filtering (`academic`, `pastoral`, `church_wide`, `undergraduate`).
- **Keynote & Lecture Topics Architecture** (`public.speaker_topics`, `SpeakerTopic`): Schema supporting topic titles, target audience categorization, descriptions, display ordering, and sample audio/video links (`sample_media_url`).
- **Profile Dossier Integration** (`<ScholarSpeakerTopicsCard />`, `/scholars/[slug]`): Distinctive speaking portfolio card highlighting travel reach, honorarium policies, keynote topics, and 1-click "Invite to Speak" structured inquiries.
- **Scholar Availability Configuration**: Dashboard manager (`/dashboard/availability`) allowing faculty to configure speaking bios, travel radius, honorarium policies, and lecture topics.
- **Data Layer Security & RLS**: 100% forced Row Level Security on `public.speaker_topics` table (6 policies, 3 covering indexes, `public.set_updated_at()` trigger).
- **Comprehensive Quality Gates**: 151 vitest tests across 27 suites, 12 Playwright E2E tests across 5 suites, 29/29 tables with 100% RLS coverage, and 16 deployment pre-flight verification checks.

Exit criteria:

- [x] Speaking bureau directory `/speakers` allows public discovery and audience filtering.
- [x] Keynote topics render on scholar dossiers with sample media recordings and audience badges.
- [x] 1-Click "Invite to Speak" triggers pre-configured structured inquiry modal.
- [x] 100% PostgreSQL Row Level Security enforced across all 29 public tables.
- [x] Pre-flight deployment script verifies all 16 checks and 29 tables.

## Phase 10: Tiered Institutional Subscriptions & Booking Contracts Workflow (Completed)

Goal: Implement tiered institutional memberships with automated inquiry and search committee quota enforcement (ADR 0010), plus a structured academic engagement contract and milestone management system (ADR 0011) connecting institutional outreach to signed agreements and honorarium tracking.

Deliverables:

- **Tiered Institutional Subscriptions** (`public.institution_subscriptions`, `/institution/subscription`, `subscription-service.ts`): Three membership tiers (Basic, Verified Seminary, Premier Partner) with automated monthly inquiry tracking, search committee seat allowances, candidate shortlist exports, and tier upgrade actions.
- **Institutional Engagement Contracts** (`public.institution_contracts`, `/institution/contracts`, `/institution/contracts/[id]`, `contract-service.ts`): Formal agreements for adjunct teaching, modular intensives, guest lectures, curriculum reviews, and keynote speaking with total compensation and payment terms.
- **Contract Deliverables & Milestones** (`public.contract_milestones`): Scheduled deliverable tracking (due dates, milestone disbursements, submission and verification).
- **Scholar Workspace Contracts Inbox** (`/dashboard/contracts`): Faculty agreement review, terms inspection, and accept/decline responses.
- **Data Layer Security & RLS**: 100% forced Row Level Security across 32 tables with 110 active policies and 0 Splinter security advisor findings.
- **Comprehensive Quality Gates**: 158 vitest tests across 30 suites, 15 Playwright E2E tests across 6 suites, and 16 deployment pre-flight verification checks.

Exit criteria:

- [x] Institutional subscription dashboard displays live quota consumption and tier benefits.
- [x] Deans can draft, send, and track faculty engagement agreements with milestone deliverables.
- [x] Scholars can review and accept engagement contracts directly in their workspace.
- [x] 100% PostgreSQL Row Level Security enforced across all 32 public tables.
- [x] Splinter security advisor passes with 0 findings across all checks.
- [x] Playwright E2E tests pass cleanly across 15 browser tests.
- [x] Remaining backlog items (Course Licensing, Credential Verification, Consortia, Premium Profiles) cataloged for follow-up.

## Pilot Recommendation

Pilot with:

- 20 to 40 scholars.
- 3 to 7 theological institutions.
- 6 to 10 disciplines.
- Public profiles with at least one course or media item per scholar.
- Inquiry tracking focused on adjunct, guest lecture, and course review opportunities.
