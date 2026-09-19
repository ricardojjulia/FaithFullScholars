-- ==============================================================================
-- FaithFull Scholars — Phase 1 Row Level Security (RLS) Policies
-- Enforces multi-tenant isolation, draft privacy, scholar ownership,
-- institution boundary protection, and admin governance.
-- ==============================================================================

-- Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_scholar_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.scholars
    WHERE account_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_institution_user(target_inst_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.institution_users
    WHERE account_id = auth.uid() AND institution_id = target_inst_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 1. accounts
-- ------------------------------------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own account"
  ON public.accounts FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own account"
  ON public.accounts FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. scholars
-- ------------------------------------------------------------------------------
ALTER TABLE public.scholars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved scholars"
  ON public.scholars FOR SELECT
  USING (profile_status = 'approved' OR account_id = auth.uid() OR public.is_admin());

CREATE POLICY "Scholars can update own profile"
  ON public.scholars FOR UPDATE
  USING (account_id = auth.uid() OR public.is_admin());

CREATE POLICY "Authenticated users can create scholar profile"
  ON public.scholars FOR INSERT
  WITH CHECK (account_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. scholar_profile_revisions (ADR 0005)
-- ------------------------------------------------------------------------------
ALTER TABLE public.scholar_profile_revisions ENABLE ROW LEVEL SECURITY;

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

-- ------------------------------------------------------------------------------
-- 4. institutions
-- ------------------------------------------------------------------------------
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved institutions"
  ON public.institutions FOR SELECT
  USING (status = 'approved' OR public.is_institution_user(id) OR public.is_admin());

CREATE POLICY "Institution staff or admin can update institution"
  ON public.institutions FOR UPDATE
  USING (public.is_institution_user(id) OR public.is_admin());

CREATE POLICY "Authenticated users can register institution"
  ON public.institutions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 5. institution_users
-- ------------------------------------------------------------------------------
ALTER TABLE public.institution_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members or admin can view institution users"
  ON public.institution_users FOR SELECT
  USING (public.is_institution_user(institution_id) OR public.is_admin());

CREATE POLICY "Institution owner or admin can manage users"
  ON public.institution_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_users iu
      WHERE iu.institution_id = institution_users.institution_id
        AND iu.account_id = auth.uid()
        AND iu.role = 'owner'
    ) OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 6. disciplines (Public read taxonomy)
-- ------------------------------------------------------------------------------
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view disciplines"
  ON public.disciplines FOR SELECT
  USING (true);

CREATE POLICY "Admins manage disciplines"
  ON public.disciplines FOR ALL
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. scholar_disciplines
-- ------------------------------------------------------------------------------
ALTER TABLE public.scholar_disciplines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view disciplines of approved scholars"
  ON public.scholar_disciplines FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scholars s
      WHERE s.id = scholar_disciplines.scholar_id AND s.profile_status = 'approved'
    )
  );

CREATE POLICY "Scholars manage own disciplines"
  ON public.scholar_disciplines FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. traditions (Public read taxonomy)
-- ------------------------------------------------------------------------------
ALTER TABLE public.traditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view traditions"
  ON public.traditions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage traditions"
  ON public.traditions FOR ALL
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. scholar_traditions
-- ------------------------------------------------------------------------------
ALTER TABLE public.scholar_traditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view traditions of approved scholars"
  ON public.scholar_traditions FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scholars s
      WHERE s.id = scholar_traditions.scholar_id AND s.profile_status = 'approved'
    )
  );

CREATE POLICY "Scholars manage own traditions"
  ON public.scholar_traditions FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. confessional_standards (Historic standards taxonomy)
-- ------------------------------------------------------------------------------
ALTER TABLE public.confessional_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view confessional standards"
  ON public.confessional_standards FOR SELECT
  USING (true);

CREATE POLICY "Admins manage confessional standards"
  ON public.confessional_standards FOR ALL
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 11. scholar_confessions
-- ------------------------------------------------------------------------------
ALTER TABLE public.scholar_confessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view confessions of approved scholars"
  ON public.scholar_confessions FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scholars s
      WHERE s.id = scholar_confessions.scholar_id AND s.profile_status = 'approved'
    )
  );

CREATE POLICY "Scholars manage own confessions"
  ON public.scholar_confessions FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 12. credentials
-- ------------------------------------------------------------------------------
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view credentials of approved scholars"
  ON public.credentials FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scholars s
      WHERE s.id = credentials.scholar_id AND s.profile_status = 'approved'
    )
  );

CREATE POLICY "Scholars manage own credentials"
  ON public.credentials FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 13. publications
-- ------------------------------------------------------------------------------
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view publications of approved scholars"
  ON public.publications FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scholars s
      WHERE s.id = publications.scholar_id AND s.profile_status = 'approved'
    )
  );

CREATE POLICY "Scholars manage own publications"
  ON public.publications FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 14. courses
-- ------------------------------------------------------------------------------
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public courses of approved scholars"
  ON public.courses FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR (
      visibility = 'public'
      AND EXISTS (
        SELECT 1 FROM public.scholars s
        WHERE s.id = courses.scholar_id AND s.profile_status = 'approved'
      )
    )
  );

CREATE POLICY "Scholars manage own courses"
  ON public.courses FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 15. course_disciplines
-- ------------------------------------------------------------------------------
ALTER TABLE public.course_disciplines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view disciplines for visible courses"
  ON public.course_disciplines FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_disciplines.course_id
        AND (c.scholar_id = public.get_current_scholar_id() OR c.visibility = 'public')
    )
  );

CREATE POLICY "Course owners manage course disciplines"
  ON public.course_disciplines FOR ALL
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_disciplines.course_id
        AND c.scholar_id = public.get_current_scholar_id()
    )
  );

-- ------------------------------------------------------------------------------
-- 16. media_links
-- ------------------------------------------------------------------------------
ALTER TABLE public.media_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view media links of approved scholars"
  ON public.media_links FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scholars s
      WHERE s.id = media_links.scholar_id AND s.profile_status = 'approved'
    )
  );

CREATE POLICY "Scholars manage own media links"
  ON public.media_links FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 17. availability_profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.availability_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public or institutions can view availability of approved scholars"
  ON public.availability_profiles FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scholars s
      WHERE s.id = availability_profiles.scholar_id AND s.profile_status = 'approved'
    )
  );

CREATE POLICY "Scholars manage own availability profile"
  ON public.availability_profiles FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 18. inquiries (Strict multi-tenant communication isolation)
-- ------------------------------------------------------------------------------
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants or admin can view inquiries"
  ON public.inquiries FOR SELECT
  USING (
    sender_account_id = auth.uid()
    OR scholar_id = public.get_current_scholar_id()
    OR public.is_institution_user(institution_id)
    OR public.is_admin()
  );

CREATE POLICY "Approved institution members can create inquiries"
  ON public.inquiries FOR INSERT
  WITH CHECK (
    (public.is_institution_user(institution_id) AND sender_account_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Recipient or sender can update inquiry status"
  ON public.inquiries FOR UPDATE
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_institution_user(institution_id)
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 19. saved_scholars
-- ------------------------------------------------------------------------------
ALTER TABLE public.saved_scholars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution members view own saved scholars"
  ON public.saved_scholars FOR SELECT
  USING (public.is_institution_user(institution_id) OR public.is_admin());

CREATE POLICY "Institution members manage saved scholars"
  ON public.saved_scholars FOR ALL
  USING (public.is_institution_user(institution_id) OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 20. saved_courses
-- ------------------------------------------------------------------------------
ALTER TABLE public.saved_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution members view own saved courses"
  ON public.saved_courses FOR SELECT
  USING (public.is_institution_user(institution_id) OR public.is_admin());

CREATE POLICY "Institution members manage saved courses"
  ON public.saved_courses FOR ALL
  USING (public.is_institution_user(institution_id) OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 21. profile_reviews (Admin audit trail)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profile_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins or scholar owner view reviews"
  ON public.profile_reviews FOR SELECT
  USING (
    scholar_id = public.get_current_scholar_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins manage profile reviews"
  ON public.profile_reviews FOR ALL
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 22. reports
-- ------------------------------------------------------------------------------
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can submit reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage content reports"
  ON public.reports FOR ALL
  USING (public.is_admin());
