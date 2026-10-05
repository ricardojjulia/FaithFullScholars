-- ==============================================================================
-- FaithFull Scholars — Trust Guards Phase 2 (ADR 0023, Council Review 12 C-1)
--
-- Extends the 20261005090000 pattern to the remaining tables whose UPDATE/INSERT
-- policies authorize rows but not columns or state transitions:
--   * institution_subscriptions — members could set their own tier and limits
--   * institution_contracts     — institution could accept on the scholar's
--                                 behalf; scholar could rewrite compensation
--   * contract_milestones       — either side could rewrite amounts / statuses
--   * course_licensing_agreements — forged signatures / 'active' status; courses
--                                 licensed from a scholar who doesn't own them;
--                                 terms swapped after the other party signed
--   * institution_endorsements  — pending institutions could issue "verified"
--                                 endorsements
--   * consortiums / consortium_members — pending institutions could create
--                                 consortia and list any institution as an
--                                 active member without its consent
--
-- Party flags are COALESCEd to false: `scholar_id = get_current_scholar_id()` is
-- NULL (not false) for non-scholars, and NOT NULL would silently skip a refusal
-- (caught by the policy-matrix gate on its first run).
--
-- Restrictions apply only to callers private.is_restricted_caller() reports as
-- restricted (non-admin anon/authenticated, fail-closed). Service role and
-- server-side admin actions are unaffected. No tables, columns, or rows change.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Helpers
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_approved_institution(target_inst_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institutions WHERE id = target_inst_id AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION private.institution_member_role(target_inst_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.institution_users
  WHERE institution_id = target_inst_id AND account_id = (SELECT auth.uid())
  LIMIT 1;
$$;

-- Owner-privileged lookups so the guard triggers can stay SECURITY INVOKER
-- (and therefore fail closed on current_user) while reading related rows.
CREATE OR REPLACE FUNCTION private.contract_parties(target_contract_id UUID)
RETURNS TABLE (institution_id UUID, scholar_id UUID, status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.institution_id, c.scholar_id, c.status
  FROM public.institution_contracts c WHERE c.id = target_contract_id;
$$;

CREATE OR REPLACE FUNCTION private.course_offered_by(target_course_id UUID, target_scholar_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses WHERE id = target_course_id AND scholar_id = target_scholar_id
  );
$$;

CREATE OR REPLACE FUNCTION private.consortium_lead(target_consortium_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lead_institution_id FROM public.consortiums WHERE id = target_consortium_id;
$$;

REVOKE EXECUTE ON FUNCTION private.contract_parties(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.course_offered_by(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.consortium_lead(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.contract_parties(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.course_offered_by(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.consortium_lead(UUID) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION private.is_approved_institution(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.institution_member_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_approved_institution(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.institution_member_role(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 1. institution_subscriptions — plan changes are billing/admin-only
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_institution_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_restricted_caller() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.tier <> 'basic' OR NEW.status <> 'active'
       OR NEW.seats_limit <> 1 OR NEW.monthly_inquiry_limit <> 5
       OR NEW.inquiries_used_current_month NOT IN (0, 1) THEN
      RAISE EXCEPTION 'Unauthorized: new subscriptions start on the basic plan' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- The only member-writable change: recording one more sent inquiry.
  IF NEW.institution_id IS DISTINCT FROM OLD.institution_id
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.billing_cycle IS DISTINCT FROM OLD.billing_cycle
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.seats_limit IS DISTINCT FROM OLD.seats_limit
     OR NEW.monthly_inquiry_limit IS DISTINCT FROM OLD.monthly_inquiry_limit
     OR NEW.current_period_start IS DISTINCT FROM OLD.current_period_start
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR (NEW.inquiries_used_current_month IS DISTINCT FROM OLD.inquiries_used_current_month
         AND NEW.inquiries_used_current_month <> OLD.inquiries_used_current_month + 1) THEN
    RAISE EXCEPTION 'Unauthorized: subscription plans and limits are managed by FaithFull Scholars' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_institution_subscriptions ON public.institution_subscriptions;
CREATE TRIGGER trg_guard_institution_subscriptions
  BEFORE INSERT OR UPDATE ON public.institution_subscriptions
  FOR EACH ROW EXECUTE FUNCTION private.guard_institution_subscriptions();

-- ------------------------------------------------------------------------------
-- 2. institution_contracts — each party controls only its own decisions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_institution_contracts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  is_inst BOOLEAN;
  is_scholar BOOLEAN;
  terms_changed BOOLEAN;
BEGIN
  IF NOT private.is_restricted_caller() THEN
    RETURN NEW;
  END IF;

  is_inst := COALESCE(private.is_institution_user(NEW.institution_id), false);
  is_scholar := COALESCE(NEW.scholar_id = private.get_current_scholar_id(), false);

  IF TG_OP = 'INSERT' THEN
    IF NOT is_inst OR NOT private.is_approved_institution(NEW.institution_id) THEN
      RAISE EXCEPTION 'Unauthorized: only approved institutions can offer contracts' USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('draft', 'offered') OR NEW.scholar_notes IS NOT NULL THEN
      RAISE EXCEPTION 'Unauthorized: new contracts start as draft or offered' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.institution_id IS DISTINCT FROM OLD.institution_id
     OR NEW.scholar_id IS DISTINCT FROM OLD.scholar_id
     OR NEW.inquiry_id IS DISTINCT FROM OLD.inquiry_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Unauthorized: contract parties cannot be changed' USING ERRCODE = '42501';
  END IF;

  terms_changed :=
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.scope_of_work IS DISTINCT FROM OLD.scope_of_work
    OR NEW.opportunity_type IS DISTINCT FROM OLD.opportunity_type
    OR NEW.start_date IS DISTINCT FROM OLD.start_date
    OR NEW.end_date IS DISTINCT FROM OLD.end_date
    OR NEW.total_compensation_amount IS DISTINCT FROM OLD.total_compensation_amount
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.payment_terms IS DISTINCT FROM OLD.payment_terms;

  IF is_inst THEN
    IF NEW.scholar_notes IS DISTINCT FROM OLD.scholar_notes THEN
      RAISE EXCEPTION 'Unauthorized: scholar notes belong to the scholar' USING ERRCODE = '42501';
    END IF;
    IF terms_changed AND OLD.status NOT IN ('draft', 'offered') THEN
      RAISE EXCEPTION 'Unauthorized: contract terms are locked once the scholar has responded' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
         (OLD.status = 'draft' AND NEW.status IN ('offered', 'cancelled'))
      OR (OLD.status = 'offered' AND NEW.status IN ('draft', 'cancelled'))
      OR (OLD.status = 'accepted' AND NEW.status IN ('in_progress', 'cancelled'))
      OR (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Unauthorized: institutions cannot move a contract from % to %', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  ELSIF is_scholar THEN
    IF terms_changed OR NEW.institution_notes IS DISTINCT FROM OLD.institution_notes THEN
      RAISE EXCEPTION 'Unauthorized: scholars can respond to a contract but not rewrite it' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'offered' AND NEW.status IN ('accepted', 'declined')) THEN
      RAISE EXCEPTION 'Unauthorized: scholars can only accept or decline an offered contract' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized: not a party to this contract' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_institution_contracts ON public.institution_contracts;
CREATE TRIGGER trg_guard_institution_contracts
  BEFORE INSERT OR UPDATE ON public.institution_contracts
  FOR EACH ROW EXECUTE FUNCTION private.guard_institution_contracts();

-- ------------------------------------------------------------------------------
-- 3. contract_milestones — scholar submits; institution verifies and pays
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_contract_milestones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  parent RECORD;
  is_inst BOOLEAN;
  is_scholar BOOLEAN;
BEGIN
  IF NOT private.is_restricted_caller() THEN
    RETURN NEW;
  END IF;

  SELECT * INTO parent FROM private.contract_parties(NEW.contract_id);

  is_inst := COALESCE(private.is_institution_user(parent.institution_id), false);
  is_scholar := COALESCE(parent.scholar_id = private.get_current_scholar_id(), false);

  IF TG_OP = 'INSERT' THEN
    IF NOT is_inst OR parent.status NOT IN ('draft', 'offered')
       OR NEW.status <> 'pending' OR NEW.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Unauthorized: milestones are added by the institution before the scholar responds' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.contract_id IS DISTINCT FROM OLD.contract_id THEN
    RAISE EXCEPTION 'Unauthorized: milestones cannot move between contracts' USING ERRCODE = '42501';
  END IF;

  IF is_inst THEN
    IF NEW.compensation_amount IS DISTINCT FROM OLD.compensation_amount
       AND parent.status NOT IN ('draft', 'offered') THEN
      RAISE EXCEPTION 'Unauthorized: milestone compensation is locked once the scholar has responded' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('verified', 'paid', 'pending') THEN
      RAISE EXCEPTION 'Unauthorized: only the scholar can mark a milestone submitted' USING ERRCODE = '42501';
    END IF;
  ELSIF is_scholar THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.compensation_amount IS DISTINCT FROM OLD.compensation_amount
       OR NEW.display_order IS DISTINCT FROM OLD.display_order
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Unauthorized: scholars can only submit milestones' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status IN ('pending', 'submitted') AND NEW.status IN ('pending', 'submitted')) THEN
      RAISE EXCEPTION 'Unauthorized: only the institution can verify or pay a milestone' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized: not a party to this contract' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_contract_milestones ON public.contract_milestones;
CREATE TRIGGER trg_guard_contract_milestones
  BEFORE INSERT OR UPDATE ON public.contract_milestones
  FOR EACH ROW EXECUTE FUNCTION private.guard_contract_milestones();

-- ------------------------------------------------------------------------------
-- 4. course_licensing_agreements — each side signs only for itself
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_course_licensing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  is_inst BOOLEAN;
  is_scholar BOOLEAN;
  terms_changed BOOLEAN;
BEGIN
  IF NOT private.is_restricted_caller() THEN
    RETURN NEW;
  END IF;

  is_inst := COALESCE(private.is_institution_user(NEW.institution_id), false);
  is_scholar := COALESCE(NEW.scholar_id = private.get_current_scholar_id(), false);

  IF TG_OP = 'INSERT' THEN
    IF NOT is_inst OR NOT private.is_approved_institution(NEW.institution_id) THEN
      RAISE EXCEPTION 'Unauthorized: only approved institutions can request course licenses' USING ERRCODE = '42501';
    END IF;
    IF NOT private.course_offered_by(NEW.course_id, NEW.scholar_id) THEN
      RAISE EXCEPTION 'Unauthorized: a course can only be licensed from the scholar who offers it' USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('draft', 'requested') OR NEW.signed_by_scholar_at IS NOT NULL THEN
      RAISE EXCEPTION 'Unauthorized: new license requests cannot be pre-signed for the scholar' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.scholar_id IS DISTINCT FROM OLD.scholar_id
     OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
     OR NEW.consortium_id IS DISTINCT FROM OLD.consortium_id THEN
    RAISE EXCEPTION 'Unauthorized: license parties cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NOT is_inst AND NOT is_scholar THEN
    RAISE EXCEPTION 'Unauthorized: not a party to this license' USING ERRCODE = '42501';
  END IF;

  IF NEW.signed_by_scholar_at IS DISTINCT FROM OLD.signed_by_scholar_at AND NOT is_scholar THEN
    RAISE EXCEPTION 'Unauthorized: only the scholar can sign for the scholar' USING ERRCODE = '42501';
  END IF;
  IF NEW.signed_by_institution_at IS DISTINCT FROM OLD.signed_by_institution_at AND NOT is_inst THEN
    RAISE EXCEPTION 'Unauthorized: only the institution can sign for the institution' USING ERRCODE = '42501';
  END IF;

  terms_changed :=
    NEW.license_type IS DISTINCT FROM OLD.license_type
    OR NEW.term_duration IS DISTINCT FROM OLD.term_duration
    OR NEW.royalty_amount IS DISTINCT FROM OLD.royalty_amount
    OR NEW.permitted_students_count IS DISTINCT FROM OLD.permitted_students_count
    OR NEW.custom_terms IS DISTINCT FROM OLD.custom_terms;

  IF terms_changed THEN
    IF OLD.status IN ('active', 'expired', 'terminated') THEN
      RAISE EXCEPTION 'Unauthorized: license terms are locked once active' USING ERRCODE = '42501';
    END IF;
    -- New terms void the other party's earlier signature.
    IF is_scholar AND NOT is_inst THEN
      NEW.signed_by_institution_at := NULL;
    ELSIF is_inst AND NOT is_scholar THEN
      NEW.signed_by_scholar_at := NULL;
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'active'
       AND (NEW.signed_by_scholar_at IS NULL OR NEW.signed_by_institution_at IS NULL) THEN
      RAISE EXCEPTION 'Unauthorized: a license is active only when both parties have signed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'expired' OR OLD.status IN ('expired', 'terminated') THEN
      RAISE EXCEPTION 'Unauthorized: license status % → % is managed by FaithFull Scholars', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_course_licensing ON public.course_licensing_agreements;
CREATE TRIGGER trg_guard_course_licensing
  BEFORE INSERT OR UPDATE ON public.course_licensing_agreements
  FOR EACH ROW EXECUTE FUNCTION private.guard_course_licensing();

-- ------------------------------------------------------------------------------
-- 5. institution_endorsements — approved institutions only; "verified" requires
--    the institution's owner or admin
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_institution_endorsements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_restricted_caller() THEN
    RETURN NEW;
  END IF;

  IF NOT private.is_approved_institution(NEW.institution_id) THEN
    RAISE EXCEPTION 'Unauthorized: only approved institutions can issue endorsements' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND (
       NEW.institution_id IS DISTINCT FROM OLD.institution_id
       OR NEW.scholar_id IS DISTINCT FROM OLD.scholar_id) THEN
    RAISE EXCEPTION 'Unauthorized: endorsement parties cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.is_credential_verified
     AND (TG_OP = 'INSERT' OR NOT OLD.is_credential_verified)
     AND COALESCE(private.institution_member_role(NEW.institution_id), '') NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only the institution''s owner or admin can mark an endorsement credential-verified' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_institution_endorsements ON public.institution_endorsements;
CREATE TRIGGER trg_guard_institution_endorsements
  BEFORE INSERT OR UPDATE ON public.institution_endorsements
  FOR EACH ROW EXECUTE FUNCTION private.guard_institution_endorsements();

-- ------------------------------------------------------------------------------
-- 6. consortiums & consortium_members — no affiliation without consent
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_consortiums()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_restricted_caller() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NOT private.is_approved_institution(NEW.lead_institution_id) THEN
    RAISE EXCEPTION 'Unauthorized: only approved institutions can found a consortium' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND (
       NEW.lead_institution_id IS DISTINCT FROM OLD.lead_institution_id
       OR NEW.slug IS DISTINCT FROM OLD.slug) THEN
    RAISE EXCEPTION 'Unauthorized: consortium leadership and slug are managed by FaithFull Scholars' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_consortiums ON public.consortiums;
CREATE TRIGGER trg_guard_consortiums
  BEFORE INSERT OR UPDATE ON public.consortiums
  FOR EACH ROW EXECUTE FUNCTION private.guard_consortiums();

CREATE OR REPLACE FUNCTION private.guard_consortium_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  lead_id UUID;
BEGIN
  IF NOT private.is_restricted_caller() THEN
    RETURN NEW;
  END IF;

  lead_id := private.consortium_lead(NEW.consortium_id);

  IF TG_OP = 'UPDATE' AND (
       NEW.consortium_id IS DISTINCT FROM OLD.consortium_id
       OR NEW.institution_id IS DISTINCT FROM OLD.institution_id) THEN
    RAISE EXCEPTION 'Unauthorized: membership parties cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.institution_id IS DISTINCT FROM lead_id THEN
    -- Another institution: may be invited (pending) or removed (inactive), never
    -- listed as an active member or as lead without its own consent.
    IF NEW.role = 'lead' THEN
      RAISE EXCEPTION 'Unauthorized: only the founding institution leads a consortium' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
      RAISE EXCEPTION 'Unauthorized: an institution must accept a consortium invitation itself' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_consortium_members ON public.consortium_members;
CREATE TRIGGER trg_guard_consortium_members
  BEFORE INSERT OR UPDATE ON public.consortium_members
  FOR EACH ROW EXECUTE FUNCTION private.guard_consortium_members();

REVOKE EXECUTE ON FUNCTION private.guard_institution_subscriptions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_institution_contracts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_contract_milestones() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_course_licensing() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_institution_endorsements() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_consortiums() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.guard_consortium_members() FROM PUBLIC;
