-- ==============================================================================
-- FaithFull Scholars — Scholar Revision Lifecycle & Atomic Admin Review
-- (ADR 0024; extends ADR 0005, 0022, 0023)
--
-- Defects fixed:
--   * A scholar could INSERT a revision already marked 'approved' (no status check
--     on the INSERT policy) and could not submit (UPDATE policy: draft rows only,
--     no WITH CHECK).
--   * 'rejected' was not a valid status, so admin reject always failed.
--   * Approval was several non-atomic calls, never superseded the prior published
--     revision and never cleared scholars.draft_revision_id.
--   * The published revision (including admin_notes) was readable by anyone.
--
-- Design: SECURITY INVOKER guard trigger (fail closed via
-- private.is_restricted_caller()), private DEFINER lookups, tightened policies,
-- and one service_role-only SECURITY DEFINER function for admin review.
-- Service role and direct database sessions are unaffected by the guards.
-- No rows are changed. Preflight: there must be at most one open revision
-- (draft/submitted/changes_requested) per scholar before the unique index is built.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Constraints and index
-- ------------------------------------------------------------------------------
ALTER TABLE public.scholar_profile_revisions
  DROP CONSTRAINT IF EXISTS scholar_profile_revisions_status_check;
ALTER TABLE public.scholar_profile_revisions
  ADD CONSTRAINT scholar_profile_revisions_status_check
  CHECK (status IN ('draft', 'submitted', 'changes_requested', 'approved', 'superseded', 'rejected'));

ALTER TABLE public.scholar_profile_revisions
  DROP CONSTRAINT IF EXISTS scholar_profile_revisions_snapshot_data_check;
ALTER TABLE public.scholar_profile_revisions
  ADD CONSTRAINT scholar_profile_revisions_snapshot_data_check
  CHECK (
    jsonb_typeof(snapshot_data) = 'object'
    AND octet_length(snapshot_data::text) <= 262144
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_scholar_one_open_revision
  ON public.scholar_profile_revisions (scholar_id)
  WHERE status IN ('draft', 'submitted', 'changes_requested');

-- ------------------------------------------------------------------------------
-- 2. Owner-privileged helpers (private schema, not exposed through the API)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.next_revision_number(p_scholar UUID)
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Serialises concurrent inserts for one scholar until the transaction ends.
  PERFORM pg_advisory_xact_lock(hashtext(p_scholar::text));
  RETURN COALESCE(
    (SELECT max(r.revision_number) FROM public.scholar_profile_revisions r WHERE r.scholar_id = p_scholar),
    0
  ) + 1;
END;
$$;

CREATE OR REPLACE FUNCTION private.revision_is_open_of(p_revision UUID, p_scholar UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scholar_profile_revisions r
    WHERE r.id = p_revision
      AND r.scholar_id = p_scholar
      AND r.status IN ('draft', 'submitted', 'changes_requested')
  );
$$;

REVOKE EXECUTE ON FUNCTION private.next_revision_number(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.revision_is_open_of(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.next_revision_number(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.revision_is_open_of(UUID, UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Guard trigger — who may make which transition on a revision
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_scholar_profile_revisions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  own BOOLEAN;
BEGIN
  IF NOT private.is_restricted_caller() THEN
    RETURN NEW;
  END IF;

  -- NULL (non-scholar caller) must read as "not the owner", never skip a refusal.
  own := COALESCE(NEW.scholar_id = private.get_current_scholar_id(), false);

  IF TG_OP = 'INSERT' THEN
    IF NOT own
       OR NEW.status IS DISTINCT FROM 'draft'
       OR NEW.admin_notes IS NOT NULL
       OR NEW.reviewed_at IS NOT NULL
       OR NEW.submitted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Unauthorized: scholars may only create their own draft revisions' USING ERRCODE = '42501';
    END IF;
    NEW.revision_number := private.next_revision_number(NEW.scholar_id);
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- UPDATE: compare what the client sent (NEW) with OLD before overwriting anything.
  IF OLD.scholar_id IS DISTINCT FROM NEW.scholar_id OR NOT own THEN
    RAISE EXCEPTION 'Unauthorized: revisions can only be changed by their owner' USING ERRCODE = '42501';
  END IF;

  IF NEW.revision_number IS DISTINCT FROM OLD.revision_number
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'Unauthorized: revision numbering and review fields are managed by the platform' USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('approved', 'superseded', 'rejected') THEN
    RAISE EXCEPTION 'Unauthorized: finalized revisions cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.snapshot_data IS DISTINCT FROM OLD.snapshot_data
     AND OLD.status NOT IN ('draft', 'changes_requested') THEN
    RAISE EXCEPTION 'Unauthorized: a revision under review cannot be edited' USING ERRCODE = '42501';
  END IF;

  IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
    NULL; -- save
  ELSIF OLD.status = 'changes_requested' AND NEW.status = 'changes_requested' THEN
    NULL; -- save
  ELSIF OLD.status IN ('draft', 'changes_requested') AND NEW.status = 'submitted' THEN
    NEW.submitted_at := now();
    NEW.reviewed_at := NULL;
  ELSIF OLD.status = 'submitted' AND NEW.status = 'draft' AND OLD.reviewed_at IS NULL THEN
    NEW.submitted_at := NULL; -- withdraw
  ELSIF OLD.status = 'changes_requested' AND NEW.status = 'draft' THEN
    NULL;
  ELSIF OLD.status = 'submitted' AND NEW.status = 'submitted' THEN
    NULL; -- snapshot already verified unchanged above
  ELSE
    RAISE EXCEPTION 'Unauthorized: this revision status change is not allowed' USING ERRCODE = '42501';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_scholar_profile_revisions ON public.scholar_profile_revisions;
CREATE TRIGGER trg_guard_scholar_profile_revisions
  BEFORE INSERT OR UPDATE ON public.scholar_profile_revisions
  FOR EACH ROW EXECUTE FUNCTION private.guard_scholar_profile_revisions();

REVOKE EXECUTE ON FUNCTION private.guard_scholar_profile_revisions() FROM PUBLIC;

-- ------------------------------------------------------------------------------
-- 4. Policies — owner and admin only; no scholar DELETE
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Scholars can view own revisions" ON public.scholar_profile_revisions;
DROP POLICY IF EXISTS "Scholars can insert own revisions" ON public.scholar_profile_revisions;
DROP POLICY IF EXISTS "Scholars can update own draft revisions" ON public.scholar_profile_revisions;
DROP POLICY IF EXISTS "Scholars can update own open revisions" ON public.scholar_profile_revisions;
DROP POLICY IF EXISTS "Scholars can delete own revisions" ON public.scholar_profile_revisions;
DROP POLICY IF EXISTS "Admins can delete revisions" ON public.scholar_profile_revisions;

CREATE POLICY "Scholars can view own revisions"
  ON public.scholar_profile_revisions FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
  );

CREATE POLICY "Scholars can insert own revisions"
  ON public.scholar_profile_revisions FOR INSERT
  WITH CHECK (
    (scholar_id = public.get_current_scholar_id() AND status = 'draft')
    OR public.is_admin()
  );

CREATE POLICY "Scholars can update own open revisions"
  ON public.scholar_profile_revisions FOR UPDATE
  USING (
    (scholar_id = public.get_current_scholar_id() AND status IN ('draft', 'submitted', 'changes_requested'))
    OR public.is_admin()
  )
  WITH CHECK (
    (scholar_id = public.get_current_scholar_id() AND status IN ('draft', 'submitted', 'changes_requested'))
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 5. scholars — draft_revision_id may only point at the scholar's own open revision
--    (every pre-existing check is kept verbatim from 20261005090000)
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
      IF NEW.draft_revision_id IS NOT NULL THEN
        RAISE EXCEPTION 'Unauthorized: new scholar profiles cannot reference a revision' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.profile_status IS DISTINCT FROM OLD.profile_status
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.published_revision_id IS DISTINCT FROM OLD.published_revision_id
       OR NEW.account_id IS DISTINCT FROM OLD.account_id THEN
      RAISE EXCEPTION 'Unauthorized: publication and verification status are set by admin review' USING ERRCODE = '42501';
    ELSIF NEW.draft_revision_id IS DISTINCT FROM OLD.draft_revision_id
       AND NEW.draft_revision_id IS NOT NULL
       AND NOT COALESCE(private.revision_is_open_of(NEW.draft_revision_id, NEW.id), false) THEN
      RAISE EXCEPTION 'Unauthorized: draft_revision_id must reference your own open revision' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_scholars ON public.scholars;
CREATE TRIGGER trg_guard_scholars
  BEFORE INSERT OR UPDATE ON public.scholars
  FOR EACH ROW EXECUTE FUNCTION private.guard_scholars();

REVOKE EXECUTE ON FUNCTION private.guard_scholars() FROM PUBLIC;

-- ------------------------------------------------------------------------------
-- 6. Atomic admin review — service_role only
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_profile_revision(
  p_revision_id UUID,
  p_action TEXT,
  p_notes TEXT,
  p_reviewer UUID
)
RETURNS TABLE (scholar_id UUID, revision_id UUID, revision_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_rev public.scholar_profile_revisions%ROWTYPE;
  v_sch public.scholars%ROWTYPE;
  v_snap JSONB;
  v_status TEXT;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('approve', 'request_changes', 'reject') THEN
    RAISE EXCEPTION 'invalid_review_action' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_rev FROM public.scholar_profile_revisions r WHERE r.id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'revision_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_rev.status <> 'submitted' THEN
    RAISE EXCEPTION 'revision_not_reviewable' USING ERRCODE = '55000';
  END IF;

  SELECT * INTO v_sch FROM public.scholars s WHERE s.id = v_rev.scholar_id FOR UPDATE;
  v_snap := COALESCE(v_rev.snapshot_data, '{}'::jsonb);

  IF p_action = 'approve' THEN
    v_status := 'approved';

    IF v_sch.published_revision_id IS NOT NULL AND v_sch.published_revision_id <> v_rev.id THEN
      UPDATE public.scholar_profile_revisions r
        SET status = 'superseded', updated_at = now()
        WHERE r.id = v_sch.published_revision_id AND r.status = 'approved';
    END IF;

    UPDATE public.scholar_profile_revisions r
      SET status = 'approved', reviewed_at = now(), admin_notes = p_notes, updated_at = now()
      WHERE r.id = v_rev.id;

    UPDATE public.scholars s
      SET published_revision_id = v_rev.id,
          profile_status = CASE WHEN s.profile_status = 'hidden' THEN 'hidden' ELSE 'approved' END,
          draft_revision_id = NULL,
          updated_at = now(),
          full_name = CASE
            WHEN jsonb_typeof(v_snap -> 'full_name') = 'string' AND v_snap ->> 'full_name' <> ''
              THEN v_snap ->> 'full_name' ELSE s.full_name END,
          title = CASE
            WHEN jsonb_typeof(v_snap -> 'title') IN ('string', 'null') THEN v_snap ->> 'title' ELSE s.title END,
          current_institution = CASE
            WHEN jsonb_typeof(v_snap -> 'current_institution') IN ('string', 'null')
              THEN v_snap ->> 'current_institution' ELSE s.current_institution END,
          institutional_role = CASE
            WHEN jsonb_typeof(v_snap -> 'institutional_role') IN ('string', 'null')
              THEN v_snap ->> 'institutional_role' ELSE s.institutional_role END,
          biography = CASE
            WHEN jsonb_typeof(v_snap -> 'biography') IN ('string', 'null') THEN v_snap ->> 'biography' ELSE s.biography END,
          location = CASE
            WHEN jsonb_typeof(v_snap -> 'location') IN ('string', 'null') THEN v_snap ->> 'location' ELSE s.location END,
          timezone = CASE
            WHEN jsonb_typeof(v_snap -> 'timezone') = 'string' THEN v_snap ->> 'timezone' ELSE s.timezone END,
          doctrinal_statement_text = CASE
            WHEN jsonb_typeof(v_snap -> 'doctrinal_statement_text') IN ('string', 'null')
              THEN v_snap ->> 'doctrinal_statement_text' ELSE s.doctrinal_statement_text END,
          orcid_id = CASE
            WHEN jsonb_typeof(v_snap -> 'orcid_id') IN ('string', 'null') THEN v_snap ->> 'orcid_id' ELSE s.orcid_id END,
          google_scholar_url = CASE
            WHEN jsonb_typeof(v_snap -> 'google_scholar_url') IN ('string', 'null')
              THEN v_snap ->> 'google_scholar_url' ELSE s.google_scholar_url END
      WHERE s.id = v_sch.id;

  ELSIF p_action = 'request_changes' THEN
    v_status := 'changes_requested';
    UPDATE public.scholar_profile_revisions r
      SET status = 'changes_requested', reviewed_at = now(),
          admin_notes = COALESCE(p_notes, 'Changes requested by editorial review.'), updated_at = now()
      WHERE r.id = v_rev.id;

  ELSE
    v_status := 'rejected';
    UPDATE public.scholar_profile_revisions r
      SET status = 'rejected', reviewed_at = now(),
          admin_notes = COALESCE(p_notes, 'Submission rejected by editorial review.'), updated_at = now()
      WHERE r.id = v_rev.id;

    UPDATE public.scholars s
      SET draft_revision_id = NULL, updated_at = now()
      WHERE s.id = v_sch.id AND s.draft_revision_id = v_rev.id;
  END IF;

  INSERT INTO public.profile_reviews (scholar_id, revision_id, reviewer_account_id, action, feedback_notes)
  VALUES (v_sch.id, v_rev.id, p_reviewer, p_action, p_notes);

  RETURN QUERY SELECT v_sch.id, v_rev.id, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.review_profile_revision(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_profile_revision(UUID, TEXT, TEXT, UUID) TO service_role;
