-- ==============================================================================
-- FaithFull Scholars — Database follow-ups
--
-- 1. Institution profile edits are limited to the institution's owners and
--    admins (plus platform admins). Recruiters and plain members keep read
--    access but their UPDATE now matches zero rows. See ADR 0023.
-- 2. Drops the legacy search limiter (public.check_search_rate_limit and
--    public.search_rate_limits). ADR 0026 replaced it with check_rate_limit /
--    rate_limit_buckets, and nothing calls the legacy objects any more.
--
-- Idempotent: safe to re-run. No CASCADE: if anything still depends on the
-- legacy objects the drop fails loudly instead of removing the dependents.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Preflight (ENFORCED): abort on a real lockout only, that is an institution
--    that HAS members but none of them is an owner or admin, so tightening the
--    UPDATE policy would leave nobody able to edit it. Institutions with no
--    members at all (e.g. seed institutions) are unaffected: only platform
--    admins can edit them, which is correct. The integration test extracts the
--    block between the PREFLIGHT markers and runs that exact text.
-- ------------------------------------------------------------------------------
-- PREFLIGHT-BEGIN
DO $preflight$
DECLARE
  locked_out INT;
BEGIN
  SELECT count(*) INTO locked_out
  FROM public.institutions i
  WHERE EXISTS (
          SELECT 1 FROM public.institution_users m WHERE m.institution_id = i.id
        )
    AND NOT EXISTS (
          SELECT 1 FROM public.institution_users iu
          WHERE iu.institution_id = i.id AND iu.role IN ('owner', 'admin')
        );
  IF locked_out > 0 THEN
    RAISE EXCEPTION 'Preflight failed: % institution(s) have members but no owner or admin. Promote a member to owner or admin before applying this migration.', locked_out;
  END IF;
END
$preflight$;
-- PREFLIGHT-END

-- ------------------------------------------------------------------------------
-- 1. Helper: owner/admin role check (same private/public pattern as 20261004120000)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_institution_admin(target_inst_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institution_users
    WHERE account_id = (SELECT auth.uid())
      AND institution_id = target_inst_id
      AND role IN ('owner', 'admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_institution_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_institution_admin(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_institution_admin(target_inst_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private.is_institution_admin(target_inst_id);
$$;

REVOKE EXECUTE ON FUNCTION public.is_institution_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_institution_admin(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. institutions UPDATE: owners/admins and platform admins only
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Institution staff or admin can update institution" ON public.institutions;
DROP POLICY IF EXISTS "Institution owner or admin can update institution" ON public.institutions;
CREATE POLICY "Institution owner or admin can update institution"
  ON public.institutions FOR UPDATE
  USING (public.is_institution_admin(id) OR public.is_admin())
  WITH CHECK (public.is_institution_admin(id) OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Drop the legacy search limiter (replaced by check_rate_limit, ADR 0026)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.check_search_rate_limit(TEXT, INT, BOOLEAN);
DROP TABLE IF EXISTS public.search_rate_limits;
