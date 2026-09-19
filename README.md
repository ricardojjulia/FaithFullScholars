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

- **Current Position:** Phase 0 (Foundation), Phase 1 (Domain Foundation), Phase 2 (Public Discovery), and **Milestone 2.5 (LinkedIn-Grade UI/UX & Search Abuse Gating)** are fully implemented, audited, and verified.
- **Data Isolation & Row Level Security:** 100% RLS compliance across all 25 PostgreSQL tables in the public schema (`search_rate_limits`, `scholars`, `courses`, `inquiries`, etc.).
- **Search Abuse & Anti-Scraping Defenses:** Token-bucket rate limiting (15 req/min anonymous, 120 req/min authenticated), 3-page anonymous search cap with sign-in wall, and input sanitization stripping SQL `LIKE` wildcards.
- **LinkedIn Academic Design System:** Persistent universal app bar with `/` keyboard shortcut, "Me" dropdown menu, 3-column discovery layout, academic cover banners, 120px circular overlapping avatars, verified badges, and modular profile cards.
- **Verification Pipeline:**
  ```bash
  npm run verify
  ```
  Runs all 6 quality gates: `version:check`, `lint`, `typecheck`, `test` (10 suites, 58 tests), `audit:rls` (25/25 tables), and Next.js Turbopack `build`.

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
