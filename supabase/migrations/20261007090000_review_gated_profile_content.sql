-- ==============================================================================
-- FaithFull Scholars — Review-Gated Profile Content & Relational Promotion
-- (ADR 0025; extends ADR 0005, 0022, 0023, 0024; resolves ADR 0024 residual
-- risks 1 and 2)
--
-- Defects fixed:
--   * A scholar could UPDATE any scholars content column (full_name, biography,
--     doctrinal_statement_text, slug, file paths, ...) directly, bypassing review.
--   * A scholar could INSERT/UPDATE/DELETE scholar_disciplines, scholar_traditions,
--     scholar_confessions, credentials and publications directly.
--   * Approval copied scalar fields only; approved lists never reached the
--     relational tables that every public page reads.
--   * The Lausanne Covenant did not exist in confessional_standards.
--
-- Design:
--   * private.guard_scholars(): every existing check is kept; a fail-closed
--     allow-list is appended OUTSIDE the ELSIF chain. A restricted caller may
--     change only contact_preference, draft_revision_id, updated_at and
--     profile_tier (the tier trigger owns that refusal and its message). Columns
--     added later are protected automatically.
--   * private.guard_scholar_published_children(): refuses restricted callers on
--     the five relational tables.
--   * private.promote_snapshot_lists() (definer, two passes: validate, replace)
--     and private.resolve_taxonomy_id() (slug match only).
--   * public.review_profile_revision() re-issued: approve promotes the lists in
--     the same transaction, before the supersede and the scalar copy.
-- Service role, admins and direct database sessions are unaffected by the guards.
--
-- Errors raised by promotion: FS001 (unmatched taxonomy; DETAIL is a JSON array of
-- {kind, value}) and FS002 (invalid snapshot shape; message names list and index).
--
-- PREFLIGHT (read-only, run BEFORE applying; see ADR 0025 and the spec runbook):
--   1. SELECT slug FROM disciplines/traditions/confessional_standards: the
--      taxonomy slugs the app maps to are present.
--   2. No foreign keys reference credentials.id or publications.id (promotion
--      deletes and re-inserts those rows).
--   3. Open revisions whose snapshot lists are empty while live rows exist:
--      drain or re-save them, or approval will clear the live rows.
--   4. Open revisions that still hold legacy names or ids (standard-*, display
--      names): the editor maps them on load; unmatched ones block approval.
-- Deploy the app first, then apply this migration, close together. No rows change
-- at migration time except the Lausanne Covenant insert.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Lausanne Covenant
-- ------------------------------------------------------------------------------
INSERT INTO public.confessional_standards (id, name, slug, year, tradition_affinity, description) VALUES
  ('c1000000-0000-0000-0000-000000000013', 'Lausanne Covenant', 'lausanne-covenant', 1974, 'Evangelical',
   'Global evangelical affirmation on evangelism, Scripture, and the church''s mission, issued by the 1974 Lausanne Congress.')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. scholars guard — fail-closed allow-list (every pre-existing check is kept
--    from 20261006090000; the only addition is the final block)
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

    -- Review-gated content (ADR 0025). Deliberately outside the ELSIF chain above.
    IF TG_OP = 'INSERT' THEN
      -- slug and full_name stay allowed; signup itself uses the service role.
      IF NEW.title IS NOT NULL
         OR NEW.profile_photo_path IS NOT NULL
         OR NEW.current_institution IS NOT NULL
         OR NEW.institutional_role IS NOT NULL
         OR NEW.biography IS NOT NULL
         OR NEW.location IS NOT NULL
         OR NEW.timezone IS NOT NULL
         OR NEW.doctrinal_statement_text IS NOT NULL
         OR NEW.doctrinal_statement_path IS NOT NULL
         OR NEW.orcid_id IS NOT NULL
         OR NEW.google_scholar_url IS NOT NULL THEN
        RAISE EXCEPTION 'Unauthorized: profile content is published only through an approved revision' USING ERRCODE = '42501';
      END IF;
    ELSIF (to_jsonb(NEW) - ARRAY['contact_preference', 'draft_revision_id', 'updated_at', 'profile_tier'])
          IS DISTINCT FROM
          (to_jsonb(OLD) - ARRAY['contact_preference', 'draft_revision_id', 'updated_at', 'profile_tier']) THEN
      RAISE EXCEPTION 'Unauthorized: profile content changes only through an approved revision' USING ERRCODE = '42501';
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
-- 3. Published child tables — no restricted writes of any kind
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_scholar_published_children()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF private.is_restricted_caller() THEN
    RAISE EXCEPTION 'Unauthorized: published profile lists change only through an approved revision' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.guard_scholar_published_children() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_guard_published_children ON public.scholar_disciplines;
CREATE TRIGGER trg_guard_published_children
  BEFORE INSERT OR UPDATE OR DELETE ON public.scholar_disciplines
  FOR EACH ROW EXECUTE FUNCTION private.guard_scholar_published_children();

DROP TRIGGER IF EXISTS trg_guard_published_children ON public.scholar_traditions;
CREATE TRIGGER trg_guard_published_children
  BEFORE INSERT OR UPDATE OR DELETE ON public.scholar_traditions
  FOR EACH ROW EXECUTE FUNCTION private.guard_scholar_published_children();

DROP TRIGGER IF EXISTS trg_guard_published_children ON public.scholar_confessions;
CREATE TRIGGER trg_guard_published_children
  BEFORE INSERT OR UPDATE OR DELETE ON public.scholar_confessions
  FOR EACH ROW EXECUTE FUNCTION private.guard_scholar_published_children();

DROP TRIGGER IF EXISTS trg_guard_published_children ON public.credentials;
CREATE TRIGGER trg_guard_published_children
  BEFORE INSERT OR UPDATE OR DELETE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION private.guard_scholar_published_children();

DROP TRIGGER IF EXISTS trg_guard_published_children ON public.publications;
CREATE TRIGGER trg_guard_published_children
  BEFORE INSERT OR UPDATE OR DELETE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION private.guard_scholar_published_children();

-- ------------------------------------------------------------------------------
-- 4. Snapshot validation helpers (private; never callable through the API)
--    Messages never contain snapshot values, only the list name and index.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.snapshot_invalid(p_list TEXT, p_index INTEGER, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF p_index IS NULL THEN
    RAISE EXCEPTION 'snapshot_invalid: % %', p_list, p_reason USING ERRCODE = 'FS002';
  END IF;
  RAISE EXCEPTION 'snapshot_invalid: %[%] %', p_list, p_index, p_reason USING ERRCODE = 'FS002';
END;
$$;

-- Reads a trimmed string key of a list item. Absent or JSON null reads as NULL
-- unless required. Wrong type, empty-when-required and over-cap raise FS002.
CREATE OR REPLACE FUNCTION private.snapshot_text(
  p_list TEXT, p_index INTEGER, p_item JSONB, p_key TEXT, p_max INTEGER, p_required BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_type TEXT := jsonb_typeof(p_item -> p_key);
  v_text TEXT;
BEGIN
  IF v_type IS NULL OR v_type = 'null' THEN
    IF p_required THEN
      PERFORM private.snapshot_invalid(p_list, p_index, p_key || ' is required');
    END IF;
    RETURN NULL;
  END IF;
  IF v_type <> 'string' THEN
    PERFORM private.snapshot_invalid(p_list, p_index, p_key || ' must be text');
  END IF;
  v_text := btrim(p_item ->> p_key);
  IF p_required AND v_text = '' THEN
    PERFORM private.snapshot_invalid(p_list, p_index, p_key || ' is required');
  END IF;
  IF char_length(v_text) > p_max THEN
    PERFORM private.snapshot_invalid(p_list, p_index, p_key || ' is too long');
  END IF;
  RETURN v_text;
END;
$$;

CREATE OR REPLACE FUNCTION private.snapshot_int(p_list TEXT, p_index INTEGER, p_item JSONB, p_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_type TEXT := jsonb_typeof(p_item -> p_key);
BEGIN
  IF v_type IS NULL OR v_type = 'null' THEN
    RETURN NULL;
  END IF;
  IF v_type <> 'number' OR (p_item ->> p_key) !~ '^-?[0-9]{1,9}$' THEN
    PERFORM private.snapshot_invalid(p_list, p_index, p_key || ' must be a whole number');
  END IF;
  RETURN (p_item ->> p_key)::INTEGER;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.snapshot_invalid(TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.snapshot_text(TEXT, INTEGER, JSONB, TEXT, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.snapshot_int(TEXT, INTEGER, JSONB, TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. Taxonomy resolver — canonical slug only (legacy-name mapping is app-side)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.resolve_taxonomy_id(p_kind TEXT, p_value TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_kind
    WHEN 'discipline' THEN (SELECT d.id FROM public.disciplines d WHERE d.slug = p_value)
    WHEN 'tradition' THEN (SELECT t.id FROM public.traditions t WHERE t.slug = p_value)
    WHEN 'confession' THEN (SELECT c.id FROM public.confessional_standards c WHERE c.slug = p_value)
    ELSE NULL
  END;
$$;

REVOKE EXECUTE ON FUNCTION private.resolve_taxonomy_id(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.resolve_taxonomy_id(TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 6. Promotion — two passes. Pass 1 validates every list present in the snapshot
--    (FS002 on shape, FS001 on unmatched taxonomy, raised after all lists are
--    scanned). Pass 2 replaces. A list that is absent, or not an array, is left
--    unchanged; [] clears; a non-empty list replaces.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.promote_snapshot_lists(p_scholar UUID, p_snapshot JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c_max_items CONSTANT INTEGER := 50;
  v_list TEXT;
  v_arr JSONB;
  v_item JSONB;
  v_i INTEGER;
  v_text TEXT;
  v_unmatched JSONB := '[]'::jsonb;
  v_kind TEXT;
  v_creds JSONB := p_snapshot -> 'credentials';
  v_pubs JSONB := p_snapshot -> 'publications';
  v_confs JSONB := p_snapshot -> 'confessions';
  v_discs JSONB := p_snapshot -> 'disciplines';
  v_trads JSONB := p_snapshot -> 'traditions';
BEGIN
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RETURN;
  END IF;

  -- ---- Pass 1: validate ------------------------------------------------------
  FOREACH v_list IN ARRAY ARRAY['credentials', 'publications', 'confessions', 'disciplines', 'traditions'] LOOP
    v_arr := p_snapshot -> v_list;
    CONTINUE WHEN jsonb_typeof(v_arr) IS DISTINCT FROM 'array';
    IF jsonb_array_length(v_arr) > c_max_items THEN
      PERFORM private.snapshot_invalid(v_list, NULL, 'has more than ' || c_max_items || ' items');
    END IF;

    FOR v_i IN 0 .. jsonb_array_length(v_arr) - 1 LOOP
      v_item := v_arr -> v_i;

      IF v_list IN ('disciplines', 'traditions') THEN
        IF jsonb_typeof(v_item) <> 'string' THEN
          PERFORM private.snapshot_invalid(v_list, v_i, 'must be a slug string');
        END IF;
        v_text := btrim(v_arr ->> v_i);
        IF v_text = '' OR char_length(v_text) > 200 THEN
          PERFORM private.snapshot_invalid(v_list, v_i, 'must be a slug of 1 to 200 characters');
        END IF;
        v_kind := CASE v_list WHEN 'disciplines' THEN 'discipline' ELSE 'tradition' END;
        IF private.resolve_taxonomy_id(v_kind, v_arr ->> v_i) IS NULL THEN
          v_unmatched := v_unmatched || jsonb_build_array(jsonb_build_object('kind', v_kind, 'value', v_arr ->> v_i));
        END IF;
        CONTINUE;
      END IF;

      IF jsonb_typeof(v_item) <> 'object' THEN
        PERFORM private.snapshot_invalid(v_list, v_i, 'must be an object');
      END IF;

      IF v_list = 'credentials' THEN
        PERFORM private.snapshot_text(v_list, v_i, v_item, 'degree', 200, true);
        PERFORM private.snapshot_text(v_list, v_i, v_item, 'field_of_study', 200, true);
        PERFORM private.snapshot_text(v_list, v_i, v_item, 'institution_name', 200, true);
        PERFORM private.snapshot_int(v_list, v_i, v_item, 'year_awarded');
        IF jsonb_typeof(v_item -> 'is_terminal') NOT IN ('boolean', 'null') AND v_item ? 'is_terminal' THEN
          PERFORM private.snapshot_invalid(v_list, v_i, 'is_terminal must be true or false');
        END IF;

      ELSIF v_list = 'publications' THEN
        PERFORM private.snapshot_text(v_list, v_i, v_item, 'title', 500, true);
        v_text := private.snapshot_text(v_list, v_i, v_item, 'publication_type', 50, true);
        IF v_text NOT IN ('book', 'monograph', 'journal_article', 'book_chapter', 'edited_volume',
                          'conference_paper', 'dissertation', 'popular_essay') THEN
          PERFORM private.snapshot_invalid(v_list, v_i, 'publication_type is not allowed');
        END IF;
        PERFORM private.snapshot_text(v_list, v_i, v_item, 'publisher_or_journal', 300, false);
        PERFORM private.snapshot_int(v_list, v_i, v_item, 'year');
        v_text := private.snapshot_text(v_list, v_i, v_item, 'doi_or_url', 500, false);
        IF v_text IS NOT NULL AND v_text <> '' AND v_text !~* '^https?://' AND v_text !~ '^10\.' THEN
          PERFORM private.snapshot_invalid(v_list, v_i, 'doi_or_url must be an http(s) URL or a DOI');
        END IF;
        PERFORM private.snapshot_text(v_list, v_i, v_item, 'citation_text', 2000, false);

      ELSE -- confessions
        v_text := private.snapshot_text(v_list, v_i, v_item, 'confessional_standard_id', 100, true);
        v_text := private.snapshot_text(v_list, v_i, v_item, 'adherence_level', 50, true);
        IF v_text NOT IN ('full_subscription', 'strict_subscription', 'general_agreement',
                          'substantial_agreement', 'with_exceptions') THEN
          PERFORM private.snapshot_invalid(v_list, v_i, 'adherence_level is not allowed');
        END IF;
        PERFORM private.snapshot_text(v_list, v_i, v_item, 'exception_notes', 2000, false);
        IF private.resolve_taxonomy_id('confession', btrim(v_item ->> 'confessional_standard_id')) IS NULL THEN
          v_unmatched := v_unmatched || jsonb_build_array(
            jsonb_build_object('kind', 'confession', 'value', btrim(v_item ->> 'confessional_standard_id')));
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  IF jsonb_array_length(v_unmatched) > 0 THEN
    RAISE EXCEPTION 'taxonomy_unmatched: % entries do not match the taxonomy', jsonb_array_length(v_unmatched)
      USING ERRCODE = 'FS001', DETAIL = v_unmatched::text;
  END IF;

  -- ---- Pass 2: replace -------------------------------------------------------
  IF jsonb_typeof(v_creds) = 'array' THEN
    DELETE FROM public.credentials WHERE scholar_id = p_scholar;
    INSERT INTO public.credentials
      (scholar_id, degree, field_of_study, institution_name, year_awarded, is_terminal, display_order)
    SELECT p_scholar,
           btrim(e.item ->> 'degree'),
           btrim(e.item ->> 'field_of_study'),
           btrim(e.item ->> 'institution_name'),
           CASE WHEN jsonb_typeof(e.item -> 'year_awarded') = 'number' THEN (e.item ->> 'year_awarded')::INTEGER END,
           COALESCE((e.item ->> 'is_terminal')::BOOLEAN, false),
           (e.ord - 1)::INTEGER
    FROM jsonb_array_elements(v_creds) WITH ORDINALITY AS e(item, ord);
  END IF;

  IF jsonb_typeof(v_pubs) = 'array' THEN
    DELETE FROM public.publications WHERE scholar_id = p_scholar;
    INSERT INTO public.publications
      (scholar_id, title, publication_type, publisher_or_journal, year, doi_or_url, citation_text, display_order)
    SELECT p_scholar,
           btrim(e.item ->> 'title'),
           btrim(e.item ->> 'publication_type'),
           NULLIF(btrim(e.item ->> 'publisher_or_journal'), ''),
           CASE WHEN jsonb_typeof(e.item -> 'year') = 'number' THEN (e.item ->> 'year')::INTEGER END,
           NULLIF(btrim(e.item ->> 'doi_or_url'), ''),
           NULLIF(btrim(e.item ->> 'citation_text'), ''),
           (e.ord - 1)::INTEGER
    FROM jsonb_array_elements(v_pubs) WITH ORDINALITY AS e(item, ord);
  END IF;

  IF jsonb_typeof(v_confs) = 'array' THEN
    DELETE FROM public.scholar_confessions WHERE scholar_id = p_scholar;
    INSERT INTO public.scholar_confessions
      (scholar_id, confessional_standard_id, adherence_level, exception_notes)
    SELECT p_scholar, f.sid, f.adherence, f.notes
    FROM (
      SELECT DISTINCT ON (r.sid) r.sid, r.adherence, r.notes, r.ord
      FROM (
        SELECT private.resolve_taxonomy_id('confession', btrim(e.item ->> 'confessional_standard_id')) AS sid,
               btrim(e.item ->> 'adherence_level') AS adherence,
               NULLIF(btrim(e.item ->> 'exception_notes'), '') AS notes,
               e.ord
        FROM jsonb_array_elements(v_confs) WITH ORDINALITY AS e(item, ord)
      ) r
      ORDER BY r.sid, r.ord
    ) f
    ORDER BY f.ord;
  END IF;

  IF jsonb_typeof(v_discs) = 'array' THEN
    DELETE FROM public.scholar_disciplines WHERE scholar_id = p_scholar;
    INSERT INTO public.scholar_disciplines (scholar_id, discipline_id, is_primary)
    SELECT p_scholar, f.sid, (f.ord = min(f.ord) OVER ())
    FROM (
      SELECT r.sid, min(r.ord) AS ord
      FROM (
        SELECT private.resolve_taxonomy_id('discipline', e.val) AS sid, e.ord
        FROM jsonb_array_elements_text(v_discs) WITH ORDINALITY AS e(val, ord)
      ) r
      GROUP BY r.sid
    ) f;
  END IF;

  IF jsonb_typeof(v_trads) = 'array' THEN
    DELETE FROM public.scholar_traditions WHERE scholar_id = p_scholar;
    INSERT INTO public.scholar_traditions (scholar_id, tradition_id, is_primary)
    SELECT p_scholar, f.sid, (f.ord = min(f.ord) OVER ())
    FROM (
      SELECT r.sid, min(r.ord) AS ord
      FROM (
        SELECT private.resolve_taxonomy_id('tradition', e.val) AS sid, e.ord
        FROM jsonb_array_elements_text(v_trads) WITH ORDINALITY AS e(val, ord)
      ) r
      GROUP BY r.sid
    ) f;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.promote_snapshot_lists(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.promote_snapshot_lists(UUID, JSONB) TO service_role;

-- ------------------------------------------------------------------------------
-- 7. Atomic admin review — re-issued; approve now promotes the lists first
--    (same signature and grants as 20261006090000)
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

  -- Lock the scholar row before the revision row: a scholar UPDATE of
  -- draft_revision_id locks the scholar row and then takes an FK lock on the
  -- revision, so the same order here avoids a lock-order deadlock.
  SELECT * INTO v_sch FROM public.scholars s
    WHERE s.id = (SELECT r.scholar_id FROM public.scholar_profile_revisions r WHERE r.id = p_revision_id)
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'revision_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_rev FROM public.scholar_profile_revisions r
    WHERE r.id = p_revision_id AND r.scholar_id = v_sch.id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'revision_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_rev.status <> 'submitted' THEN
    RAISE EXCEPTION 'revision_not_reviewable' USING ERRCODE = '55000';
  END IF;
  v_snap := COALESCE(v_rev.snapshot_data, '{}'::jsonb);

  IF p_action = 'approve' THEN
    v_status := 'approved';

    -- Lists first: any FS001 / FS002 aborts the whole approval, audit row included.
    PERFORM private.promote_snapshot_lists(v_sch.id, v_snap);

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

-- p_reviewer is trusted as given: only service_role may call this, and the app
-- passes the session's staff identity, never a client value.
REVOKE ALL ON FUNCTION public.review_profile_revision(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_profile_revision(UUID, TEXT, TEXT, UUID) TO service_role;
