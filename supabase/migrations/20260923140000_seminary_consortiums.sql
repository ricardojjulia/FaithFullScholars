-- ==============================================================================
-- FaithFull Scholars — Migration: Seminary Consortium & Multi-Campus System Accounts
-- ADR 0012: Confessional consortia and multi-campus federation hierarchy
-- Tables: public.consortiums, public.consortium_members
-- 100% PostgreSQL Row Level Security (RLS) enforcement
-- ==============================================================================

-- 1. Create consortiums table
CREATE TABLE IF NOT EXISTS public.consortiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  website TEXT,
  lead_institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create consortium_members table
CREATE TABLE IF NOT EXISTS public.consortium_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id UUID NOT NULL REFERENCES public.consortiums(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member', 'affiliate')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT consortium_members_unique UNIQUE (consortium_id, institution_id)
);

-- 3. Splinter 0001: Covering Indexes on Foreign Keys
CREATE INDEX IF NOT EXISTS idx_consortiums_lead_institution ON public.consortiums(lead_institution_id);
CREATE INDEX IF NOT EXISTS idx_consortium_members_consortium ON public.consortium_members(consortium_id);
CREATE INDEX IF NOT EXISTS idx_consortium_members_institution ON public.consortium_members(institution_id);
CREATE INDEX IF NOT EXISTS idx_consortium_members_status ON public.consortium_members(status);

-- 4. Enable & Force Row Level Security (RLS)
ALTER TABLE public.consortiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consortiums FORCE ROW LEVEL SECURITY;

ALTER TABLE public.consortium_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consortium_members FORCE ROW LEVEL SECURITY;

-- 5. Splinter 0011: Pinned search-path updated_at triggers
DROP TRIGGER IF EXISTS set_consortiums_updated_at ON public.consortiums;
CREATE TRIGGER set_consortiums_updated_at
  BEFORE UPDATE ON public.consortiums
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 6. Granular RLS Policies for consortiums

-- 6a. Public inspection
DROP POLICY IF EXISTS "Public can view consortiums" ON public.consortiums;
CREATE POLICY "Public can view consortiums"
  ON public.consortiums
  FOR SELECT
  TO public
  USING (true);

-- 6b. Lead institution users manage their consortium
DROP POLICY IF EXISTS "Lead institutions manage consortium" ON public.consortiums;
CREATE POLICY "Lead institutions manage consortium"
  ON public.consortiums
  FOR ALL
  TO authenticated
  USING (
    lead_institution_id IN (
      SELECT institution_id
      FROM public.institution_users
      WHERE account_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    lead_institution_id IN (
      SELECT institution_id
      FROM public.institution_users
      WHERE account_id = (SELECT auth.uid())
    )
  );

-- 6c. System administrators manage all consortiums
DROP POLICY IF EXISTS "Admins manage all consortiums" ON public.consortiums;
CREATE POLICY "Admins manage all consortiums"
  ON public.consortiums
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. Granular RLS Policies for consortium_members

-- 7a. Public inspection of active members
DROP POLICY IF EXISTS "Public can view active consortium members" ON public.consortium_members;
CREATE POLICY "Public can view active consortium members"
  ON public.consortium_members
  FOR SELECT
  TO public
  USING (status = 'active');

-- 7b. Institutions view own membership record (active or pending)
DROP POLICY IF EXISTS "Institutions view own membership" ON public.consortium_members;
CREATE POLICY "Institutions view own membership"
  ON public.consortium_members
  FOR SELECT
  TO authenticated
  USING (
    institution_id IN (
      SELECT institution_id
      FROM public.institution_users
      WHERE account_id = (SELECT auth.uid())
    )
  );

-- 7c. Lead institution manages members of their consortium
DROP POLICY IF EXISTS "Lead institutions manage consortium members" ON public.consortium_members;
CREATE POLICY "Lead institutions manage consortium members"
  ON public.consortium_members
  FOR ALL
  TO authenticated
  USING (
    consortium_id IN (
      SELECT c.id
      FROM public.consortiums c
      JOIN public.institution_users iu ON iu.institution_id = c.lead_institution_id
      WHERE iu.account_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    consortium_id IN (
      SELECT c.id
      FROM public.consortiums c
      JOIN public.institution_users iu ON iu.institution_id = c.lead_institution_id
      WHERE iu.account_id = (SELECT auth.uid())
    )
  );

-- 7d. System administrators manage all consortium members
DROP POLICY IF EXISTS "Admins manage all consortium members" ON public.consortium_members;
CREATE POLICY "Admins manage all consortium members"
  ON public.consortium_members
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
