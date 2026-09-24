# ADR 0013: Course Licensing & Syllabus Distribution Agreements

## Status
Accepted (Phase 11 / Backlog Capabilities)

## Date
2026-09-23

## Context & Motivation
Theological institutions frequently face specialized faculty shortages when launching new degree programs, electives, or modular master's courses in niche disciplines (e.g., Patristic Syriac, Bioethics, Post-Reformation Scholasticism, Middle Eastern Peasant Backgrounds).

Historically, developing an accredited, confessional graduate syllabus with required reading lists, lecture outlines, and assessment rubrics requires months of faculty labor. Conversely, verified theological scholars possessing world-class curricula often seek avenues to license their syllabi, reading lists, lecture recordings, or asynchronous modular units to accredited seminaries under formal royalty agreements without needing to relocate or take on full-time faculty loads.

Prior to ADR 0013:
1. The course catalog allowed public previews of courses (`public.courses`), but institutions had no direct in-app mechanism to request syllabus distribution or digital course licensing.
2. Syllabi, assessment rubrics, and detailed reading lists were either shared over ad-hoc email or not monetized.
3. No bilateral contractual record existed between scholar and seminary regarding intellectual property (IP) terms, permitted student headcounts, or licensing royalties.

## Decision
We implement a first-class **Course Licensing & Syllabus Distribution Agreement** workflow:

1. **Data Model**:
   - `public.course_licensing_agreements`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE`
     - `scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE`
     - `institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE`
     - `consortium_id UUID REFERENCES public.consortiums(id) ON DELETE SET NULL`
     - `license_type TEXT NOT NULL CHECK (license_type IN ('syllabus_only', 'full_course_curriculum', 'modular_guest_lecture', 'custom_institution_license'))`
     - `term_duration TEXT NOT NULL CHECK (term_duration IN ('1_semester', '1_academic_year', 'perpetual_institutional', 'single_modular_cohort'))`
     - `royalty_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00`
     - `permitted_students_count INTEGER DEFAULT NULL`
     - `status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('draft', 'requested', 'counter_proposed', 'active', 'expired', 'terminated'))`
     - `custom_terms TEXT`
     - `signed_by_scholar_at TIMESTAMPTZ`
     - `signed_by_institution_at TIMESTAMPTZ`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
     - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

2. **Accreditation Verification Integration**:
   - Add accreditation metadata columns to `public.institutions`:
     - `accreditation_body TEXT CHECK (accreditation_body IN ('ATS', 'ABHE', 'TRACS', 'HLC', 'SACSCOC', 'other', 'none'))`
     - `accreditation_status TEXT CHECK (accreditation_status IN ('accredited', 'candidate', 'associate', 'none'))`
     - `accreditation_verified_at TIMESTAMPTZ`
   - Verified accreditation status renders an authoritative trust badge on institution profile and opportunity postings.

3. **Row-Level Security (RLS) & Multi-Tenant Isolation**:
   - All licensing tables have `FORCE ROW LEVEL SECURITY`.
   - **Scholars**: Can read and manage licensing agreements where `scholar_id` belongs to their account (`auth.uid() = scholars.account_id`).
   - **Institutions**: Can read and manage licensing agreements where `institution_id` belongs to their verified institution account.
   - **Consortia**: Member institutions can view consortium-wide curriculum sharing agreements.
   - **Admins**: Full read/audit permissions for compliance and dispute triage.
   - **Public**: Zero access to unapproved private agreements or contractual royalty figures.

4. **Database Performance & Splinter Compliance**:
   - Covering indexes on foreign keys: `idx_licensing_course`, `idx_licensing_scholar`, `idx_licensing_institution`, `idx_licensing_consortium`, `idx_licensing_status` (Splinter 0001).
   - Auth functions wrapped in scalar subqueries `(SELECT auth.uid())` (Splinter 0003).
   - Search path pinned on `set_updated_at` trigger functions (`SET search_path = public, pg_temp`) (Splinter 0011).

5. **Application Surface**:
   - Public Course Page modal: `<CourseLicensingModal />` on `/courses/[slug]`.
   - Institutional Licensing Agreement Manager: `/institution/licensing`.
   - Scholar Course Licensing Workspace: `/dashboard/licensing`.
   - Bilateral digital countersigning workflow.

## Consequences & Trade-offs
- **Positive**:
  - Provides theological scholars with direct monetization and academic dissemination of their proprietary course materials.
  - Equips seminaries to rapidly deploy vetted courses with formal intellectual property clearances and accreditation alignment.
  - Multi-campus consortia can license a single curriculum across all affiliated member institutions seamlessly.
- **Trade-offs / Mitigations**:
  - Requires clear status state machines (`requested` → `active` / `counter_proposed` / `terminated`); mitigated by declarative service layer `licensing-service.ts` with explicit transition guards.
