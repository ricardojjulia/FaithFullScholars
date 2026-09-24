# Council Review 6 — Agent 2: Routes & Pages Audit

**Feature Target:** Phase 13 — Premium Scholar Profiles & Distinguished Faculty Dossiers (ADR 0014)  
**Auditor:** Council Agent 2 (Route & Page Auditor)  
**Status:** READ-ONLY AUDIT COMPLETE  
**Scope:** Shell inventory, route coverage, dead route/stub triage, Phase 13 additions.

---

### 1. Shell & Navigation Inventory
- **Public Shell (`PublicNav`)**: Hosts 5 core destinations (`/`, `/scholars`, `/courses`, `/opportunities`, `/speakers`), plus Teaching shortcut, Universal Search, Language Switcher, and `UserMenu`. Adding a top-level "Dossiers" or "Distinguished" tab would crowd the header. Integration must be contextual: an anchor action button on `/scholars/[slug]` ("Print Dossier" / "Executive Dossier") and directory filter badges.
- **Scholar Workspace Sub-Nav (`app/dashboard/layout.tsx`)**: Contains 8 tabs (Overview, Profile & Doctrinal, Courses, Availability, Inquiries, Contracts, Analytics, Preview). This navbar is at capacity on tablet and mobile viewports.
- **Institution Portal (`InstitutionNav`)**: 9 tabs (`/institution/...`). Already includes `/institution/saved/dossier` for multi-candidate search committee exports.
- **UserMenu (`user-menu.tsx`)**: Cleanly grouped into Discovery, Workspace, Institution, and Platform Health. Phase 13 features integrate cleanly by adding "Media & Lectures" under Faculty Workspace and "Print Dossier" from preview.

---

### 2. Page Existence & Routing Check
- **Public & Discovery (10 routes)**: `/`, `/scholars`, `/scholars/[slug]`, `/courses`, `/courses/[slug]`, `/speakers`, `/opportunities`, `/opportunities/[slug]`, `/disciplines/[slug]`, `/traditions/[slug]` — **100% EXISTS & RESOLVES**.
- **Institution Portal (11 routes)**: `/institution`, `/institution/inquiries`, `/institution/postings`, `/institution/saved`, `/institution/saved/dossier`, `/institution/contracts`, `/institution/subscription`, `/institution/consortium`, `/institution/licensing`, `/institution/profile` — **100% EXISTS & RESOLVES**.
- **Scholar Dashboard (10 routes)**: `/dashboard`, `/dashboard/profile`, `/dashboard/courses`, `/dashboard/availability`, `/dashboard/inquiries`, `/dashboard/contracts`, `/dashboard/licensing`, `/dashboard/analytics`, `/dashboard/onboarding`, `/dashboard/preview` — **EXISTS**.
- **Identified Stubs & Dormant Routes**:
  1. `/dashboard/profile`: Saves drafts to local staging state. It should persist `orcid_id` and `google_scholar_url` directly through `scholar_profile_revisions`.
  2. `media_links`: Table `public.media_links` with RLS already exists in PostgreSQL and is fetched by `getPublicScholarBySlug`, but lacks a dedicated UI manager on `/dashboard/profile` or `/dashboard/media` and rendering on `/scholars/[slug]`.

---

### 3. Proposed Phase 13 Routes
- **`/scholars/[slug]/dossier` (Public Print-Ready Dossier)**:
  - **Status**: PROPOSED / HIGH VIABILITY.
  - Server-rendered page using Tailwind `@media print` utilities (`print:block`, `print:hidden`).
  - Renders SBL/Chicago citation bibliography, verified terminal degrees, confessional standard subscription adherence, prepared syllabi, and sample lectures.
  - Mirrored after the proven pattern in `/institution/saved/dossier`, providing clean physical binders for search committees and ATS accreditation reviews.
- **Media & Showcase Manager (`/dashboard/media`)**:
  - Embedded as a dedicated section in `/dashboard/profile` or standalone `/dashboard/media` route to preserve clean navigation.

---

### 4. Server Actions & Form Completeness
- **Current Architecture**: API Route Handlers (`app/api/*`) handle domain mutations.
- **Required Handlers for Phase 13**:
  1. `POST /api/scholars/media` & `DELETE /api/scholars/media/[id]`: CRUD for YouTube videos, podcasts, and lecture recordings into `public.media_links`.
  2. ORCID support: Add `orcid_id` to schema/snapshot with validation (`^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$`).

---

### 5. Summary Table

| Route | Shell | Page Status | Phase 13 Impact |
|---|---|---|---|
| `/scholars/[slug]` | Public | EXISTS | Add "Print Dossier" action button and media link embeds |
| `/scholars/[slug]/dossier` | Public (Print) | PROPOSED | New SBL/Chicago print-optimized individual faculty dossier |
| `/dashboard/profile` | Scholar | EXISTS | Add ORCID & Google Scholar fields with validation |
| `/dashboard/media` | Scholar | PROPOSED | Media & lecture showcase manager |
| `/institution/saved/dossier` | Institution | EXISTS | Unchanged; acts as reference implementation for print dossier |
| `/api/scholars/media` | API | PROPOSED | New CRUD route handler for scholar media links |

---

### 6. Recommendation
**PROCEED WITH CONDITIONS**: Proceed with Phase 13. It leverages existing, dormant database infrastructure (`public.media_links`) and provides immense value for search committees.
