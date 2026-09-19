# Council Review 2 — Agent 1: Data & API Security, Segmentation, and Search Gating Audit

**Review Date:** 2026-09-19  
**Agent:** Council Agent 1 (Data & API Architect)  
**Status:** Read-Only Audit Pass  
**Repo Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Schema & Row Level Security (RLS) Inventory

The repository currently maintains **24 PostgreSQL tables** in the `public` schema. An audit using `npm run audit:rls` confirms that **all 24 tables have Row Level Security enabled** with active PostgreSQL security policies.

### Tenant Segmentation & Isolation Matrix

| Layer / Tenant | Permitted Read Surface | Prohibited Read Surface | Enforcement Mechanism |
|---|---|---|---|
| **Public / Anonymous** | Approved scholars (`profile_status = 'approved'`), public courses (`visibility = 'public'`), taxonomies (`disciplines`, `traditions`, `confessional_standards`). | Raw account records, emails, phone numbers, draft revisions (`draft_revision_id`), private CV storage objects, internal review logs, institutional inquiries. | PostgreSQL RLS policies (`scholars_public_select`, `courses_public_select`) + Server Query projection filters. |
| **Scholar (Owner)** | Own scholar record, all own draft and historical profile revisions (`owner_id = auth.uid()`), own credentials, publications, courses, availability settings, received institutional inquiries. | Other scholars' draft revisions, private inquiry threads between other institutions and scholars, platform administrative telemetry. | PostgreSQL RLS (`owner_id = auth.uid()`) + foreign key ownership cascades. |
| **Institution User** | Approved scholar catalog, public syllabi, own institution records, inquiries dispatched by own institution, shortlisted scholars. | Scholar personal contact details (unless released upon inquiry acceptance), unapproved scholar drafts, other institutions' candidate shortlists. | RLS (`institution_id IN (SELECT institution_id FROM institution_users WHERE user_id = auth.uid())`). |
| **Platform Admin** | All revision queues, pending doctrinal reviews, moderation diffs, feedback triage records, audit logs. | Unrestricted platform access solely via dedicated security functions (`is_admin()`). | RLS policy `FOR ALL USING (is_admin())` checking `accounts.role = 'admin'`. |

---

## 2. PII Protection & Field-Level Data Classification

To maintain parity with enterprise professional networks (like modern LinkedIn), sensitive user PII must be physically segregated from public academic directory indices:

1. **Identity & Auth Boundary (`accounts`)**:
   - Stores `email`, `encrypted_password`, `phone_number`, `auth_provider`, `role`.
   - Never joined or queried directly by public directory routes (`/scholars`, `/courses`).
2. **Public Academic Identity (`scholars`)**:
   - Stores professional academic persona: `full_name`, `title`, `current_institution`, `institutional_role`, `location`, `biography`, `profile_photo_path`, `doctrinal_statement_text`.
   - Contact preference defaults to `institution_inquiry`—**direct email addresses and phone numbers are never exposed in HTML, JSON APIs, or client bundles.**
3. **Private Asset Storage Encryption & Signed URLs**:
   - Private scholar CVs and proprietary course syllabi are stored in private Supabase Storage buckets (`scholar-cvs`, `course-syllabi`).
   - Downloads require time-limited (15-minute), cryptographically signed URLs generated exclusively on the server after verifying the requester is an authorized dean or verified institution representative.

---

## 3. Search Bar Abuse Defense & Anti-Scraping Gating Architecture

Generic search bars are the primary attack vector for automated web scraping, candidate harvesting, and denial of service. The Council mandates a multi-layer defense-in-depth model:

### A. Token-Bucket Distributed Rate Limiting
- Implement an atomic rate-limiter for directory queries:
  - **Anonymous / Unauthenticated:** Maximum 15 search queries per minute per IP/session fingerprint. Exceeding triggers HTTP 429 (`Too Many Requests`) with exponential backoff.
  - **Authenticated Verified Institutions:** Higher tiered allowance (120 queries/minute) with audit logging.
- Store rate-limit buckets in a dedicated Postgres cache table (`search_rate_limits`) utilizing atomic increment functions to avoid distributed race conditions.

### B. Result Projection Capping & Deep-Pagination Wall
- **Anonymous Pagination Cap:** Unauthenticated search requests are strictly capped at page 3 (maximum 18 results). Deep pagination beyond page 3 requires free user sign-in.
- **Bulk Scrape Prevention:** Prevent sequential scraping by rejecting non-standard pagination jumps and disallowing bulk wildcard queries (e.g. empty string or single-character scans with unlimited limits).

### C. Search Input Sanitization & ReDoS Defense
- Sanitize all query strings at the server boundary before generating database operators.
- Normalize characters, strip raw SQL wildcards (`%`, `_`), and limit search term length to 100 characters.
- In PostgREST / Supabase queries, avoid unindexed `or` clauses that induce sequential table scans; utilize PostgreSQL Full-Text Search (`tsvector` / `tsquery`) with `GIN` indexes on academic disciplines, scholar names, and publications.

---

## 4. Top 5 Data & API Recommendations

1. **Implement `search_rate_limits` Table & Anti-Scraping Middleware**: Create atomic rate limiting for all public search endpoints.
2. **Apply Pagination Gating**: Cap anonymous discovery to 18 profiles before prompting for LinkedIn-style free sign-in.
3. **Migrate ILIKE to Postgres Full-Text Search (FTS)**: Replace unbounded ILIKE searches with indexed `tsvector` on `scholars` and `courses` for sub-10ms queries resistant to regex exhaustion.
4. **Enforce Cryptographic Signed URLs for CV Downloads**: Prevent direct public object access in storage buckets.
5. **Mask Contact Details by Default**: Never return account emails or phone numbers in public loader schemas.
