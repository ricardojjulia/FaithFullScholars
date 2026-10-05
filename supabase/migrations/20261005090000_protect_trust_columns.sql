-- ==============================================================================
-- FaithFull Scholars — Corrective Migration: Protect Trust & Privilege Columns
--
-- Several UPDATE policies authorize *which rows* a caller may change but not
-- *which columns*, and have no WITH CHECK. Through PostgREST (anon key + the
-- user's own JWT) that let any signed-in user:
--   * accounts:     set their own role = 'admin'            (privilege escalation)
--   * scholars:     set their own profile_status = 'approved', verification_status,
--                   published_revision_id                   (bypass admin review)
--   * institutions: set their own status = 'approved' or accreditation fields
--   * inquiries:    as an institution member, mark an inquiry 'accepted' (the
--                   scholar's decision) or rewrite its parties/message; and INSERT
--                   inquiries from an unapproved institution or to an unapproved
--                   scholar (approval was enforced in application code only).
--
-- Fix: BEFORE INSERT/UPDATE triggers, following the existing pattern of
-- public.prevent_scholar_tier_escalation (20260924140000): restrictions apply to
-- `anon` / `authenticated` callers who are not platform admins. A caller counts
-- as restricted if EITHER its database role or its JWT role is anon/authenticated,
-- so a session that switches role without JWT claims fails closed. The guard
-- functions are SECURITY INVOKER so `current_user` is the caller's role (inside a
-- SECURITY DEFINER function it would be the owner); they call the owner-privileged
-- private.is_admin() / get_current_scholar_id() helpers. The service
-- role and direct database sessions (migrations, seeds, server-side admin
-- actions) are unaffected. The inquiry INSERT policy additionally requires an
-- approved institution and an approved scholar.
--
-- No tables, columns, or rows are changed.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Shared predicate
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_restricted_caller()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT (
      current_user IN ('authenticated', 'anon')
      OR COALESCE((SELECT auth.role()), '') IN ('authenticated', 'anon')
    )
    AND NOT private.is_admin();
$$;

REVOKE EXECUTE ON FUNCTION private.is_restricted_caller() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_restricted_caller() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 1. accounts — role and identity are never self-assignable
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF private.is_restricted_caller() THEN
    IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
      RAISE EXCEPTION 'Unauthorized: accounts.role cannot be self-assigned' USING ERRCODE = '42501';
    ELSIF TG_OP = 'UPDATE' AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.id IS DISTINCT FROM OLD.id
      OR NEW.email IS DISTINCT FROM OLD.email
    ) THEN
      RAISE EXCEPTION 'Unauthorized: accounts.role, id, and email are managed by the platform' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_accounts ON public.accounts;
CREATE TRIGGER trg_guard_accounts
  BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION private.guard_accounts();

-- ------------------------------------------------------------------------------
-- 2. scholars — publication & verification state belong to admin review
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_scholars()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF private.is_restricted_caller() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.profile_status <> 'draft'
         OR NEW.verification_status <> 'unverified'
         OR NEW.published_revision_id IS NOT NULL THEN
        RAISE EXCEPTION 'Unauthorized: new scholar profiles start as unverified drafts' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.profile_status IS DISTINCT FROM OLD.profile_status
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.published_revision_id IS DISTINCT FROM OLD.published_revision_id
       OR NEW.account_id IS DISTINCT FROM OLD.account_id THEN
      RAISE EXCEPTION 'Unauthorized: publication and verification status are set by admin review' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_scholars ON public.scholars;
CREATE TRIGGER trg_guard_scholars
  BEFORE INSERT OR UPDATE ON public.scholars
  FOR EACH ROW EXECUTE FUNCTION private.guard_scholars();

-- ------------------------------------------------------------------------------
-- 3. institutions — approval & accreditation are verified by admins
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_institutions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF private.is_restricted_caller() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'pending'
         OR COALESCE(NEW.accreditation_body, 'none') <> 'none'
         OR COALESCE(NEW.accreditation_status, 'none') <> 'none'
         OR NEW.accreditation_verified_at IS NOT NULL THEN
        RAISE EXCEPTION 'Unauthorized: new institutions start pending and unaccredited' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.slug IS DISTINCT FROM OLD.slug
       OR NEW.accreditation_body IS DISTINCT FROM OLD.accreditation_body
       OR NEW.accreditation_status IS DISTINCT FROM OLD.accreditation_status
       OR NEW.accreditation_verified_at IS DISTINCT FROM OLD.accreditation_verified_at THEN
      RAISE EXCEPTION 'Unauthorized: institution approval and accreditation are verified by platform admins' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_institutions ON public.institutions;
CREATE TRIGGER trg_guard_institutions
  BEFORE INSERT OR UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION private.guard_institutions();

-- ------------------------------------------------------------------------------
-- 4. inquiries — parties and content are immutable; only the recipient
--    scholar may accept or decline; new inquiries start pending
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_inquiries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF private.is_restricted_caller() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'pending' THEN
        RAISE EXCEPTION 'Unauthorized: new inquiries start pending' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.institution_id IS DISTINCT FROM OLD.institution_id
         OR NEW.scholar_id IS DISTINCT FROM OLD.scholar_id
         OR NEW.sender_account_id IS DISTINCT FROM OLD.sender_account_id
         OR NEW.course_id IS DISTINCT FROM OLD.course_id
         OR NEW.message IS DISTINCT FROM OLD.message
         OR NEW.contact_email IS DISTINCT FROM OLD.contact_email
         OR NEW.opportunity_type IS DISTINCT FROM OLD.opportunity_type THEN
        RAISE EXCEPTION 'Unauthorized: inquiry parties and content cannot be changed' USING ERRCODE = '42501';
      END IF;
      -- Moving INTO or OUT OF accepted/declined is the recipient scholar's decision
      -- (so a sender cannot accept on the scholar's behalf, or reopen a decision).
      IF NEW.status IS DISTINCT FROM OLD.status
         AND (NEW.status IN ('accepted', 'declined') OR OLD.status IN ('accepted', 'declined'))
         AND OLD.scholar_id IS DISTINCT FROM private.get_current_scholar_id() THEN
        RAISE EXCEPTION 'Unauthorized: only the recipient scholar can accept, decline, or reopen a decided inquiry' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_inquiries ON public.inquiries;
CREATE TRIGGER trg_guard_inquiries
  BEFORE INSERT OR UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION private.guard_inquiries();

-- Approval was previously enforced only in application code (sendInquiry);
-- a direct PostgREST insert by a member of a pending institution bypassed it.
DROP POLICY IF EXISTS "Approved institution members can create inquiries" ON public.inquiries;
CREATE POLICY "Approved institution members can create inquiries"
  ON public.inquiries FOR INSERT
  WITH CHECK (
    (
      public.is_institution_user(institution_id)
      AND sender_account_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.institutions i
        WHERE i.id = inquiries.institution_id AND i.status = 'approved'
      )
      AND EXISTS (
        SELECT 1 FROM public.scholars s
        WHERE s.id = inquiries.scholar_id AND s.profile_status = 'approved'
      )
    )
    OR public.is_admin()
  );

REVOKE EXECUTE ON FUNCTION private.guard_accounts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_scholars() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_institutions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_inquiries() FROM PUBLIC;
