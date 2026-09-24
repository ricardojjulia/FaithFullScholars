# Council Review 6 — Agent 1: Data & API State Audit

**Feature Target:** Phase 13 — Premium Scholar Profiles & Distinguished Faculty Dossiers (ADR 0014)  
**Auditor:** Council Agent 1 (Data & API Architect)  
**Status:** READ-ONLY AUDIT COMPLETE  
**Baseline State:** 35 public tables, 123 RLS policies, 41 test suites (194 tests), 36 Playwright E2E tests, 21 pre-flight checks, 56 Next.js routes.

---

### 1. Schema & Migrations Audit

- **Current State:** 35 public application tables with 100% RLS enforcement (`relrowsecurity = true` and `relforcerowsecurity = true` on every table). Zero Splinter security violations (search paths pinned, foreign keys indexed).
- **Phase 13 Schema Requirements:**
  - **`public.scholars` additions:**
    - `profile_tier TEXT NOT NULL CHECK (profile_tier IN ('standard', 'distinguished_fellow')) DEFAULT 'standard'`
    - `orcid_id TEXT CHECK (orcid_id IS NULL OR orcid_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$')`
    - `google_scholar_url TEXT CHECK (google_scholar_url IS NULL OR google_scholar_url ~ '^https:\/\/scholar\.google\.[a-z.]+\/citations\?.*user=')`
    - Index: `CREATE INDEX idx_scholars_profile_tier ON public.scholars (profile_tier);`
  - **`public.scholar_profile_revisions`:** Extend `snapshot_data` JSONB schema to store staged `orcid_id` and `google_scholar_url` values.
  - **`public.media_links` additions:**
    - `is_featured BOOLEAN NOT NULL DEFAULT false` (for hero lecture highlight)
    - `thumbnail_url TEXT`
    - `duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0)`
    - Index: `CREATE INDEX idx_media_links_featured ON public.media_links (scholar_id, display_order) WHERE is_featured = true;`
- **Migration Discipline:** All new triggers must enforce `SET search_path = public;` to comply with Splinter check 0011.

---

### 2. Lib & Server Utilities Audit

- **Existing Services:**
  - `lib/profiles/revision-actions.ts`: Currently validates only `full_name` and `current_institution`. Must add regex validation for `orcid_id` and URL origin checks for `google_scholar_url`. `buildDraftSnapshot` must map these fields into `RevisionSnapshotData`.
  - `lib/domain/diff.ts`: `computeRevisionDiff()` currently compares 8 scalar fields. It must be updated to diff `orcid_id` and `google_scholar_url` between published and draft snapshots for admin review.
  - `lib/domain/types.ts`: Must update `ScholarProfile`, `RevisionSnapshotData`, and `MediaLink` interfaces.
- **Missing / Required Helpers:**
  - `lib/media/showcase-service.ts` *(new)*: The codebase currently lacks a `lib/media/` module. A utility is required to sanitize video embed URLs (YouTube, Vimeo, podcasts), extract thumbnails, and prevent XSS injection.
  - `lib/profiles/dossier-service.ts` *(new)*: Extends dossier compilation patterns from `lib/inquiries/export-dossier.ts` for single-scholar academic dossiers (credentials, publications, endorsements, speaking topics, syllabi).
  - Note: Database access is consolidated under `lib/domain/queries.ts` and `lib/supabase/server.ts` rather than `lib/db/`. New loaders (`getDistinguishedScholars`, `getScholarDossierData`) must adhere to this convention.

---

### 3. API Routes & Server Actions Audit

- **Current Endpoints:** Scholar routes are limited to `app/api/scholars/[id]/endorsements` and `app/api/scholars/speaker-topics`.
- **Required New Endpoints:**
  - `GET /api/scholars/[id]/dossier`: Fetches the comprehensive academic dossier (JSON/HTML). Must enforce access gates: public when `profile_status = 'approved'`, owner-only (`auth.uid() = account_id`) or admin when draft/unapproved. Must attach search rate limiting (`checkSearchRateLimit`) to mitigate scraper harvesting.
  - `POST /api/scholars/media`: CRUD endpoint for media links with owner authorization check.

---

### 4. Data Isolation & RLS Security

- **Tenant Isolation:** Maintained across all tables via `account_id` and `scholar_id` bindings.
- **ADR 0005 Revision Isolation:** Academic identifiers (`orcid_id`, `google_scholar_url`) are trust claims. They **must not** be updated directly on `public.scholars` by the scholar. They must follow ADR 0005: written to `scholar_profile_revisions.snapshot_data`, diffed in `ProfileRevisionDiff`, and promoted to `scholars` only upon admin approval.
- **Privilege Escalation Defense (Critical Finding):**
  - Current policy `"Scholars can update own profile"` allows row updates by `account_id = auth.uid()`.
  - Adding `profile_tier` directly to `scholars` without guards would allow scholars to bypass API routes and run `supabase.from('scholars').update({ profile_tier: 'distinguished_fellow' })`.
  - **Remediation:** A PostgreSQL trigger (`prevent_scholar_tier_escalation`) must verify `OLD.profile_tier = NEW.profile_tier` unless `public.is_admin() = true`.

---

### 5. Recommendation & Gaps

- **Verdict:** **PROCEED WITH CONDITIONS.**
- **Required Pre-Implementation Gates:**
  1. **Tier Security Trigger:** Implement DB-level immutability on `scholars.profile_tier` for non-admins.
  2. **ADR 0005 Compliance:** Enforce that ORCID and Google Scholar updates route through revision staging, not immediate table mutations.
  3. **Showcase Sanitization:** Strictly whitelist video/audio embed domains in `lib/media/` to block arbitrary `<iframe>` injection.
