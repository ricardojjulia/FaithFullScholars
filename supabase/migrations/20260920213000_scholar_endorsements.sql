-- ==============================================================================
-- FaithFull Scholars — Migration 20260920213000: Peer Endorsements & Commendations
-- Implements §21 Post-MVP Backlog: Faculty Peer Attestation & Endorsements
-- Full compliance with Supabase Security Advisor (Splinter) and 100% RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.scholar_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endorser_scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
    recipient_scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    subject_area TEXT NOT NULL,
    endorsement_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT scholar_endorsements_no_self_endorsement CHECK (endorser_scholar_id <> recipient_scholar_id)
);

-- Covering indexes for Foreign Keys (Splinter 0001 compliance)
CREATE INDEX IF NOT EXISTS idx_scholar_endorsements_endorser ON public.scholar_endorsements (endorser_scholar_id);
CREATE INDEX IF NOT EXISTS idx_scholar_endorsements_recipient ON public.scholar_endorsements (recipient_scholar_id);
CREATE INDEX IF NOT EXISTS idx_scholar_endorsements_status ON public.scholar_endorsements (status);

-- Enable and Force Row Level Security (Defense-in-depth)
ALTER TABLE public.scholar_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_endorsements FORCE ROW LEVEL SECURITY;

-- 1. Public can view approved endorsements for approved scholars
CREATE POLICY "Public can view approved endorsements on approved scholars"
ON public.scholar_endorsements
FOR SELECT
TO public
USING (
    status = 'approved' AND
    EXISTS (
        SELECT 1 FROM public.scholars s
        WHERE s.id = scholar_endorsements.recipient_scholar_id
          AND s.profile_status = 'approved'
    )
);

-- 2. Authenticated scholars can submit new endorsements in 'pending' status
CREATE POLICY "Scholars can insert endorsements as endorser"
ON public.scholar_endorsements
FOR INSERT
TO authenticated
WITH CHECK (
    endorser_scholar_id = (SELECT public.get_current_scholar_id()) AND
    endorser_scholar_id <> recipient_scholar_id AND
    status = 'pending'
);

-- 3. Endorsers can view their submitted endorsements
CREATE POLICY "Endorsers can view their submitted endorsements"
ON public.scholar_endorsements
FOR SELECT
TO authenticated
USING (
    endorser_scholar_id = (SELECT public.get_current_scholar_id())
);

-- 4. Recipients can view endorsements submitted for them
CREATE POLICY "Recipients can view endorsements received"
ON public.scholar_endorsements
FOR SELECT
TO authenticated
USING (
    recipient_scholar_id = (SELECT public.get_current_scholar_id())
);

-- 5. Recipients can update status to approved, declined, or hidden
CREATE POLICY "Recipients can update endorsement status"
ON public.scholar_endorsements
FOR UPDATE
TO authenticated
USING (
    recipient_scholar_id = (SELECT public.get_current_scholar_id())
)
WITH CHECK (
    status IN ('approved', 'declined', 'hidden')
);

-- 6. Admins can manage all endorsements
CREATE POLICY "Admins can manage all endorsements"
ON public.scholar_endorsements
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Automated updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_scholar_endorsements_updated_at ON public.scholar_endorsements;
CREATE TRIGGER set_scholar_endorsements_updated_at
    BEFORE UPDATE ON public.scholar_endorsements
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
