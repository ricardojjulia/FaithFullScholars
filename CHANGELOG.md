# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
