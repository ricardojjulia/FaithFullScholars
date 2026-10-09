-- ==============================================================================
-- FaithFull Scholars — Migration 20261012090000: Posting applications
-- ADR 0027 (partially supersedes ADR 0020; builds on ADR 0022, 0023, 0025, 0026).
-- Idempotent and additive: no existing table, column or row is changed.
--
-- Defects fixed:
--   * POST /api/postings/[id]/express-interest inserted into `inquiries` as the
--     scholar; the only INSERT policy there is for institution members, so every
--     application was refused.
--   * The applicant matrix guessed which inquiries were applications (message
--     text, or the same opportunity_type) and read them with the service role.
--   * The status vocabulary promised by ADR 0020 never existed, and no dossier
--     was ever stored.
--
-- Design:
--   1. posting_applications        the application. FORCE RLS. authenticated has
--                                  SELECT + UPDATE only: no INSERT, no DELETE.
--   2. private.guard_posting_applications()   BEFORE INSERT OR UPDATE guard
--                                  (INVOKER, fail closed). Direct INSERT is
--                                  refused; UPDATE is a fail-closed allow-list
--                                  plus a transition table.
--   3. posting_application_notes   the institution's private notes (a separate
--                                  table because RLS works per row).
--   4. posting_application_events  audit, append-only for API callers, written by a DEFINER
--                                  trigger on submit and on every status change.
--   5. public.submit_posting_application()  the ONLY insert path. DEFINER. Seals
--                                  the dossier from the scholar's reviewed,
--                                  published rows.
--   6. public.get_application_contact()     releases the scholar's login email
--                                  to members only at interview_scheduled.
--
-- Every rule in a guard or in the submit RPC sits on ONE line that ends with
-- `-- check:<name>`. tests/integration/posting-applications.test.ts removes
-- exactly one such line inside a rolled-back transaction and shows the
-- previously refused statement then succeeds. Keep each rule on one line.
--
-- Deploy order: preflight (section 0), apply, verify, then merge and smoke-test.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Preflight: refuse to run where a dependency is missing. Read-only.
--    The integration test extracts this block (between the PREFLIGHT markers)
--    and executes it in a rolled-back transaction, so the text below is exactly
--    what is tested.
-- ------------------------------------------------------------------------------
-- PREFLIGHT-BEGIN
DO $preflight$
DECLARE
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF to_regprocedure('private.is_restricted_caller()') IS NULL THEN
    v_missing := array_append(v_missing, 'private.is_restricted_caller()');
  END IF;
  IF to_regprocedure('private.get_current_scholar_id()') IS NULL THEN
    v_missing := array_append(v_missing, 'private.get_current_scholar_id()');
  END IF;
  IF to_regprocedure('private.is_institution_user(uuid)') IS NULL THEN
    v_missing := array_append(v_missing, 'private.is_institution_user(uuid)');
  END IF;
  IF to_regprocedure('private.is_admin()') IS NULL THEN
    v_missing := array_append(v_missing, 'private.is_admin()');
  END IF;
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    v_missing := array_append(v_missing, 'public.set_updated_at()');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = to_regclass('public.credentials')
      AND t.tgname = 'trg_guard_published_children'
      AND NOT t.tgisinternal
  ) THEN
    v_missing := array_append(v_missing, 'trigger trg_guard_published_children on public.credentials');
  END IF;
  IF to_regclass('public.institution_postings') IS NULL THEN
    v_missing := array_append(v_missing, 'table public.institution_postings');
  END IF;
  IF to_regclass('public.scholars') IS NULL THEN
    v_missing := array_append(v_missing, 'table public.scholars');
  END IF;

  IF cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION 'preflight_failed: %', array_to_string(v_missing, ', ')
      USING HINT = 'Apply the earlier migrations (ADR 0022 to 0026) first. Nothing was changed.';
  END IF;
END
$preflight$;
-- PREFLIGHT-END

-- ------------------------------------------------------------------------------
-- 1. posting_applications
-- ------------------------------------------------------------------------------
-- The posting and institution foreign keys are NO ACTION on purpose: a posting
-- (or institution) with applications cannot be deleted from under its applicants.
-- The scholar foreign key cascades so deleting an account removes its applications.
CREATE TABLE IF NOT EXISTS public.posting_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id UUID NOT NULL REFERENCES public.institution_postings(id) ON DELETE NO ACTION,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE NO ACTION,
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  -- Frozen copies, so the institution sees what the scholar applied to even if the
  -- posting is edited or renamed afterwards.
  posting_title TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  cover_note TEXT NOT NULL,
  dossier_snapshot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT posting_applications_one_per_posting UNIQUE (posting_id, scholar_id),
  -- Target of the composite foreign key from the notes table.
  CONSTRAINT posting_applications_id_institution_key UNIQUE (id, institution_id),
  CONSTRAINT posting_applications_cover_note_len CHECK (char_length(cover_note) BETWEEN 5 AND 4000),
  CONSTRAINT posting_applications_snapshot_shape CHECK (
    jsonb_typeof(dossier_snapshot) = 'object' AND octet_length(dossier_snapshot::text) <= 262144
  ),
  CONSTRAINT posting_applications_status_check CHECK (
    status IN ('submitted', 'under_review', 'interview_scheduled', 'declined', 'withdrawn')
  )
);

CREATE INDEX IF NOT EXISTS idx_posting_applications_posting_created
  ON public.posting_applications (posting_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posting_applications_scholar_created
  ON public.posting_applications (scholar_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posting_applications_institution_id
  ON public.posting_applications (institution_id);

ALTER TABLE public.posting_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posting_applications FORCE ROW LEVEL SECURITY;

-- Supabase grants every role everything on a new table. Take that back, then give
-- authenticated exactly what it needs. anon gets nothing. There is no INSERT and
-- no DELETE grant: applications are created only by submit_posting_application().
REVOKE ALL ON TABLE public.posting_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.posting_applications TO authenticated;

-- Helpers for the policies. DEFINER so a policy never recurses into the RLS of the
-- table it protects; they only ever answer questions about the caller (auth.uid()).
CREATE OR REPLACE FUNCTION private.is_application_applicant(target_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posting_applications a
    WHERE a.id = target_application_id
      AND a.scholar_id = (SELECT private.get_current_scholar_id())
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_application_applicant(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_application_applicant(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Applicant, members and admins can read applications" ON public.posting_applications;
CREATE POLICY "Applicant, members and admins can read applications"
  ON public.posting_applications
  FOR SELECT
  TO authenticated
  USING (
    scholar_id = (SELECT private.get_current_scholar_id())
    OR private.is_institution_user(institution_id)
    OR private.is_admin()
  );

-- Admins get no UPDATE: triage belongs to the institution, withdrawal to the scholar.
DROP POLICY IF EXISTS "Applicant and members can update applications" ON public.posting_applications;
CREATE POLICY "Applicant and members can update applications"
  ON public.posting_applications
  FOR UPDATE
  TO authenticated
  USING (
    scholar_id = (SELECT private.get_current_scholar_id())
    OR private.is_institution_user(institution_id)
  )
  WITH CHECK (
    scholar_id = (SELECT private.get_current_scholar_id())
    OR private.is_institution_user(institution_id)
  );

DROP TRIGGER IF EXISTS set_posting_applications_updated_at ON public.posting_applications;
CREATE TRIGGER set_posting_applications_updated_at
  BEFORE UPDATE ON public.posting_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. The guard
--
-- Transition table (status), for every API caller (admins included):
--   member     submitted -> under_review
--              under_review -> interview_scheduled
--              under_review -> declined
--              interview_scheduled -> declined
--   applicant  submitted | under_review | interview_scheduled -> withdrawn
--   same status is a no-op; everything else is refused. A person who is both the
--   applicant and a member is treated as the applicant.
--
-- INSERT: only submit_posting_application() inserts. That function is SECURITY
-- DEFINER, so inside it current_user is the function owner and the guard (which
-- is INVOKER) sees a non-restricted database role. A direct INSERT as anon or
-- authenticated is refused. No INSERT grant or policy exists either; this is the
-- second wall.
--
-- UPDATE: everything except status (and the two columns the platform maintains)
-- is frozen. The guard maintains status_changed_at.
--
-- Trigger order on UPDATE: 'set_posting_applications_updated_at' sorts before
-- 'trg_guard_posting_applications', so updated_at is already maintained when the
-- guard runs. updated_at is excluded from the frozen comparison.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_posting_applications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_applicant BOOLEAN;
  v_member BOOLEAN;
BEGIN
  -- Any caller running as anon or authenticated is bound by these rules, platform admins
  -- included: an admin who is also the applicant or a member must not edit sealed content
  -- or withdraw for the scholar. Only the service role and direct database sessions are exempt.
  IF NOT (private.is_restricted_caller() OR current_user IN ('anon', 'authenticated')) THEN
    -- Service role and direct sessions are not restricted, but the
    -- platform still maintains status_changed_at on a real status change.
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status_changed_at IS NOT DISTINCT FROM OLD.status_changed_at THEN
      NEW.status_changed_at := clock_timestamp();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF current_user IN ('anon', 'authenticated') THEN RAISE EXCEPTION 'Unauthorized: applications are created only by submitting an application' USING ERRCODE = '42501'; END IF; -- check:direct_insert
    RETURN NEW;
  END IF;

  -- Who the caller is to this application is decided from the EXISTING row (OLD):
  -- the new values are the caller's input and are checked by the frozen rule below.
  v_applicant := COALESCE(OLD.scholar_id = (SELECT private.get_current_scholar_id()), false);
  v_member := COALESCE(private.is_institution_user(OLD.institution_id), false);
  IF NOT v_applicant AND NOT v_member THEN
    RAISE EXCEPTION 'Unauthorized: you are not a party to this application' USING ERRCODE = '42501';
  END IF;

  IF (to_jsonb(NEW) - ARRAY['status', 'status_changed_at', 'updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'status_changed_at', 'updated_at']) THEN RAISE EXCEPTION 'Unauthorized: application content is sealed at submission' USING ERRCODE = '42501'; END IF; -- check:frozen

  -- Same status is a no-op. status_changed_at is the platform's, never the caller's.
  IF NEW.status = OLD.status THEN
    NEW.status_changed_at := OLD.status_changed_at;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('withdrawn', 'declined') THEN RAISE EXCEPTION 'Unauthorized: a withdrawn or declined application cannot change status' USING ERRCODE = '42501'; END IF; -- check:no_exit_terminal

  IF v_applicant THEN
    IF NEW.status <> 'withdrawn' THEN RAISE EXCEPTION 'Unauthorized: applicants can only withdraw an application' USING ERRCODE = '42501'; END IF; -- check:scholar_only_withdraw
  ELSE
    IF NEW.status = 'withdrawn' THEN RAISE EXCEPTION 'Unauthorized: only the applicant can withdraw an application' USING ERRCODE = '42501'; END IF; -- check:no_member_withdraw
    IF NEW.status <> 'withdrawn' AND NOT ((OLD.status = 'submitted' AND NEW.status = 'under_review') OR (OLD.status = 'under_review' AND NEW.status IN ('interview_scheduled', 'declined')) OR (OLD.status = 'interview_scheduled' AND NEW.status = 'declined')) THEN RAISE EXCEPTION 'Unauthorized: invalid application status transition' USING ERRCODE = '42501'; END IF; -- check:member_forward_only
  END IF;

  NEW.status_changed_at := clock_timestamp();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.guard_posting_applications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_posting_applications ON public.posting_applications;
CREATE TRIGGER trg_guard_posting_applications
  BEFORE INSERT OR UPDATE ON public.posting_applications
  FOR EACH ROW EXECUTE FUNCTION private.guard_posting_applications();

-- ------------------------------------------------------------------------------
-- 3. posting_application_notes — the institution's private notes
--    One row per application. Members only, and never the applicant (a person
--    who is both applicant and member is the applicant). Admins read.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posting_application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  institution_id UUID NOT NULL,
  body TEXT NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT posting_application_notes_one_per_application UNIQUE (application_id),
  CONSTRAINT posting_application_notes_body_len CHECK (char_length(body) <= 4000),
  -- A note can only point at an application of the SAME institution.
  CONSTRAINT posting_application_notes_application_fkey
    FOREIGN KEY (application_id, institution_id)
    REFERENCES public.posting_applications (id, institution_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posting_application_notes_application_institution
  ON public.posting_application_notes (application_id, institution_id);
CREATE INDEX IF NOT EXISTS idx_posting_application_notes_institution_id
  ON public.posting_application_notes (institution_id);

ALTER TABLE public.posting_application_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posting_application_notes FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.posting_application_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.posting_application_notes TO authenticated;

DROP POLICY IF EXISTS "Members read application notes" ON public.posting_application_notes;
CREATE POLICY "Members read application notes"
  ON public.posting_application_notes
  FOR SELECT
  TO authenticated
  USING (
    (private.is_institution_user(institution_id) AND NOT private.is_application_applicant(application_id))
    OR private.is_admin()
  );

DROP POLICY IF EXISTS "Members write application notes" ON public.posting_application_notes;
CREATE POLICY "Members write application notes"
  ON public.posting_application_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_institution_user(institution_id) AND NOT private.is_application_applicant(application_id)
  );

DROP POLICY IF EXISTS "Members update application notes" ON public.posting_application_notes;
CREATE POLICY "Members update application notes"
  ON public.posting_application_notes
  FOR UPDATE
  TO authenticated
  USING (
    private.is_institution_user(institution_id) AND NOT private.is_application_applicant(application_id)
  )
  WITH CHECK (
    private.is_institution_user(institution_id) AND NOT private.is_application_applicant(application_id)
  );

-- The institution is derived from the application (never from the client), the
-- author is forced to the caller, and the key columns can never move.
CREATE OR REPLACE FUNCTION private.guard_posting_application_notes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_institution_id UUID;
BEGIN
  IF private.is_restricted_caller() OR current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      -- Read under the caller's RLS: a non-member simply does not see the application.
      SELECT a.institution_id INTO v_institution_id
      FROM public.posting_applications a
      WHERE a.id = NEW.application_id;
      IF v_institution_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: application not found' USING ERRCODE = '42501';
      END IF;
      NEW.institution_id := v_institution_id;
      NEW.created_at := clock_timestamp();
    ELSIF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.application_id IS DISTINCT FROM OLD.application_id
       OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Unauthorized: note keys are immutable' USING ERRCODE = '42501';
    END IF;
    NEW.updated_by := (SELECT auth.uid());
    NEW.updated_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.guard_posting_application_notes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_posting_application_notes ON public.posting_application_notes;
CREATE TRIGGER trg_guard_posting_application_notes
  BEFORE INSERT OR UPDATE ON public.posting_application_notes
  FOR EACH ROW EXECUTE FUNCTION private.guard_posting_application_notes();

-- ------------------------------------------------------------------------------
-- 4. posting_application_events — audit, append-only for API callers
--    Written only by the DEFINER trigger below. Users can read, never write.
--    Members (not as the applicant) and admins read the table; the applicant reads a
--    redacted timeline via get_application_events() (no actor id). Contact reveals are
--    logged here too, once per actor per application per 24 hours.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posting_application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.posting_applications(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_account_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 'status' = submission or a status change; 'contact_revealed' = a member read the applicant's
-- email. Added with IF NOT EXISTS so a database that applied the earlier (pre-rename) file
-- is upgraded by re-applying this one.
ALTER TABLE public.posting_application_events
  ADD COLUMN IF NOT EXISTS event_kind TEXT NOT NULL DEFAULT 'status';
ALTER TABLE public.posting_application_events
  DROP CONSTRAINT IF EXISTS posting_application_events_kind_check;
ALTER TABLE public.posting_application_events
  ADD CONSTRAINT posting_application_events_kind_check CHECK (event_kind IN ('status', 'contact_revealed'));

CREATE INDEX IF NOT EXISTS idx_posting_application_events_application
  ON public.posting_application_events (application_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posting_application_events_institution_id
  ON public.posting_application_events (institution_id);

ALTER TABLE public.posting_application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posting_application_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.posting_application_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.posting_application_events TO authenticated;

DROP POLICY IF EXISTS "Members and admins read application events" ON public.posting_application_events;
CREATE POLICY "Members and admins read application events"
  ON public.posting_application_events
  FOR SELECT
  TO authenticated
  USING (
    (private.is_institution_user(institution_id) AND NOT private.is_application_applicant(application_id))
    OR private.is_admin()
  );

-- The applicant reads their own timeline through this function, never the table: the table
-- carries actor_account_id (a reviewer's internal account id), which a scholar must not learn.
CREATE OR REPLACE FUNCTION public.get_application_events(p_application_id UUID)
RETURNS TABLE (event_kind TEXT, from_status TEXT, to_status TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.event_kind, e.from_status, e.to_status, e.created_at
  FROM public.posting_application_events e
  WHERE e.application_id = p_application_id
    AND private.is_application_applicant(p_application_id)
  ORDER BY e.created_at, e.id;
$$;

REVOKE ALL ON FUNCTION public.get_application_events(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_application_events(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION private.log_posting_application_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.posting_application_events (application_id, institution_id, from_status, to_status, actor_account_id)
    VALUES (NEW.id, NEW.institution_id, NULL, NEW.status, (SELECT auth.uid()));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.posting_application_events (application_id, institution_id, from_status, to_status, actor_account_id)
    VALUES (NEW.id, NEW.institution_id, OLD.status, NEW.status, (SELECT auth.uid()));
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.log_posting_application_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_posting_application_event ON public.posting_applications;
CREATE TRIGGER trg_log_posting_application_event
  AFTER INSERT OR UPDATE OF status ON public.posting_applications
  FOR EACH ROW EXECUTE FUNCTION private.log_posting_application_event();

-- ------------------------------------------------------------------------------
-- 5. submit_posting_application — the only insert path
--
-- Order of checks (the error code is the contract with the API):
--   signed_in   28000   no session
--   approved    42501   the caller has no approved scholar profile
--   note        22023   cover note shorter than 5 or longer than 4000 after trimming
--   published   P0002   posting not published, or its institution not approved
--                       (also when the posting does not exist: existence is hidden)
--   -- advisory lock per scholar --
--   duplicate   23505   already applied (withdrawn applications still count)
--   rate        FS429   20 or more applications in the last 24 hours (withdrawn count)
--
-- The snapshot is built here, in SQL, from the scholar's reviewed published rows
-- (scholars + the five relational lists promoted by ADR 0025). It contains no
-- email, contact preference or storage path. The client supplies only a posting id
-- and a note. clock_timestamp() is used so the 24-hour window is exact even inside
-- one long transaction.
--
-- Trimming uses an inline btrim; it deliberately does not depend on any other
-- migration's helper.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_posting_application(
  p_posting_id UUID,
  p_cover_note TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_scholar public.scholars%ROWTYPE;
  v_note TEXT;
  v_posting_status TEXT;
  v_posting_title TEXT;
  v_institution_id UUID;
  v_institution_status TEXT;
  v_institution_name TEXT;
  v_now TIMESTAMPTZ;
  v_snapshot JSONB;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF; -- check:signed_in

  SELECT s.* INTO v_scholar FROM public.scholars s WHERE s.account_id = v_uid;
  IF v_scholar.profile_status IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'An approved scholar profile is required' USING ERRCODE = '42501'; END IF; -- check:approved

  v_note := btrim(p_cover_note, E' \t\r\n\f\x0b');
  IF v_note IS NULL OR char_length(v_note) < 5 OR char_length(v_note) > 4000 THEN RAISE EXCEPTION 'Invalid cover note' USING ERRCODE = '22023'; END IF; -- check:note

  SELECT p.status, p.title, p.institution_id, i.status, i.name
    INTO v_posting_status, v_posting_title, v_institution_id, v_institution_status, v_institution_name
  FROM public.institution_postings p
  JOIN public.institutions i ON i.id = p.institution_id
  WHERE p.id = p_posting_id;
  IF v_posting_status IS DISTINCT FROM 'published' OR v_institution_status IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'posting_not_open' USING ERRCODE = 'P0002'; END IF; -- check:published

  -- Serialise this scholar's submissions so the duplicate and rate counts are exact.
  -- The key is the caller's own scholar id, so one scholar cannot lock another out.
  PERFORM pg_advisory_xact_lock(hashtextextended('posting-application:' || v_scholar.id::text, 0));

  IF EXISTS (SELECT 1 FROM public.posting_applications a WHERE a.posting_id = p_posting_id AND a.scholar_id = v_scholar.id) THEN RAISE EXCEPTION 'Already applied to this posting' USING ERRCODE = '23505'; END IF; -- check:duplicate

  IF (SELECT count(*) FROM public.posting_applications a WHERE a.scholar_id = v_scholar.id AND a.created_at > clock_timestamp() - interval '24 hours') >= 20 THEN RAISE EXCEPTION 'Application rate limit reached' USING ERRCODE = 'FS429'; END IF; -- check:rate

  v_now := clock_timestamp();
  v_snapshot := jsonb_build_object(
    'snapshot_version', 1,
    'sealed_at', v_now,
    'scholar_slug', v_scholar.slug,
    'published_revision_id', v_scholar.published_revision_id,
    'full_name', v_scholar.full_name,
    'title', v_scholar.title,
    'current_institution', v_scholar.current_institution,
    'institutional_role', v_scholar.institutional_role,
    'biography', v_scholar.biography,
    'location', v_scholar.location,
    'doctrinal_statement_text', v_scholar.doctrinal_statement_text,
    'orcid_id', v_scholar.orcid_id,
    'google_scholar_url', v_scholar.google_scholar_url,
    'credentials', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'degree', c.degree,
        'field_of_study', c.field_of_study,
        'institution_name', c.institution_name,
        'year_awarded', c.year_awarded,
        'is_terminal', c.is_terminal
      ) ORDER BY c.display_order, c.id)
      FROM public.credentials c WHERE c.scholar_id = v_scholar.id
    ), '[]'::jsonb),
    'publications', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'title', pb.title,
        'publication_type', pb.publication_type,
        'publisher_or_journal', pb.publisher_or_journal,
        'year', pb.year,
        'doi_or_url', pb.doi_or_url,
        'citation_text', pb.citation_text
      ) ORDER BY pb.display_order, pb.id)
      FROM public.publications pb WHERE pb.scholar_id = v_scholar.id
    ), '[]'::jsonb),
    'disciplines', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', d.name,
        'slug', d.slug,
        'is_primary', sd.is_primary
      ) ORDER BY sd.is_primary DESC, d.name)
      FROM public.scholar_disciplines sd
      JOIN public.disciplines d ON d.id = sd.discipline_id
      WHERE sd.scholar_id = v_scholar.id
    ), '[]'::jsonb),
    'traditions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', t.name,
        'slug', t.slug,
        'is_primary', st.is_primary
      ) ORDER BY st.is_primary DESC, t.name)
      FROM public.scholar_traditions st
      JOIN public.traditions t ON t.id = st.tradition_id
      WHERE st.scholar_id = v_scholar.id
    ), '[]'::jsonb),
    'confessions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', cs.name,
        'slug', cs.slug,
        'adherence_level', sc.adherence_level,
        'exception_notes', sc.exception_notes
      ) ORDER BY cs.name)
      FROM public.scholar_confessions sc
      JOIN public.confessional_standards cs ON cs.id = sc.confessional_standard_id
      WHERE sc.scholar_id = v_scholar.id
    ), '[]'::jsonb)
  );

  INSERT INTO public.posting_applications (
    posting_id, institution_id, scholar_id, posting_title, institution_name,
    cover_note, dossier_snapshot, status, status_changed_at, created_at, updated_at
  ) VALUES (
    p_posting_id, v_institution_id, v_scholar.id, v_posting_title, v_institution_name,
    v_note, v_snapshot, 'submitted', v_now, v_now, v_now
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_posting_application(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_posting_application(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. get_application_contact — the scholar's login email, released late
--    Only a member of the posting institution, only at interview_scheduled, and
--    never to the applicant (even if the applicant is also a member). NULL otherwise,
--    so the caller learns nothing about why. A successful release is logged as a
--    'contact_revealed' event.
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_application_contact(UUID);
CREATE FUNCTION public.get_application_contact(p_application_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email TEXT;
  v_institution_id UUID;
BEGIN
  SELECT acc.email, a.institution_id INTO v_email, v_institution_id
  FROM public.posting_applications a
  JOIN public.scholars s ON s.id = a.scholar_id
  JOIN public.accounts acc ON acc.id = s.account_id
  WHERE a.id = p_application_id
    AND a.status = 'interview_scheduled'
    AND private.is_institution_user(a.institution_id)
    AND s.id IS DISTINCT FROM (SELECT private.get_current_scholar_id());

  -- Every release of the email is audited (VOLATILE: this function writes).
  -- One event per actor per application per 24 hours, so repeat calls cannot flood the log.
  IF v_email IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.posting_application_events e
    WHERE e.application_id = p_application_id
      AND e.event_kind = 'contact_revealed'
      AND e.actor_account_id IS NOT DISTINCT FROM (SELECT auth.uid())
      AND e.created_at > clock_timestamp() - interval '24 hours'
  ) THEN
    INSERT INTO public.posting_application_events (application_id, institution_id, event_kind, from_status, to_status, actor_account_id)
    VALUES (p_application_id, v_institution_id, 'contact_revealed', NULL, 'interview_scheduled', (SELECT auth.uid()));
  END IF;
  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_application_contact(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_application_contact(UUID) TO authenticated;
