-- Migration: 20260921110000_copilot_review_remediations.sql
-- Description: Remediate GitHub Copilot review findings:
-- 1. Redefine is_institution_user as SECURITY DEFINER with pinned search_path to prevent infinite recursion
-- 2. Update institution_users SELECT policy to use non-recursive direct account match with helper fallback
-- 3. Gate public institution_postings SELECT policy on parent institution approval (status = 'approved')
-- 4. Gate public institution_endorsements SELECT policy on parent institution approval (status = 'approved')
-- 5. Default is_credential_verified to false on institution_endorsements
-- 6. Enforce immutability of scholar endorsement associations and content on status updates
-- 7. Correct Historical Theology and Systematic Theology discipline ID mappings on pilot postings

-- -----------------------------------------------------------------------------
-- 1. NON-RECURSIVE is_institution_user HELPER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_institution_user(target_inst_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.institution_users
    WHERE account_id = (SELECT auth.uid()) AND institution_id = target_inst_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_institution_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_institution_user(UUID) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. NON-RECURSIVE SELECT POLICY ON institution_users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members or admin can view institution users" ON public.institution_users;
CREATE POLICY "Members or admin can view institution users"
ON public.institution_users
FOR SELECT
TO authenticated
USING (
  account_id = (SELECT auth.uid()) OR
  public.is_admin() OR
  public.is_institution_user(institution_id)
);

-- -----------------------------------------------------------------------------
-- 3. GATE PUBLIC POSTINGS ON APPROVED INSTITUTION
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published institution postings" ON public.institution_postings;
CREATE POLICY "Public can view published institution postings"
ON public.institution_postings
FOR SELECT
TO public
USING (
  status = 'published' AND
  EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = institution_postings.institution_id
      AND i.status = 'approved'
  )
);

-- -----------------------------------------------------------------------------
-- 4. GATE PUBLIC INSTITUTIONAL ENDORSEMENTS ON APPROVED INSTITUTION
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active institution endorsements" ON public.institution_endorsements;
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
  ) AND
  EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = institution_endorsements.institution_id
      AND i.status = 'approved'
  )
);

-- -----------------------------------------------------------------------------
-- 5. DEFAULT is_credential_verified TO FALSE ON institution_endorsements
-- -----------------------------------------------------------------------------
ALTER TABLE public.institution_endorsements ALTER COLUMN is_credential_verified SET DEFAULT false;

-- -----------------------------------------------------------------------------
-- 6. SCHOLAR ENDORSEMENTS: IMMUTABILITY TRIGGER & TIGHTENED WITH CHECK
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Recipients can update endorsement status" ON public.scholar_endorsements;
CREATE POLICY "Recipients can update endorsement status"
ON public.scholar_endorsements
FOR UPDATE
TO authenticated
USING (
  recipient_scholar_id = (SELECT public.get_current_scholar_id())
)
WITH CHECK (
  recipient_scholar_id = (SELECT public.get_current_scholar_id()) AND
  status IN ('approved', 'declined', 'hidden')
);

CREATE OR REPLACE FUNCTION public.protect_scholar_endorsement_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.endorser_scholar_id <> OLD.endorser_scholar_id OR
       NEW.recipient_scholar_id <> OLD.recipient_scholar_id OR
       NEW.relationship <> OLD.relationship OR
       NEW.subject_area <> OLD.subject_area OR
       NEW.endorsement_text <> OLD.endorsement_text THEN
      RAISE EXCEPTION 'Endorsement content, relationship, and scholar associations are immutable. Only status may be changed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_scholar_endorsement_immutability ON public.scholar_endorsements;
CREATE TRIGGER trg_protect_scholar_endorsement_immutability
  BEFORE UPDATE ON public.scholar_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_scholar_endorsement_immutability();

-- -----------------------------------------------------------------------------
-- 7. CORRECT DISCIPLINE ID MAPPINGS ON PILOT POSTINGS
-- -----------------------------------------------------------------------------
UPDATE public.institution_postings
SET discipline_id = 'd1000000-0000-0000-0000-000000000004'
WHERE slug = 'adjunct-prof-historical-theology-wts';

UPDATE public.institution_postings
SET discipline_id = 'd1000000-0000-0000-0000-000000000003'
WHERE slug = 'assistant-prof-systematic-theology-sbts';
