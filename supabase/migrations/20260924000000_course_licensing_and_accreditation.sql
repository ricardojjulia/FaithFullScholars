-- ==============================================================================
-- FaithFull Scholars — Migration: Course Licensing & Syllabus Distribution Agreements
-- ADR 0013: Bilateral Course Licensing, Syllabus Access & ATS/ABHE Accreditation Badges
-- Tables: public.course_licensing_agreements
-- Alters: public.institutions (accreditation_body, accreditation_status, accreditation_verified_at)
-- 100% PostgreSQL Row Level Security (RLS) enforcement
-- ==============================================================================

-- 1. Extend institutions with accreditation verification metadata
ALTER TABLE public.institutions 
  ADD COLUMN IF NOT EXISTS accreditation_body TEXT DEFAULT 'none' CHECK (accreditation_body IN ('ATS', 'ABHE', 'TRACS', 'HLC', 'SACSCOC', 'other', 'none')),
  ADD COLUMN IF NOT EXISTS accreditation_status TEXT DEFAULT 'none' CHECK (accreditation_status IN ('accredited', 'candidate', 'associate', 'none')),
  ADD COLUMN IF NOT EXISTS accreditation_verified_at TIMESTAMPTZ;

-- 2. Create course_licensing_agreements table
CREATE TABLE IF NOT EXISTS public.course_licensing_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  consortium_id UUID REFERENCES public.consortiums(id) ON DELETE SET NULL,
  license_type TEXT NOT NULL CHECK (license_type IN ('syllabus_only', 'full_course_curriculum', 'modular_guest_lecture', 'custom_institution_license')),
  term_duration TEXT NOT NULL CHECK (term_duration IN ('1_semester', '1_academic_year', 'perpetual_institutional', 'single_modular_cohort')),
  royalty_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  permitted_students_count INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('draft', 'requested', 'counter_proposed', 'active', 'expired', 'terminated')),
  custom_terms TEXT,
  signed_by_scholar_at TIMESTAMPTZ,
  signed_by_institution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Splinter 0001: Covering Indexes on Foreign Keys
CREATE INDEX IF NOT EXISTS idx_licensing_course ON public.course_licensing_agreements(course_id);
CREATE INDEX IF NOT EXISTS idx_licensing_scholar ON public.course_licensing_agreements(scholar_id);
CREATE INDEX IF NOT EXISTS idx_licensing_institution ON public.course_licensing_agreements(institution_id);
CREATE INDEX IF NOT EXISTS idx_licensing_consortium ON public.course_licensing_agreements(consortium_id);
CREATE INDEX IF NOT EXISTS idx_licensing_status ON public.course_licensing_agreements(status);
CREATE INDEX IF NOT EXISTS idx_institutions_accreditation ON public.institutions(accreditation_body, accreditation_status);

-- 4. Enable & Force Row Level Security (RLS)
ALTER TABLE public.course_licensing_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_licensing_agreements FORCE ROW LEVEL SECURITY;

-- 5. Splinter 0011: Pinned search-path updated_at trigger
DROP TRIGGER IF EXISTS set_course_licensing_agreements_updated_at ON public.course_licensing_agreements;
CREATE TRIGGER set_course_licensing_agreements_updated_at
  BEFORE UPDATE ON public.course_licensing_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 6. Granular RLS Policies for course_licensing_agreements

-- 6a. Scholars can view licensing agreements for their courses
DROP POLICY IF EXISTS "Scholars can view their course licensing agreements" ON public.course_licensing_agreements;
CREATE POLICY "Scholars can view their course licensing agreements"
  ON public.course_licensing_agreements
  FOR SELECT
  TO authenticated
  USING (
    scholar_id IN (
      SELECT s.id FROM public.scholars s
      WHERE s.account_id = (SELECT auth.uid())
    )
  );

-- 6b. Scholars can update (counter-propose, sign, terminate) their licensing agreements
DROP POLICY IF EXISTS "Scholars can update their course licensing agreements" ON public.course_licensing_agreements;
CREATE POLICY "Scholars can update their course licensing agreements"
  ON public.course_licensing_agreements
  FOR UPDATE
  TO authenticated
  USING (
    scholar_id IN (
      SELECT s.id FROM public.scholars s
      WHERE s.account_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    scholar_id IN (
      SELECT s.id FROM public.scholars s
      WHERE s.account_id = (SELECT auth.uid())
    )
  );

-- 6c. Institution users can view their institution's licensing agreements
DROP POLICY IF EXISTS "Institutions can view their licensing agreements" ON public.course_licensing_agreements;
CREATE POLICY "Institutions can view their licensing agreements"
  ON public.course_licensing_agreements
  FOR SELECT
  TO authenticated
  USING (
    institution_id IN (
      SELECT iu.institution_id FROM public.institution_users iu
      WHERE iu.account_id = (SELECT auth.uid())
    )
    OR
    consortium_id IN (
      SELECT cm.consortium_id FROM public.consortium_members cm
      JOIN public.institution_users iu ON iu.institution_id = cm.institution_id
      WHERE iu.account_id = (SELECT auth.uid())
        AND cm.status = 'active'
    )
  );

-- 6d. Institution users can insert new licensing requests
DROP POLICY IF EXISTS "Institutions can request course licenses" ON public.course_licensing_agreements;
CREATE POLICY "Institutions can request course licenses"
  ON public.course_licensing_agreements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    institution_id IN (
      SELECT iu.institution_id FROM public.institution_users iu
      WHERE iu.account_id = (SELECT auth.uid())
    )
  );

-- 6e. Institution users can update their institution's licensing agreements
DROP POLICY IF EXISTS "Institutions can update their licensing agreements" ON public.course_licensing_agreements;
CREATE POLICY "Institutions can update their licensing agreements"
  ON public.course_licensing_agreements
  FOR UPDATE
  TO authenticated
  USING (
    institution_id IN (
      SELECT iu.institution_id FROM public.institution_users iu
      WHERE iu.account_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    institution_id IN (
      SELECT iu.institution_id FROM public.institution_users iu
      WHERE iu.account_id = (SELECT auth.uid())
    )
  );

-- 6f. Admins can view and audit all licensing agreements
DROP POLICY IF EXISTS "Admins can view all course licensing agreements" ON public.course_licensing_agreements;
CREATE POLICY "Admins can view all course licensing agreements"
  ON public.course_licensing_agreements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = (SELECT auth.uid()) AND a.role = 'admin'
    )
  );
