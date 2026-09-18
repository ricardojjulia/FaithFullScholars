# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
