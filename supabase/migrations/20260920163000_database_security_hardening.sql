-- ==============================================================================
-- FaithFull Scholars — Migration 20260920163000: Database Security Hardening
-- Remediates Supabase Security Advisor & Splinter findings:
-- 1. [CRITICAL] rls_references_user_metadata: Purge user_metadata checks in RLS
-- 2. [HIGH] function_search_path_mutable: Pin search_path on all SECURITY DEFINER functions
-- 3. [MEDIUM] anon_security_definer_function_executable: Revoke public RPC access
-- 4. [PERFORMANCE] auth_rls_initplan: Wrap auth.uid() in (SELECT auth.uid())
-- 5. [SECURITY] rls_policy_always_true: Restrict unrestricted search_rate_limits inserts
-- 6. [PERFORMANCE] multiple_permissive_policies: Refactor admin FOR ALL to mutations
-- 7. [PERFORMANCE] unindexed_foreign_keys: Add covering indexes for all foreign keys
-- 8. [HARDENING] FORCE ROW LEVEL SECURITY across all public tables
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX function_search_path_mutable: Pin search_path on all SECURITY DEFINER functions
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_pilot_feedback_rate_limit(
    p_session_id UUID,
    p_max_requests INT DEFAULT 20
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_bucket TIMESTAMPTZ := date_trunc('minute', now());
    v_count INT;
BEGIN
    INSERT INTO public.pilot_feedback_rate_limits (session_id, window_bucket, request_count)
    VALUES (p_session_id, v_bucket, 1)
    ON CONFLICT (session_id, window_bucket)
    DO UPDATE SET request_count = pilot_feedback_rate_limits.request_count + 1
    RETURNING request_count INTO v_count;

    IF v_count > p_max_requests THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_pilot_feedback(
    p_fingerprint TEXT,
    p_session_id UUID,
    p_route TEXT,
    p_category TEXT,
    p_error_message TEXT,
    p_note TEXT,
    p_breadcrumbs JSONB,
    p_user_email TEXT,
    p_user_role TEXT,
    p_app_version TEXT,
    p_session_duration_seconds INT
)
RETURNS TABLE (
    id UUID,
    hit_count INT,
    processed BOOLEAN,
    is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_row public.pilot_feedback%ROWTYPE;
    v_is_new BOOLEAN := false;
BEGIN
    SELECT * INTO v_row FROM public.pilot_feedback WHERE fingerprint = p_fingerprint FOR UPDATE;

    IF FOUND THEN
        UPDATE public.pilot_feedback
        SET hit_count = v_row.hit_count + 1,
            session_id = p_session_id,
            route = p_route,
            error_message = COALESCE(p_error_message, v_row.error_message),
            note = COALESCE(p_note, v_row.note),
            breadcrumbs = p_breadcrumbs,
            user_email = COALESCE(p_user_email, v_row.user_email),
            user_role = COALESCE(p_user_role, v_row.user_role),
            app_version = COALESCE(p_app_version, v_row.app_version),
            session_duration_seconds = COALESCE(p_session_duration_seconds, v_row.session_duration_seconds),
            processed = false,
            action = NULL,
            updated_at = now()
        WHERE fingerprint = p_fingerprint
        RETURNING * INTO v_row;
        v_is_new := false;
    ELSE
        INSERT INTO public.pilot_feedback (
            fingerprint,
            session_id,
            route,
            category,
            error_message,
            note,
            breadcrumbs,
            user_email,
            user_role,
            app_version,
            session_duration_seconds,
            hit_count,
            processed,
            action,
            created_at,
            updated_at
        )
        VALUES (
            p_fingerprint,
            p_session_id,
            p_route,
            p_category,
            p_error_message,
            p_note,
            p_breadcrumbs,
            p_user_email,
            p_user_role,
            p_app_version,
            p_session_duration_seconds,
            1,
            false,
            NULL,
            now(),
            now()
        )
        RETURNING * INTO v_row;
        v_is_new := true;
    END IF;

    RETURN QUERY SELECT v_row.id, v_row.hit_count, v_row.processed, v_is_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_scholar_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT id FROM public.scholars
    WHERE account_id = (SELECT auth.uid())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_institution_user(target_inst_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.institution_users
    WHERE account_id = (SELECT auth.uid()) AND institution_id = target_inst_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. REVOKE UNINTENDED EXECUTE FROM anon & PUBLIC
-- Internal RLS helpers and atomic rate limiters should not be exposed as unauthenticated public RPC endpoints
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_pilot_feedback_rate_limit(UUID, INT) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_pilot_feedback(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, INT) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_search_rate_limit(TEXT, INT, BOOLEAN) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_scholar_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_institution_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_pilot_feedback_rate_limit(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_pilot_feedback(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_search_rate_limit(TEXT, INT, BOOLEAN) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. FIX rls_references_user_metadata: Purge client-editable user_metadata checks
-- Replace with app_metadata or public.is_admin()
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_read_pilot_feedback" ON public.pilot_feedback;
DROP POLICY IF EXISTS "staff_update_pilot_feedback" ON public.pilot_feedback;
DROP POLICY IF EXISTS "staff_manage_rate_limits" ON public.pilot_feedback_rate_limits;

CREATE POLICY "staff_read_pilot_feedback" ON public.pilot_feedback
    FOR SELECT TO authenticated
    USING (
        (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') OR
        public.is_admin()
    );

CREATE POLICY "staff_update_pilot_feedback" ON public.pilot_feedback
    FOR UPDATE TO authenticated
    USING (
        (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') OR
        public.is_admin()
    )
    WITH CHECK (
        (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') OR
        public.is_admin()
    );

CREATE POLICY "staff_manage_rate_limits" ON public.pilot_feedback_rate_limits
    FOR ALL TO authenticated
    USING (
        (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') OR
        public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 4. FIX auth_rls_initplan: Wrap auth functions in (SELECT auth.uid())
-- ------------------------------------------------------------------------------

-- accounts
DROP POLICY IF EXISTS "Users can read own account" ON public.accounts;
DROP POLICY IF EXISTS "Users can update own account" ON public.accounts;

CREATE POLICY "Users can read own account"
  ON public.accounts FOR SELECT
  USING (id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own account"
  ON public.accounts FOR UPDATE
  USING (id = (SELECT auth.uid()) OR public.is_admin());

-- scholars
DROP POLICY IF EXISTS "Public can view approved scholars" ON public.scholars;
DROP POLICY IF EXISTS "Scholars can update own profile" ON public.scholars;
DROP POLICY IF EXISTS "Authenticated users can create scholar profile" ON public.scholars;

CREATE POLICY "Public can view approved scholars"
  ON public.scholars FOR SELECT
  USING (profile_status = 'approved' OR account_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Scholars can update own profile"
  ON public.scholars FOR UPDATE
  USING (account_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Authenticated users can create scholar profile"
  ON public.scholars FOR INSERT
  WITH CHECK (account_id = (SELECT auth.uid()) OR public.is_admin());

-- scholar_profile_revisions
DROP POLICY IF EXISTS "Scholars can view own revisions" ON public.scholar_profile_revisions;
DROP POLICY IF EXISTS "Scholars can insert own revisions" ON public.scholar_profile_revisions;
DROP POLICY IF EXISTS "Scholars can update own draft revisions" ON public.scholar_profile_revisions;

CREATE POLICY "Scholars can view own revisions"
  ON public.scholar_profile_revisions FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scholars s
      WHERE s.id = scholar_profile_revisions.scholar_id
        AND s.profile_status = 'approved'
        AND s.published_revision_id = scholar_profile_revisions.id
    )
  );

CREATE POLICY "Scholars can insert own revisions"
  ON public.scholar_profile_revisions FOR INSERT
  WITH CHECK (scholar_id = public.get_current_scholar_id() OR public.is_admin());

CREATE POLICY "Scholars can update own draft revisions"
  ON public.scholar_profile_revisions FOR UPDATE
  USING (
    (scholar_id = public.get_current_scholar_id() AND status = 'draft')
    OR public.is_admin()
  );

-- institutions
DROP POLICY IF EXISTS "Authenticated users can register institution" ON public.institutions;
CREATE POLICY "Authenticated users can register institution"
  ON public.institutions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- institution_users
DROP POLICY IF EXISTS "Institution owner or admin can manage users" ON public.institution_users;
CREATE POLICY "Institution owner or admin can manage users"
  ON public.institution_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_users iu
      WHERE iu.institution_id = institution_users.institution_id
        AND iu.account_id = (SELECT auth.uid())
        AND iu.role = 'owner'
    ) OR public.is_admin()
  );

-- inquiries
DROP POLICY IF EXISTS "Participants or admin can view inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Parties or admin can view inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Approved institution members can create inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Institution users can send inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Recipient or sender can update inquiry status" ON public.inquiries;
DROP POLICY IF EXISTS "Recipients can update inquiry status" ON public.inquiries;

CREATE POLICY "Participants or admin can view inquiries"
  ON public.inquiries FOR SELECT
  USING (
    sender_account_id = (SELECT auth.uid())
    OR scholar_id = public.get_current_scholar_id()
    OR public.is_institution_user(institution_id)
    OR public.is_admin()
  );

CREATE POLICY "Approved institution members can create inquiries"
  ON public.inquiries FOR INSERT
  WITH CHECK (
    (public.is_institution_user(institution_id) AND sender_account_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

CREATE POLICY "Recipient or sender can update inquiry status"
  ON public.inquiries FOR UPDATE
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_institution_user(institution_id)
    OR sender_account_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- profile_reviews
DROP POLICY IF EXISTS "Reviewers can record reviews" ON public.profile_reviews;
CREATE POLICY "Reviewers can record reviews"
  ON public.profile_reviews FOR INSERT
  WITH CHECK (
    reviewer_account_id = (SELECT auth.uid()) AND public.is_admin()
  );

-- reports
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "Authenticated users can submit reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    reporter_account_id = (SELECT auth.uid()) OR (SELECT auth.uid()) IS NOT NULL
  );

-- search_rate_limits
DROP POLICY IF EXISTS search_rate_limits_insert ON public.search_rate_limits;
DROP POLICY IF EXISTS search_rate_limits_admin_select ON public.search_rate_limits;
DROP POLICY IF EXISTS search_rate_limits_admin_update ON public.search_rate_limits;
DROP POLICY IF EXISTS search_rate_limits_admin_delete ON public.search_rate_limits;

-- 5. FIX rls_policy_always_true on search_rate_limits
CREATE POLICY search_rate_limits_insert ON public.search_rate_limits
  FOR INSERT
  WITH CHECK (
    length(client_fingerprint) >= 8 AND window_bucket IS NOT NULL
  );

CREATE POLICY search_rate_limits_admin_select ON public.search_rate_limits
  FOR SELECT
  USING (
    public.is_admin() OR (SELECT auth.role()) = 'service_role'
  );

CREATE POLICY search_rate_limits_admin_update ON public.search_rate_limits
  FOR UPDATE
  USING (
    public.is_admin() OR (SELECT auth.role()) = 'service_role'
  );

CREATE POLICY search_rate_limits_admin_delete ON public.search_rate_limits
  FOR DELETE
  USING (
    public.is_admin() OR (SELECT auth.role()) = 'service_role'
  );

-- ------------------------------------------------------------------------------
-- 6. FIX multiple_permissive_policies: Refactor admin FOR ALL to mutation policies
-- Eliminates duplicate permissive SELECT evaluation overhead on public tables
-- ------------------------------------------------------------------------------

-- disciplines
DROP POLICY IF EXISTS "Admins manage disciplines" ON public.disciplines;
DROP POLICY IF EXISTS "Admins insert disciplines" ON public.disciplines;
DROP POLICY IF EXISTS "Admins update disciplines" ON public.disciplines;
DROP POLICY IF EXISTS "Admins delete disciplines" ON public.disciplines;
CREATE POLICY "Admins insert disciplines" ON public.disciplines FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update disciplines" ON public.disciplines FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins delete disciplines" ON public.disciplines FOR DELETE USING (public.is_admin());

-- traditions
DROP POLICY IF EXISTS "Admins manage traditions" ON public.traditions;
DROP POLICY IF EXISTS "Admins insert traditions" ON public.traditions;
DROP POLICY IF EXISTS "Admins update traditions" ON public.traditions;
DROP POLICY IF EXISTS "Admins delete traditions" ON public.traditions;
CREATE POLICY "Admins insert traditions" ON public.traditions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update traditions" ON public.traditions FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins delete traditions" ON public.traditions FOR DELETE USING (public.is_admin());

-- confessional_standards
DROP POLICY IF EXISTS "Admins manage confessional standards" ON public.confessional_standards;
DROP POLICY IF EXISTS "Admins insert confessional standards" ON public.confessional_standards;
DROP POLICY IF EXISTS "Admins update confessional standards" ON public.confessional_standards;
DROP POLICY IF EXISTS "Admins delete confessional standards" ON public.confessional_standards;
CREATE POLICY "Admins insert confessional standards" ON public.confessional_standards FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update confessional standards" ON public.confessional_standards FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins delete confessional standards" ON public.confessional_standards FOR DELETE USING (public.is_admin());

-- scholar_disciplines
DROP POLICY IF EXISTS "Scholars manage own disciplines" ON public.scholar_disciplines;
DROP POLICY IF EXISTS "Scholars insert own disciplines" ON public.scholar_disciplines;
DROP POLICY IF EXISTS "Scholars update own disciplines" ON public.scholar_disciplines;
DROP POLICY IF EXISTS "Scholars delete own disciplines" ON public.scholar_disciplines;
CREATE POLICY "Scholars insert own disciplines" ON public.scholar_disciplines FOR INSERT WITH CHECK (scholar_id = public.get_current_scholar_id() OR public.is_admin());
CREATE POLICY "Scholars update own disciplines" ON public.scholar_disciplines FOR UPDATE USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());
CREATE POLICY "Scholars delete own disciplines" ON public.scholar_disciplines FOR DELETE USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- scholar_traditions
DROP POLICY IF EXISTS "Scholars manage own traditions" ON public.scholar_traditions;
DROP POLICY IF EXISTS "Scholars insert own traditions" ON public.scholar_traditions;
DROP POLICY IF EXISTS "Scholars update own traditions" ON public.scholar_traditions;
DROP POLICY IF EXISTS "Scholars delete own traditions" ON public.scholar_traditions;
CREATE POLICY "Scholars insert own traditions" ON public.scholar_traditions FOR INSERT WITH CHECK (scholar_id = public.get_current_scholar_id() OR public.is_admin());
CREATE POLICY "Scholars update own traditions" ON public.scholar_traditions FOR UPDATE USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());
CREATE POLICY "Scholars delete own traditions" ON public.scholar_traditions FOR DELETE USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- scholar_confessions
DROP POLICY IF EXISTS "Scholars manage own confessions" ON public.scholar_confessions;
DROP POLICY IF EXISTS "Scholars insert own confessions" ON public.scholar_confessions;
DROP POLICY IF EXISTS "Scholars update own confessions" ON public.scholar_confessions;
DROP POLICY IF EXISTS "Scholars delete own confessions" ON public.scholar_confessions;
CREATE POLICY "Scholars insert own confessions" ON public.scholar_confessions FOR INSERT WITH CHECK (scholar_id = public.get_current_scholar_id() OR public.is_admin());
CREATE POLICY "Scholars update own confessions" ON public.scholar_confessions FOR UPDATE USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());
CREATE POLICY "Scholars delete own confessions" ON public.scholar_confessions FOR DELETE USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- course_disciplines
DROP POLICY IF EXISTS "Scholars manage course disciplines" ON public.course_disciplines;
DROP POLICY IF EXISTS "Scholars insert course disciplines" ON public.course_disciplines;
DROP POLICY IF EXISTS "Scholars update course disciplines" ON public.course_disciplines;
DROP POLICY IF EXISTS "Scholars delete course disciplines" ON public.course_disciplines;
CREATE POLICY "Scholars insert course disciplines" ON public.course_disciplines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_disciplines.course_id AND (c.scholar_id = public.get_current_scholar_id() OR public.is_admin()))
);
CREATE POLICY "Scholars update course disciplines" ON public.course_disciplines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_disciplines.course_id AND (c.scholar_id = public.get_current_scholar_id() OR public.is_admin()))
);
CREATE POLICY "Scholars delete course disciplines" ON public.course_disciplines FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_disciplines.course_id AND (c.scholar_id = public.get_current_scholar_id() OR public.is_admin()))
);

-- ------------------------------------------------------------------------------
-- 7. FIX unindexed_foreign_keys: Add covering indexes for all foreign key references
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fk_courses_primary_discipline ON public.courses (primary_discipline_id);
CREATE INDEX IF NOT EXISTS idx_fk_credentials_scholar_id ON public.credentials (scholar_id);
CREATE INDEX IF NOT EXISTS idx_fk_inquiries_course_id ON public.inquiries (course_id);
CREATE INDEX IF NOT EXISTS idx_fk_inquiries_sender_account_id ON public.inquiries (sender_account_id);
CREATE INDEX IF NOT EXISTS idx_fk_media_links_course_id ON public.media_links (course_id);
CREATE INDEX IF NOT EXISTS idx_fk_media_links_scholar_id ON public.media_links (scholar_id);
CREATE INDEX IF NOT EXISTS idx_fk_profile_reviews_reviewer ON public.profile_reviews (reviewer_account_id);
CREATE INDEX IF NOT EXISTS idx_fk_profile_reviews_revision ON public.profile_reviews (revision_id);
CREATE INDEX IF NOT EXISTS idx_fk_profile_reviews_scholar ON public.profile_reviews (scholar_id);
CREATE INDEX IF NOT EXISTS idx_fk_publications_scholar_id ON public.publications (scholar_id);
CREATE INDEX IF NOT EXISTS idx_fk_reports_reporter_account ON public.reports (reporter_account_id);
CREATE INDEX IF NOT EXISTS idx_fk_scholars_draft_revision ON public.scholars (draft_revision_id);
CREATE INDEX IF NOT EXISTS idx_fk_scholars_published_revision ON public.scholars (published_revision_id);
CREATE INDEX IF NOT EXISTS idx_fk_scholar_confessions_standard ON public.scholar_confessions (confessional_standard_id);
CREATE INDEX IF NOT EXISTS idx_fk_scholar_disciplines_discipline ON public.scholar_disciplines (discipline_id);
CREATE INDEX IF NOT EXISTS idx_fk_scholar_traditions_tradition ON public.scholar_traditions (tradition_id);
CREATE INDEX IF NOT EXISTS idx_fk_saved_courses_course ON public.saved_courses (course_id);
CREATE INDEX IF NOT EXISTS idx_fk_saved_scholars_scholar ON public.saved_scholars (scholar_id);
CREATE INDEX IF NOT EXISTS idx_fk_institution_users_account ON public.institution_users (account_id);
CREATE INDEX IF NOT EXISTS idx_fk_institution_users_institution ON public.institution_users (institution_id);
CREATE INDEX IF NOT EXISTS idx_fk_course_disciplines_discipline ON public.course_disciplines (discipline_id);

-- ------------------------------------------------------------------------------
-- 8. FORCE ROW LEVEL SECURITY across all 25 tables for complete defense-in-depth
-- ------------------------------------------------------------------------------
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.scholars FORCE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_profile_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.institutions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.institution_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_disciplines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.traditions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_traditions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.confessional_standards FORCE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_confessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.publications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.courses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.course_disciplines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.media_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.availability_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saved_scholars FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saved_courses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.search_rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_feedback_rate_limits FORCE ROW LEVEL SECURITY;
