# Council Review #8 — Agent 2: Routes & Pages Audit

**Date:** 2026-09-26  
**Auditor:** Council Agent 2 (Routes & Pages Auditor)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`  
**Status:** Clean — 58 of 58 Static & Dynamic Routes Verified with Turbopack

---

## 1. Application Routes & Shell Navigation Inventory

FaithFull Scholars operates across 58 statically generated and dynamically rendered Next.js 16 App Router routes, organized cleanly into four functional personas:

| Functional Workspace | Route Scope | Page Status | Key Capabilities |
| :--- | :--- | :---: | :--- |
| **Public Discovery Shell** | `/`, `/scholars`, `/scholars/[slug]`, `/scholars/[slug]/dossier`, `/courses`, `/courses/[slug]`, `/speakers`, `/opportunities`, `/opportunities/[slug]`, `/disciplines`, `/traditions` | ✅ EXISTS | Faceted search, AI faculty matcher, speaking bureau, syllabus showcases, and print candidate dossiers. |
| **Scholar Workspace** | `/dashboard`, `/dashboard/profile`, `/dashboard/onboarding`, `/dashboard/courses`, `/dashboard/availability`, `/dashboard/analytics`, `/dashboard/inquiries`, `/dashboard/contracts`, `/dashboard/licensing`, `/dashboard/media`, `/dashboard/preview` | ✅ EXISTS | Dual-protection revision staging (ADR 0005), CV parser, media manager, contract inbox, and course licensing. |
| **Institution Portal** | `/institution`, `/institution/profile`, `/institution/saved`, `/institution/saved/dossier`, `/institution/inquiries`, `/institution/postings`, `/institution/postings/new`, `/institution/subscription`, `/institution/contracts`, `/institution/licensing`, `/institution/consortium`, `/institution/endorsements` | ✅ EXISTS | Board of Trustees search dockets (ADR 0015), consortium systems, quota tracking, and teaching vacancy calls. |
| **Trust & Administration** | `/admin/reviews`, `/admin/reviews/[id]`, `/admin/institutions`, `/admin/reports`, `/admin/triage`, `/dev/status` | ✅ EXISTS | Side-by-side revision diffs (`RevisionDiffViewer`), accreditation checks, system telemetry, and pilot triage. |

---

## 2. Server Action & Interactive Route Completeness

Every interactive user action has a corresponding secure Route Handler or Server Action:
- Profile revision submission & staging: `submitProfileRevisionAction`
- CV extraction via Gemini AI: `POST /api/ai/match-faculty`, `lib/ai/gemini-cv-extractor.ts`
- Board of Trustees dossier export: `/institution/saved/dossier`, `GET /api/institution/saved-scholars/export`
- Contract countersigning: `POST /api/dashboard/contracts/[id]/accept`
- Course licensing signing: `POST /api/dashboard/licensing/[id]/sign`
- Speaking bureau invitation: `POST /api/inquiries`

---

## 3. Playwright E2E Coverage

All 38 Playwright E2E browser tests pass cleanly across 6 journey suites (`tests/e2e/`):
- `translation-and-locale.spec.ts`: English/Spanish dynamic switching with zero UI language mixing.
- `scholar-full-journey.spec.ts`: Scholar profile setup, availability, and contracts.
- `institution-full-journey.spec.ts`: Dean directory discovery, opportunities, and quota meters.
- `admin-full-journey.spec.ts`: Moderation reviews, accreditation approvals, and health telemetry.
- `course-licensing.spec.ts`: Syllabus distribution agreements and royalty contracts.
- `subscriptions-and-contracts.spec.ts`: Consortia multi-campus portals and enterprise subscriptions.

---

## 4. Agent 2 Sign-Off

Zero broken links, zero orphaned handlers, and zero empty stubs exist. All 58 routes compile cleanly under Turbopack. Agent 2 signs off on platform state for Council Review #8.
