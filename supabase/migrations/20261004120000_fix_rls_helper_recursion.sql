-- ==============================================================================
-- FaithFull Scholars — Corrective Migration: RLS Helper Recursion
--
-- Problem: public.is_admin(), public.get_current_scholar_id() and
-- public.is_institution_user() were SECURITY INVOKER, so the tables they read
-- (accounts, scholars, institution_users) were filtered by RLS policies that
-- themselves call those helpers. For any real `anon` / `authenticated` caller
-- this recurses (e.g. accounts SELECT -> is_admin() -> accounts SELECT -> ...).
-- The "Institution owner or admin can manage users" policy additionally queried
-- institution_users from inside its own policy. Tests never caught this because
-- every integration test connected as a role that bypasses RLS.
--
-- Fix: owner-privileged (SECURITY DEFINER) twins live in a `private` schema that
-- PostgREST does not expose (supabase/config.toml [api].schemas), so they are not
-- callable as /rest/v1/rpc endpoints. The existing public helpers keep their
-- names and signatures as SECURITY INVOKER wrappers, so no existing policy needs
-- to be rewritten except the self-referencing institution_users policy.
--
-- No tables, columns, or rows are changed.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 1. Privileged helpers (not exposed through the API)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.get_current_scholar_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.scholars
  WHERE account_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.is_institution_user(target_inst_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institution_users
    WHERE account_id = (SELECT auth.uid()) AND institution_id = target_inst_id
  );
$$;

CREATE OR REPLACE FUNCTION private.is_institution_owner(target_inst_id UUID)
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
      AND role = 'owner'
  );
$$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
-- anon needs EXECUTE because public-read policies (e.g. scholars) call is_admin().
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_current_scholar_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_institution_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_institution_owner(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. Public helpers become thin SECURITY INVOKER wrappers (same signatures)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.get_current_scholar_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private.get_current_scholar_id();
$$;

CREATE OR REPLACE FUNCTION public.is_institution_user(target_inst_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private.is_institution_user(target_inst_id);
$$;

CREATE OR REPLACE FUNCTION public.is_institution_owner(target_inst_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private.is_institution_owner(target_inst_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_institution_owner(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Replace the self-referencing institution_users policy
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Institution owner or admin can manage users" ON public.institution_users;
CREATE POLICY "Institution owner or admin can manage users"
  ON public.institution_users FOR ALL
  USING (public.is_institution_owner(institution_id) OR public.is_admin())
  WITH CHECK (public.is_institution_owner(institution_id) OR public.is_admin());
