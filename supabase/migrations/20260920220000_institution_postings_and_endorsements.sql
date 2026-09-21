-- ==============================================================================
-- FaithFull Scholars — Migration 20260920220000: Institution Postings & Endorsements
-- Implements Dual-Purpose Institution Accounts:
--   1. Academic Postings & Faculty Needs Marketplace (institution_postings)
--   2. Authoritative Institutional Faculty Endorsements (institution_endorsements)
-- Full compliance with Supabase Security Advisor (Splinter) and 100% RLS
-- ==============================================================================

-- 1. Create table for Academic Opportunities / Faculty Needs Postings
CREATE TABLE IF NOT EXISTS public.institution_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    opportunity_type TEXT NOT NULL CHECK (
        opportunity_type IN (
            'adjunct',
            'modular_intensive',
            'full_time_tenure_track',
            'visiting_fellow',
            'sabbatical_cover',
            'guest_lecturer',
            'doctoral_supervision'
        )
    ),
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    tradition_id UUID REFERENCES public.traditions(id) ON DELETE SET NULL,
    required_degree TEXT NOT NULL DEFAULT 'Doctorate (Ph.D., Th.D., D.Phil.)',
    delivery_mode TEXT NOT NULL DEFAULT 'in_person',
    term TEXT NOT NULL,
    description TEXT NOT NULL,
    confessional_requirements TEXT,
    compensation_notes TEXT,
    deadline DATE,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'filled', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Covering indexes on foreign keys and status (Splinter 0001 compliance)
CREATE INDEX IF NOT EXISTS idx_institution_postings_institution_id ON public.institution_postings (institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_postings_discipline_id ON public.institution_postings (discipline_id);
CREATE INDEX IF NOT EXISTS idx_institution_postings_tradition_id ON public.institution_postings (tradition_id);
CREATE INDEX IF NOT EXISTS idx_institution_postings_status ON public.institution_postings (status);

-- Enable and Force Row Level Security (Defense-in-depth)
ALTER TABLE public.institution_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_postings FORCE ROW LEVEL SECURITY;

-- Postings Policies
CREATE POLICY "Public can view published institution postings"
ON public.institution_postings
FOR SELECT
TO public
USING (status = 'published');

CREATE POLICY "Institution users can view their own postings"
ON public.institution_postings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_postings.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Institution users can insert postings"
ON public.institution_postings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_postings.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Institution users can update postings"
ON public.institution_postings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_postings.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_postings.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Institution users can delete postings"
ON public.institution_postings
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_postings.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Admins can manage institution postings"
ON public.institution_postings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS set_institution_postings_updated_at ON public.institution_postings;
CREATE TRIGGER set_institution_postings_updated_at
    BEFORE UPDATE ON public.institution_postings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Create table for Authoritative Institutional Faculty Endorsements
CREATE TABLE IF NOT EXISTS public.institution_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (
        relationship_type IN (
            'Current Faculty',
            'Former Faculty',
            'Visiting Scholar',
            'Adjunct Instructor',
            'Research Fellow',
            'Distinguished Lecturer'
        )
    ),
    department_or_field TEXT NOT NULL,
    endorsement_text TEXT NOT NULL,
    is_credential_verified BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Covering indexes on foreign keys and status (Splinter 0001 compliance)
CREATE INDEX IF NOT EXISTS idx_institution_endorsements_institution_id ON public.institution_endorsements (institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_endorsements_scholar_id ON public.institution_endorsements (scholar_id);
CREATE INDEX IF NOT EXISTS idx_institution_endorsements_status ON public.institution_endorsements (status);

-- Enable and Force Row Level Security (Defense-in-depth)
ALTER TABLE public.institution_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_endorsements FORCE ROW LEVEL SECURITY;

-- Endorsements Policies
CREATE POLICY "Public can view active institution endorsements"
ON public.institution_endorsements
FOR SELECT
TO public
USING (
    status = 'active' AND
    EXISTS (
        SELECT 1 FROM public.scholars s
        WHERE s.id = institution_endorsements.scholar_id
          AND s.profile_status = 'approved'
    )
);

CREATE POLICY "Institution users can view their issued endorsements"
ON public.institution_endorsements
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_endorsements.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Institution users can insert endorsements"
ON public.institution_endorsements
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_endorsements.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Institution users can update their endorsements"
ON public.institution_endorsements
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_endorsements.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_endorsements.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Admins can manage institution endorsements"
ON public.institution_endorsements
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS set_institution_endorsements_updated_at ON public.institution_endorsements;
CREATE TRIGGER set_institution_endorsements_updated_at
    BEFORE UPDATE ON public.institution_endorsements
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
