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
- [ADR 0009: Theological Conference Speaker Directory & Institutional Speaking Bureau](docs/adr/0009-theological-speaker-directory-and-speaking-bureau.md)
- [ADR 0010: Tiered Institutional Subscriptions & Quota Enforcement](docs/adr/0010-tiered-institutional-subscriptions.md)
- [ADR 0011: Institutional Engagement Contracts & Milestone Workflow](docs/adr/0011-institutional-engagement-contracts.md)
- [ADR 0012: Seminary Consortia & Multi-Campus System Accounts](docs/adr/0012-seminary-consortium-and-multi-campus-accounts.md)
- [ADR 0013: Course Licensing & Syllabus Distribution Agreements](docs/adr/0013-course-licensing-and-syllabus-distribution.md)
- [ADR 0014: Premium Scholar Profiles & Distinguished Faculty Dossiers](docs/adr/0014-premium-scholar-profiles-and-distinguished-faculty-dossiers.md)
- [ADR 0015: Board of Trustees Executive Search Committee Docket Generator](docs/adr/0015-board-of-trustees-search-committee-docket-generator.md)
- [ADR 0016: Confessional Lens Doctrinal Alignment Matrix](docs/adr/0016-confessional-lens-doctrinal-fit-matrix.md)
- [ADR 0017: SabbaticalSwap Visiting Scholar & Sabbatical Exchange Network](docs/adr/0017-sabbatical-swap-visiting-scholar-exchange-network.md)
- [ADR 0018: Doctoral Dissertation Supervision & External Reader Exchange](docs/adr/0018-doctoral-dissertation-supervision-and-external-reader-exchange.md)
- [ADR 0019: ATS/ABHE Accreditation Self-Study Faculty Credentials Matrix](docs/adr/0019-ats-abhe-accreditation-self-study-faculty-credentials-matrix.md)
- [ADR 0020: Confessional Common Application & Search Committee Applicant Matrix](docs/adr/0020-confessional-common-application-and-applicant-matrix.md)
- [ADR 0021: Theological Guild Annual Conference (ETS/SBL/EPS) Mobile Interview & Presentation Hub](docs/adr/0021-theological-guild-annual-conference-interview-hub.md)
- [ADR 0022: Session-Derived Identity, Page-Level Guards, and RLS Helper Isolation](docs/adr/0022-session-derived-identity-and-rls-helper-isolation.md)
- [ADR 0023: Trust Guards Phase 2 and the Policy Matrix as the Write Contract](docs/adr/0023-trust-guards-phase2-and-policy-matrix.md)
- [ADR 0025: Review-Gated Profile Content and Relational Promotion](docs/adr/0025-review-gated-profile-content.md)

## Current Status & Verification

> **Security note (2026-10-05, ADR 0022, Council Review 12):** An authorization review found and fixed several issues. Self-signup could take over an existing institution. Admin pages could leak data through the RSC payload. Shortlists and applicant files were reachable anonymously outside production. Admin roles could be self-assigned through `user_metadata`, and any signed-in user could set `accounts.role = 'admin'` or approve their own scholar profile or institution through PostgREST. Fixes: session-derived identity, page-level guards, and trust-column guard triggers on `accounts`, `scholars`, `institutions`, and `inquiries`. The triggers fail closed, and only the recipient scholar can reopen an accepted or declined inquiry. The `/auth/callback` open redirect is also fixed (`next` must be a same-origin relative path). Earlier "tables RLS enforced" figures verified that policies *exist*; `audit:rls` and `audit:security` still passed on deliberately vulnerable probe databases. `tests/integration/rls-authenticated.test.ts` is the first suite verifying policies *work* for real signed-in roles, and it fails on those probes. **Phase 2 (ADR 0023):** the same guards now cover subscriptions, contracts, milestones, course licensing, endorsements and consortiums, and a policy-matrix CI gate (`tests/integration/policy-matrix.json`) fails on any undeclared column write.

> **Known-broken and demo-only features (Council Review 12, 2026-10-05).** The feature descriptions below record what was built. They are not all working end to end.
> - **Scholar express-interest / 1-click Common Application:** always fails under RLS (scholars cannot insert `inquiries`). The **applicant matrix** therefore has no real applicants.
> - **Conference interview hub** (`/institution/conferences`): in-memory demo data; nothing persists.
> - **AI Faculty Matcher:** prepends three fictional seed candidates to every result, in all environments (fix scheduled in the hygiene PR).
> - **`/institution/saved`, `/institution` and `/dashboard` metrics:** partly hard-coded fixtures.
> - **Institution invitations:** none. Institution self-signup only creates a new pending institution.
> - **Subscription plan changes** are staff-managed until billing exists (ADR 0023); the upgrade button now says so instead of upgrading for free.
> - **Rate limiting** is in-memory and per instance.

- **Current Position:** Phases 0 through 18 are built, but "verified" below means the automated gates pass, not that every feature works against live data (see the box above). Latest verified run: CI `37360500352` on `fix/authz-lockdown-v2` (PR #47) was green with 55/55 test files, both authorization migrations applied, and `audit:rls` and `audit:security` passing. Earlier counts in this README (261 vitest tests across 50 suites, 35/35 tables with 123 policies, 43 Playwright tests, 22 deployment pre-flight checks) predate this work and were not re-measured; treat them as historical. Production launch readiness was rated low by Council 12 (scholar self-service, express-interest, invitations, live data, persistent rate limiter, GDPR/encryption are outstanding).
- **Theological Guild Annual Conference (ETS/SBL/EPS) Mobile Interview & Presentation Hub (ADR 0021 / Phase 18)** *(demo only: in-memory data, nothing persists)*:
  - **Convention Suite Workflow:** Search committees and deans coordinate on-site 30-minute interview booking, candidate presentation schedules, and confidential search committee rubrics at ETS, SBL/AAR, and EPS annual meetings (`/institution/conferences`).
  - **Conference Presentation Badges:** Badges on verified scholar dossiers displaying upcoming paper titles, conference tracks, session locations, and presentation dates (`components/conferences/conference-presentation-badge.tsx`).
  - **Confidential Deliberation Rubric:** 4-dimension evaluation rubric (Academic Rigor, Confessional Articulation, Pedagogical Warmth, Institutional Alignment) with score tracking and private notes.
  - **Shell & Print Hardening:** Added `print:hidden` across all navigation shells (`PublicNav`, `PublicFooter`, `InstitutionNav`, `AdminNav`) to guarantee clean physical dossiers; active link indicators on `PublicNav`; modal dialog accessibility (`role="dialog"`, `aria-modal={true}`, `aria-labelledby`).
- **Confessional Common Application & Search Committee Applicant Matrix (ADR 0020 / Phase 17)** *(known-broken: express-interest fails under RLS, so the matrix has no real applicants)*:
  - **1-Click Common Application Interest Expression:** Scholars apply to theological faculty opportunities directly using their verified profile dossier, eliminating redundant CV and doctrinal statement re-submission.
  - **Search Committee Candidate Matrix:** Comprehensive triage table (`/institution/postings/[id]/applicants`) providing search committees with candidate KPI cards (Total Applicants, Terminal Doctorate Ratio per ATS Standard 3, Avg Confessional Fit), candidate status workflows (Under Review, Shortlisted, Interviewing, Offer Extended, Archived), candidate dossier modal, print-optimized formatting, and RFC-4180 CSV export.
  - **Security & Shell Hardening:** API authorization on `/api/institution/saved-scholars`, `/api/institution/saved-courses`, and `/api/inquiries/[id]` was rebuilt in ADR 0022 on session identity and RLS-scoped clients (the earlier version accepted anonymous institution IDs outside production); added dynamic scholar sub-nav `<ScholarDashboardNav />` and print-hiding across institutional layouts.
- **Premium Scholar Profiles & Distinguished Faculty Dossiers (ADR 0014 / Phase 13):**
  - **Distinguished Faculty Fellow Honorific:** Peer-recognized credential seal (`<DistinguishedBadge />`) with tamper-proof PostgreSQL anti-privilege escalation trigger `prevent_scholar_tier_escalation` guaranteeing only platform administrators can elevate scholar tiers.
  - **Board-Ready Print Candidate Dossier:** Dedicated ATS and search committee printable candidate dossier (`/scholars/[slug]/dossier`) with print-optimized CSS, hiding screen navigation, and page break rules.
  - **SBL 2nd Ed. & Chicago 17th Ed. Citation Engine:** Automated academic bibliography formatter for monographs, edited volumes, journal articles, and book chapters.
  - **Verified Academic Identifiers:** ORCID ID validation with auto-linking to `https://orcid.org/<id>` and Google Scholar profile linking.
  - **Faculty Media & Lecture Showcase:** Zero-CLS click-to-play media facade component (`<ScholarMediaShowcase />`) with poster preview, strictly no-autoplay embed player, and scholar workspace media management portal (`/dashboard/media`).
  - **Strict Search Neutrality Invariant:** `profile_tier` is strictly an honorific credential seal and never skews search directory ranking or AI Faculty Matcher weights.
- **Course Licensing, Syllabus Distribution Agreements & ATS/ABHE Accreditation Badges (ADR 0013 / Phase 12):**
  - **Course Licensing & Curriculum Sharing:** Comprehensive licensing management workspace (`/institution/licensing`, `/dashboard/licensing`, `public.course_licensing_agreements`) enabling institutions to license complete syllabi, reading lists, and modular curriculum units directly from verified theological scholars under formal royalty agreements (85% scholar / 15% platform split).
  - **Syllabus Distribution Modals:** Interactive licensing request dialog (`CourseLicensingModal`) integrated into public course catalog dossiers (`/courses/[slug]`) with academic year/semester terms, permitted student headcounts, and custom institutional covenants.
  - **Authoritative Accreditation Badges:** Formal verification indicators (`<AccreditationBadge />`) reflecting ATS (Association of Theological Schools), ABHE, TRACS, and regional accreditation on institutional dossiers and postings.
  - **Data Layer Isolation:** 100% RLS compliance on `course_licensing_agreements` (6 policies, 5 covering indexes, search-path-pinned update triggers).
- **Tiered Institutional Subscriptions & Booking Contracts (ADR 0010 & ADR 0011):**
  - **Tiered Institutional Subscriptions:** Automated quota meters and membership management (`/institution/subscription`, `public.institution_subscriptions`) supporting Basic, Verified Seminary, and Premier Partner tiers with monthly inquiry caps and search committee seats.
  - **Academic Engagement Contracts:** End-to-end contract drafting, terms inspection, and milestone tracking (`/institution/contracts`, `/dashboard/contracts`, `public.institution_contracts`, `public.contract_milestones`) for adjunct appointments, modular intensives, curriculum reviews, and speaking honorariums.
- **Seminary Consortia & Multi-Campus System Accounts (ADR 0012):**
  - **Federated Theological Networks:** System accounts (`public.consortiums`, `public.consortium_members`) enabling multi-campus seminaries (e.g. RTS 6-campus system) and regional federations (ARTS, BTI, ACTS) to share candidate pools, cross-register adjunct faculty, and pool recruitment pipelines.
  - **Dean Workspace:** Dedicated collaborative hub (`/institution/consortium`) displaying system leadership, sister campuses, and direct candidate discovery links.
  - **Security & Authorization:** 7 PostgreSQL RLS policies, covering indexes on foreign keys, and an AI Matcher (`POST /api/ai/match-faculty`) requiring authenticated institution roles and active paid subscription tiers. Consortium tables are guarded (ADR 0023): only approved institutions found consortiums, and invitations start pending.
- **Theological Conference Speaker Directory & Institutional Speaking Bureau (ADR 0009):**
  - **Speaking Bureau Directory:** Dedicated public speaking bureau (`/speakers`) featuring verified faculty, keynote topics, target audience chips (`academic`, `pastoral`, `church_wide`, `undergraduate`), and real-time search.
  - **Keynote Topic Showcases:** Canonical lecture and address listings with target audience categorization, descriptions, display ordering, and sample recording media links (`sample_media_url`).
  - **Profile Dossier Speaking Card:** `<ScholarSpeakerTopicsCard />` integration on `/scholars/[slug]` surfacing speaking biographies, geographic travel reach, honorarium policy badges, and 1-click "Invite to Speak" structured inquiry modals (`StructuredInquiryModal`).
  - **Scholar Dashboard Speaking Bureau Manager:** Direct control over speaking availability, reach, honorarium preferences, and keynote topics in `/dashboard/availability`.
  - **Data Layer Isolation:** 100% RLS coverage on `public.speaker_topics` table (6 policies, 3 covering indexes, automatic `public.set_updated_at()` trigger).
- **Institutional Accounts Dual-Purpose Expansion:**
  - **Academic Opportunities & Teaching Calls Portal:** Dedicated public directory (`/opportunities`, `/opportunities/[slug]`) and institution posting management workspace (`/institution/postings`, `/institution/postings/new`) for adjunct calls, modular intensives, sabbatical replacements, and full-time faculty chairs, complete with `JobPosting` Schema.org JSON-LD structured data and 1-click scholar dossier submission.
  - **Authoritative Institutional Endorsements:** Official institutional endorsements (`/institution/endorsements`, `components/scholars/scholar-endorsements-card.tsx`) featuring the Gold/Amber Institutional Shield, accredited seminary branding, verified credential badge, and official seal, distinguished from peer-to-peer scholar recommendations.
- **Deployment Pre-Flight Tooling (`verify:deploy`):** Automated pre-flight script (`scripts/verify-deployment.ts`) validating environment secrets, PostgreSQL connectivity, 100% RLS enforcement across all 35 public tables, 123 active security policies, pilot seed readiness, speaking bureau topics, and scanning static production bundles (`.next/static/`) to mathematically verify zero sensitive server credentials leak into client chunks.
- **Public SEO Topic Hubs & Schema.org JSON-LD:**
  - Dedicated landing hubs for theological disciplines (`/disciplines`, `/disciplines/[slug]`) and historic confessional traditions (`/traditions`, `/traditions/[slug]`).
  - Search-engine crawlable taxonomy with rich Schema.org JSON-LD structured metadata (`BreadcrumbList`, `CollectionPage`, `ItemList`, `Person`, `EducationalOrganization`) dynamically injected for organic search visibility.
- **Playwright End-to-End Browser Automation Suite:** Full browser automation (`@playwright/test`, `playwright.config.ts`, `tests/e2e/`, `npm run test:e2e`) running headless Chromium across all 36 critical user journeys: public discovery, academic opportunities, scholar dossier credentials, confessional alignment, commendation modals, topic hubs, institutional portals, conference speaking bureau discovery, contracts inbox, subscriptions, seminary consortia, course licensing, and bilingual translation.
- **Peer Endorsements & Faculty Commendations System (§21):** Verified colleague attestations (`scholar_endorsements` table, 6 RLS policies, 3 covering indexes) supporting relationships (Supervisor, Colleague, Collaborator, Co-Author, Peer), authenticated commendation modal (`EndorseColleagueModal`), dossier display card (`ScholarEndorsementsCard`), and REST API (`/api/scholars/[id]/endorsements`).
- **Database Security Hardening & Splinter Advisor Compliance:**
  - Audited and hardened PostgreSQL database using official Supabase Security Advisor ([Splinter](https://github.com/supabase/splinter)) checks and catalog audits.
  - **Eliminated User Metadata Tampering Risk:** Replaced vulnerable `auth.jwt() -> 'user_metadata' ->> ...` lookups in RLS policies with authenticated identity references (`auth.uid()`), preventing privilege escalation or role spoofing.
  - **Function Search Path Hardening:** Explicitly pinned `search_path = public, pg_temp` across all stored functions and triggers (`handle_updated_at`, `record_search_query`, `is_admin`, `get_current_scholar_id`, `is_institution_user`), eliminating mutable search path injection vulnerabilities.
  - **Restricted Permissive Insert Policies:** Fixed `inquiries` policy to enforce target scholar existence checks rather than raw permissive true bypasses.
  - **Auth RLS InitPlan Optimization:** Converted all `auth.uid()` calls in RLS policies across 16 policies to scalar subqueries `(select auth.uid())`, allowing PostgreSQL to evaluate auth tokens once per query (InitPlan) instead of per row.
  - **Covering Indexes for Foreign Keys:** Added indexes for all unindexed foreign key relationships across joined tables (`scholar_disciplines`, `scholar_traditions`, `scholar_confessions`, `scholar_endorsements`, `speaker_topics`, `institution_postings`, `institution_endorsements`, `inquiries`, `saved_scholars`, `saved_courses`, `consortium_members`, `course_licensing_agreements`, etc.), eliminating sequential scans during cascade operations.
  - **Defense-in-Depth RLS Enforcement:** Enabled `FORCE ROW LEVEL SECURITY` across all 35 public application tables.
  - **Automated Security Gate:** Created `scripts/audit-security.ts` (`npm run audit:security`), fully integrated into `npm run verify` and GitHub Actions CI.
- **Modern Edge Vector Iconography Overhaul (`lucide-react`):** Purged all dated unicode emojis and legacy glyphs across 43+ UI files in favor of sharp, purposeful vector SVG icons from `lucide-react`. Standardized stroke weights (`1.75-2px`), subtle micro-container icon boxes, and polished hover interactions matching Linear, Raycast, and Stripe design standards.
- **Clean Modern Sans & Aptos Typography Revamp:** Modernized typography across all layouts, dashboards, cards, headers, and navigation menus, eliminating dated browser default serifs in favor of **Aptos** and **Aptos Display** with `Plus_Jakarta_Sans` geometric fallback. Introduced `.card-crisp` micro-elevation and subtle border contrast, reserving fine literary serif typography (`.font-literary`) strictly for long-form doctrinal affirmations.
- **Dean & Search Committee Shortlist Export (§21):** RFC-4180 CSV export with UTF-8 BOM (`\uFEFF`) and CRLF formatting via `GET /api/institution/saved-scholars/export?format=csv` plus print-ready Academic Search Dossier report (`/institution/saved/dossier`).
- **Scholar Profile Analytics Dashboard (§21):** High-velocity scholar analytics engine (`/dashboard/analytics`) featuring 4 KPI metrics, zero-bloat SVG/CSS 8-week engagement velocity chart, institutional keyword attribution table, tradition affinity demographics, and algorithmic recommendations.
- **Citation-Grounded AI Faculty Matcher (§21)** *(currently prepends three fictional seed candidates in all environments; fix pending)*: Seminary provost search assistant (`/api/ai/match-faculty` & modal) combining Google Gemini LLM with an exhaustive deterministic theological heuristic baseline, generating fit scores (0-100%) and grounded citations across credentials, confessions, publications, and syllabi.
- **Remote Staging & Production Verification Protocol (Step 3):** Authoritative pre-flight deployment runbook (`docs/deployment/staging-verification-protocol.md`) establishing five non-negotiable gates: Supabase migration sync, remote multi-tenant RLS audit (100% pass across 35 tables), reference cohort population (`seed:pilot`), pilot readiness diagnostic (`verify:pilot`), and Vercel edge runtime smoke testing with strict security headers.
- **AI-Assisted CV & Syllabus Intelligence Engine (Step 2):** Google Gemini generative AI extractor (`lib/ai/gemini-cv-extractor.ts`) tailored for theological academia (Chicago/SBL publication parsing, doctoral degrees, confessional affinities) and course syllabus analyzer (`lib/ai/gemini-syllabus-tagger.ts`) extracting course codes, levels, learning outcomes, required primary texts, and delivery modes, paired with high-accuracy heuristic baseline fallbacks.
- **Production Edge Security Headers (Phase 6):** Strict HTTP security headers configured in `next.config.ts` including CSP with YouTube/Unsplash/Supabase whitelisting, HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Comprehensive E2E User Journeys (Phase 6):** Automated integration test suite (`tests/integration/e2e-user-journeys.test.ts`) covering all 4 core personas: scholar onboarding & revision staging, admin triage & snapshot promotion, public discovery & anti-scraping gating, and institutional outreach & shortlist lifecycle.
- **Pilot Reference Cohort:** 5 fully populated, approved reference scholars across Reformed, Baptist, Anglican, and Presbyterian traditions (Dr. Calvin Edwards, Dr. Sarah MacArthur, Dr. Thomas Cranmer-Davies, Dr. Marcus Aurelius Vance, Dr. Elizabeth Montgomery-Knox) with complete doctoral credentials, publications, course showcases, availability profiles, and canonical speaking bureau topics. All 12 diagnostic categories report 100% `PASS` via `npm run verify:pilot`.
- **Release Readiness Checklist & Pilot Diagnostic:** Production deployment checklist published in [`docs/deployment/release-readiness-checklist.md`](docs/deployment/release-readiness-checklist.md) and automated pilot readiness validator (`npm run verify:pilot`).
- **Data Isolation & Row Level Security:** 100% RLS compliance across all 35 PostgreSQL tables in the public schema (`consortiums`, `consortium_members`, `course_licensing_agreements`, `institution_subscriptions`, `institution_contracts`, `contract_milestones`, `speaker_topics`, `institution_postings`, `institution_endorsements`, `scholar_endorsements`, `search_rate_limits`, `scholars`, `courses`, `inquiries`, `saved_scholars`, `saved_courses`, `scholar_profile_revisions`, `profile_reviews`, etc.) with 123 active RLS security policies.
- **Institution Inquiry & Shortlist Workflows (Phase 5):** Structured outreach modal on public profiles, scholar inquiry inbox (`/dashboard/inquiries`), institution portal (`/institution`, `/institution/inquiries`, `/institution/postings`, `/institution/endorsements`, `/institution/saved`, `/institution/profile`), bookmarked candidate shortlists and saved courses, 10 inquiries/hr rate limiting, and transactional notification email abstraction.
- **Admin Review & Trust Governance (ADR 0003, ADR 0005):** Administrative review queue (`/admin/reviews`) with side-by-side visual diff inspector comparing live published snapshots with submitted revision proposals, decision panel supporting Approve (promoting revisions to published snapshots), Request Changes, Reject, and Hide actions, immutable review audit trail in `profile_reviews`, institution verification queue (`/admin/institutions`), and reported content moderation (`/admin/reports`).
- **Revision Staging Model (ADR 0005, ADR 0024):** Scholars save profile drafts as persisted revisions (draft, submit, withdraw, changes requested), reviewed atomically by admins; approval publishes the scalar fields and, in the same transaction, replaces the credentials, publications, disciplines, traditions and confessions present in the snapshot (ADR 0025). Profile content is review-gated in the database: a scholar can no longer edit live content or those lists directly. Unmatched taxonomy entries block approval (422). Migration `20261007090000` is pending review and the ADR 0025 deploy preflight.
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
  Runs all quality gates: `version:check`, `lint` (0 errors), `typecheck` (0 errors), `test` (55 test files in the latest CI run), `audit:rls` (policy existence, 35 tables as of the last count), `audit:security` (Splinter security advisor), Next.js Turbopack `build`, `verify:deploy` (22 checks as last counted), and Playwright E2E browser tests (43 tests as last counted). `audit:rls` and `audit:security` check that policies exist, not what they permit; `tests/integration/rls-authenticated.test.ts` covers behaviour.

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
