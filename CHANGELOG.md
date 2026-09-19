# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **CI / Supabase Local Stack & Test Environment Fix**:
  - Adopted official `supabase/setup-cli@v1` in GitHub Actions CI to spin up the complete local Supabase stack (`supabase start`) matching local development configuration, including PostgreSQL, PostgREST API, Auth, and automatic migration/seeding.
  - Provided explicit `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the `unit-tests` job step.
  - Upgraded GitHub Actions runners to Node.js 24 (`node-version: '24'`) across lint, typecheck, unit-tests, and build jobs to resolve deprecation warnings and package engine requirements.
  - Isolated test session IDs and fingerprints dynamically in `tests/integration/triage.test.ts` to prevent rate-limit collisions across consecutive test executions.
  - Added `scripts/ci-bootstrap-db.sql` utility for standalone PostgreSQL bootstrap.

### Added
- **Phase 5: Institution Inquiry & Shortlist Workflows (ADR 0008)**:
  - Implemented structured academic outreach modal (`components/inquiries/structured-inquiry-modal.tsx`) accessible directly from scholar profiles and course showcase items.
  - Built candidate shortlisting and course bookmarking systems (`components/inquiries/shortlist-button.tsx`, `saved_scholars`, `saved_courses`) with persistence and visual toggle feedback.
  - Implemented Scholar Inquiry Inbox (`app/dashboard/inquiries/page.tsx`, `components/inquiries/scholar-inquiry-inbox.tsx`) supporting inquiry review, acceptance, declining, and archiving.
  - Built comprehensive Institution Portal shell and pages: Overview Dashboard (`app/(institution)/institution/page.tsx`), Sent Inquiries Outbox (`app/(institution)/institution/inquiries/page.tsx`), Saved Scholars & Courses (`app/(institution)/institution/saved/page.tsx`), and Institution Profile & Accreditation (`app/(institution)/institution/profile/page.tsx`).
  - Added anti-spam rate limiting (`lib/inquiries/rate-limiter.ts`) enforcing maximum 10 inquiries/hr per institution.
  - Created transactional email notification service abstraction (`lib/notifications/email-service.ts`) dispatching structured outreach alerts to scholars and decision responses back to institutions.
  - Implemented REST API endpoints (`/api/inquiries`, `/api/inquiries/[id]`, `/api/institution/saved-scholars`, `/api/institution/saved-courses`).
  - Added full Spanish translation keys (`inquiry.*` and `institution.*`) with 100% key parity.
  - Added unit test suite (`tests/unit/inquiry-validation.test.ts`) and database integration test suite (`tests/integration/institution-inquiry.test.ts`) covering outreach, anti-spam, status transitions, shortlists, and dashboard metrics (17 suites, 89/89 tests passing).
- **Phase 4: Admin Review, Visual Diff Inspector & Trust Governance (ADR 0003 & ADR 0005)**:
  - Built unified administrative workspace layout (`app/(admin)/admin/layout.tsx`) and persistent navigation (`components/admin/admin-nav.tsx`) with staff authentication enforcement.
  - Implemented Profile Review Queue (`app/(admin)/admin/reviews/page.tsx`) triaging submitted profile revisions with status filters (`all`, `submitted`, `changes_requested`, `approved`).
  - Created side-by-side Visual Diff Inspector (`components/admin/revision-diff-viewer.tsx`) comparing published live baseline against submitted revisions across academic identity, bio, personal doctrinal statement, historic confessional adherence, disciplines, traditions, credentials, and scholarly publications.
  - Built Editorial Decision Action Panel (`components/admin/review-action-panel.tsx`) with *Approve & Publish Live*, *Request Changes*, *Reject*, and *Hide from Public Listing* actions, structured feedback notes, and chronological audit history from `profile_reviews`.
  - Implemented revision detail review page (`app/(admin)/admin/reviews/[id]/page.tsx`).
  - Implemented Institution Verification Queue (`app/(admin)/admin/institutions/page.tsx`) and action controls for accredited seminaries and colleges.
  - Implemented Community Content Report Queue (`app/(admin)/admin/reports/page.tsx`) with investigation and resolution workflows.
  - Built secure Admin REST API routes (`/api/admin/reviews`, `/api/admin/reviews/[id]`, `/api/admin/institutions/[id]`, `/api/admin/reports/[id]`).
  - Created unit test suite (`tests/unit/admin-diff.test.ts`) and database integration test suite (`tests/integration/admin-review.test.ts`) covering review decisions, audit logging, and live published snapshot promotion (76/76 tests passing).
- **Phase 3: Scholar Dashboard & Revision Staging (ADR 0005)**:
  - Implemented scholar workspace shell (`app/dashboard/layout.tsx`) and overview dashboard (`app/dashboard/page.tsx`) with staged revision indicator banner and key portfolio metrics.
  - Built comprehensive profile editor (`app/dashboard/profile/page.tsx`, `components/forms/scholar-profile-form.tsx`) calculating live diffs against published baseline snapshot.
  - Implemented doctrinal statement editor (`components/forms/doctrinal-statement-form.tsx`) with word counter, formatting guide, and baseline evangelical statement helper.
  - Implemented historic confessional standards selector (`components/forms/confessional-standards-selector.tsx`) for Westminster, 1689 London Baptist, Nicene, 39 Articles, etc. with adherence levels and exception notes.
  - Implemented course & syllabi manager (`app/dashboard/courses/page.tsx`) with modal creation form, syllabus previews, delivery mode tags, and video lecture preview link support.
  - Implemented teaching availability & opportunities manager (`app/dashboard/availability/page.tsx`) with opportunity types, preferred delivery modes, and target academic terms.
  - Implemented LinkedIn-style draft preview (`app/dashboard/preview/page.tsx`) reusing canonical profile hero and doctrinal card components with draft staging watermark and submit-for-review action.
  - Added integration test suite (`tests/integration/scholar-dashboard.test.ts`) covering snapshot merging, diff engine accuracy, and input bounds validation.
- **Task 3.0: Assisted CV Ingestion & Onboarding Wizard**:
  - Implemented CV parsing engine (`lib/profiles/cv-parser.ts`) extracting degrees, awarding institutions, graduation years, publication records, and inferring theological disciplines and traditions.
  - Built interactive drag-and-drop CV upload dropzone (`components/forms/cv-upload-parser.tsx`) with paste support, instant sample loader, and confidence indicators.
  - Built multi-step onboarding wizard (`app/dashboard/onboarding/page.tsx`) guiding newly registered scholars smoothly from CV upload to profile staging.
  - Added unit test suite (`tests/unit/cv-parser.test.ts`) validating empty inputs, malformed text, and full theological CV parsing.
- **Platform Language Translation Pipeline (Spanish `es` Localization)**:
  - Built platform i18n architecture with `I18nProvider` context and `useTranslation` hook (`lib/i18n/i18n-context.tsx`) with localStorage persistence and SSR-safe lazy initialization.
  - Created complete bilingual theological message catalogs (`lib/i18n/messages/en.json`, `lib/i18n/messages/es.json`) translating navigation, discovery, badges, taxonomies, and dashboard actions.
  - Added universal language switcher component (`components/shell/language-switcher.tsx`) into persistent top navigation (`components/shell/public-nav.tsx`).
  - Added unit test suite (`tests/unit/translation.test.ts`) verifying 100% key parity and non-empty translation values between English and Spanish.
- **Milestone 2.5: LinkedIn-Grade UI/UX, Universal App Bar, 3-Column Directory & Search Rate Limiting**:
  - Implemented persistent LinkedIn-style universal top bar (`components/shell/public-nav.tsx`) with embedded universal search bar (`components/shell/universal-search-bar.tsx`), keyboard shortcut `/`, quick academic terms, and "Me" user menu (`components/shell/user-menu.tsx`).
  - Implemented LinkedIn-style scholar profile hero (`components/scholars/scholar-profile-hero.tsx`) with academic banner, overlapping 120px avatar, verified badge, headline, and action toolbar (*Inquire*, *Shortlist*, *Share*).
  - Implemented LinkedIn 3-column desktop layout (`app/scholars/page.tsx`) with Left Rail (sticky facet filters), Center Feed (search cards & anonymous pagination wall at page > 3), and Right Rail (`components/scholars/scholar-recommendations-rail.tsx`).
  - Added doctrinal card component (`components/scholars/scholar-doctrinal-card.tsx`) highlighting faith statement and affirmed confessional standards.
  - Implemented token-bucket search rate limiting (`lib/search/rate-limiter.ts`) backed by PostgreSQL table `search_rate_limits` with atomic RPC `check_search_rate_limit` (migration `20260919110000_search_rate_limits.sql`).
  - Added search query input sanitization (`lib/search/sanitize.ts`) protecting against SQL LIKE wildcard injection, regex abuse, and oversized payloads.
  - Verified 100% RLS enforcement across all 25 public tables (`scripts/audit-rls.ts`) and 10 test suites (58/58 tests passing).
- **Council Review Round 2: LinkedIn-Grade UI/UX, Data Protection & Search Abuse Gating**:
  - Enacted [ADR 0007](docs/adr/0007-linkedin-ux-and-academic-network-design-system.md) defining the LinkedIn-grade academic network design system: persistent universal top app bar, 3-column desktop layout, cover banners, overlapping avatars, headline credentials, and modular profile cards.
  - Enacted [ADR 0008](docs/adr/0008-search-abuse-gating-anti-scraping-and-pii-protection.md) establishing search abuse defense: distributed token-bucket rate limiter, 3-page anonymous discovery cap, input sanitization, PII segregation, and signed storage URLs.
  - Published Council Review 2 reports and synthesis (`docs/reviews/2026-09-19-council-review-2-*.md`).
  - Sequenced implementation prompts in `docs/reviews/2026-09-19-council-review-2-synthesis.md` for Prompt A (Search Gating & Rate Limiting), Prompt B (Universal App Bar & Shell), and Prompt C (LinkedIn-Style Profile & 3-Column Directory).
- **Phase 2: Public Discovery (Theological Scholar Directory & Course Showcase)**:
  - Public Faculty Directory (`/scholars`) featuring responsive multi-criteria filtering by keyword search, theological discipline, tradition, historic confessional affirmation, and adjunct availability.
  - Canonical Public Scholar Profile (`/scholars/[slug]`) rendering complete academic portfolio: terminal credentials, scholarly publications, syllabi showcases, personal doctrinal statement, affirmed confessional standards with adherence levels/exceptions, and institutional inquiry action.
  - Public Course Showcase Catalog (`/courses`) and detailed syllabus view (`/courses/[slug]`) displaying modular structure, available delivery formats (online synchronous, async, modular intensives), and instructor links.
  - Shared public shell header (`components/shell/public-nav.tsx`) and footer (`components/shell/public-footer.tsx`) unified across the homepage, faculty directory, and course catalog.
  - Server-side public domain loaders (`lib/domain/queries.ts`) enforcing strict draft isolation (only `profile_status = 'approved'` and `visibility = 'public'` exposed).
  - Test suites: Unit test suite (`tests/unit/public-queries.test.ts`) and full integration test suite (`tests/integration/public-discovery.test.ts`) verifying search filters, taxonomy formatting, and draft privacy against PostgreSQL and Supabase.
- **Phase 1: Domain Foundation (Theological Scholar Network Schema & Data Layer)**:
  - 22 core domain tables in PostgreSQL (`supabase/migrations/20260919100000_domain_foundation.sql`) for scholars, credentials, publications, courses, availability, institutions, and inquiries.
  - Decoupled draft and published revision staging model ([ADR 0005](docs/adr/0005-draft-published-profile-revisions.md)) via `scholar_profile_revisions`.
  - Historic theological confessional standards taxonomy (`confessional_standards`, `scholar_confessions`) covering Westminster, 1689 London Baptist, Nicene, Heidelberg, Augsburg, and 39 Articles.
  - 100% Row Level Security (RLS) enforcement on all 24 public tables (`supabase/migrations/20260919100100_domain_rls_policies.sql`).
  - Comprehensive theological seed data (`supabase/seed.sql`) with real disciplines, traditions, institutions, and scholars.
  - TypeScript domain types (`lib/domain/types.ts`), revision diff engine (`lib/domain/diff.ts`), and taxonomy helpers (`lib/domain/taxonomies.ts`).
  - Unit tests (`tests/unit/domain-models.test.ts`) and integration tests (`tests/integration/domain-rls.test.ts`).
- **Repository Safeguards & CI/CD Pipelines** (Parity with AdMe):
  - GitHub Actions CI pipeline (`.github/workflows/ci.yml`) enforcing `version:check`, `lint`, `typecheck`, and `audit:rls` with PostgreSQL service container.
  - Release deployment pipeline (`.github/workflows/release.yml`) with staging and production gates.
  - Architectural path ownership rules in `.github/CODEOWNERS`.
  - Comprehensive `CHECK_IN_POLICY.md` setting 8 non-negotiable security, isolation, and data protection rules.
  - `CONTRIBUTING.md` defining branching conventions, commit standards, and testing mandates.
  - Native Antigravity workspace skills in `.agents/skills/` (`council`, `feature-factory`, `build-with-tests`, `pr-review`).
  - GitHub environment and secrets deployment documentation (`docs/github-setup.md`).
  - Automated version consistency script (`scripts/check-version.mjs`).
- **Software Factory & Council Governance System**:
  - Additive merge of project rules into `AGENTS.md`.
  - `improve-software.md` defining the 5-agent Council review and software factory lifecycle.
  - Subagents under `.claude/agents/`: `codebase-researcher`, `story-writer`, `spec-writer`, `backend-builder`, `frontend-builder`, `test-verifier`, `implementation-validator`, `documenter`, `pr-reviewer`.
  - Skills under `.claude/skills/`: `council`, `feature-factory`, `build-with-tests`, `pr-review`.
  - Automated PostgreSQL Row Level Security (RLS) data-isolation audit script (`scripts/audit-rls.ts`).
  - Unit test runner configuration (`vitest`).
- **Pilot Feedback & Error-Triage System** ([ADR 0006](docs/adr/0006-pilot-feedback-error-triage.md)):
  - Server-enforced feature gate (`NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED`).
  - SSR-safe global session context with sessionStorage UUID and last-5 route breadcrumbs.
  - Floating accessible feedback modal (`FeedbackButton`) with category taxonomy (`BUG`, `ERROR`, `UNEXPECTED_RESULT`, `IMPROVEMENT`).
  - Global `FeedbackErrorBoundary` capturing unhandled render crashes silently.
  - Server-derived identity and SHA-256 normalized fingerprint deduplication.
  - Atomic distributed rate limiting in PostgreSQL (20 req/min).
  - Telemetry isolation with strict Row Level Security (RLS) policies.
  - Staff triage workspace (`/admin/triage`) with queue filtering, detail drawer, and optimistic updates.

### Changed
- Refactored specifications to incorporate:
  - Personal doctrinal statements and historic confessional standards taxonomy (ADR 0001, ADR 0003).
  - Draft vs. published profile revisioning model ([ADR 0005](docs/adr/0005-draft-published-profile-revisions.md)).
  - Assisted CV onboarding with automated PDF extraction in Phase 3.

## [0.1.0] - 2026-09-18

### Added
- Phase 0 repository baseline: Next.js 16 App Router (TypeScript, Tailwind CSS, Turbopack).
- Local Supabase stack configured on isolated, collision-free ports (`49320–49329`).
- Cookie-based Supabase SSR authentication helpers (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`).
- Dedicated developer diagnostics dashboard (`/dev/status`) and collapsible `<DevToolbar />`.
- Clean public landing page for theological academic discovery.
