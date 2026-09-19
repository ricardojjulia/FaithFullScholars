-- ==============================================================================
-- FaithFull Scholars — Phase 1 Domain Foundation Migration
-- Creates core schema for theological scholar network, identity, taxonomies,
-- academic portfolio, course showcase, availability, and institution inquiries.
-- ==============================================================================

-- 1. Accounts table (links Supabase Auth users to platform roles)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('scholar', 'institution_user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Scholars table (canonical academic identity and live pointers)
CREATE TABLE IF NOT EXISTS public.scholars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  title TEXT,
  profile_photo_path TEXT,
  current_institution TEXT,
  institutional_role TEXT,
  biography TEXT,
  location TEXT,
  timezone TEXT,
  contact_preference TEXT,
  doctrinal_statement_text TEXT,
  doctrinal_statement_path TEXT,
  profile_status TEXT NOT NULL CHECK (profile_status IN ('draft', 'submitted', 'approved', 'rejected', 'hidden')) DEFAULT 'draft',
  verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'pending', 'verified', 'flagged')) DEFAULT 'unverified',
  published_revision_id UUID,
  draft_revision_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Scholar Profile Revisions (ADR 0005: Decoupled revision staging model)
CREATE TABLE IF NOT EXISTS public.scholar_profile_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'changes_requested', 'approved', 'superseded')) DEFAULT 'draft',
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scholar_id, revision_number)
);

-- Link revision pointers from scholars back to scholar_profile_revisions
ALTER TABLE public.scholars
  DROP CONSTRAINT IF EXISTS fk_scholars_published_revision,
  ADD CONSTRAINT fk_scholars_published_revision
    FOREIGN KEY (published_revision_id) REFERENCES public.scholar_profile_revisions(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS fk_scholars_draft_revision,
  ADD CONSTRAINT fk_scholars_draft_revision
    FOREIGN KEY (draft_revision_id) REFERENCES public.scholar_profile_revisions(id) ON DELETE SET NULL;

-- 4. Institutions (Seminaries, colleges, universities, churches)
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  website TEXT,
  institution_type TEXT NOT NULL CHECK (institution_type IN ('seminary', 'bible_college', 'theological_college', 'christian_university', 'ministry_institute', 'church', 'mission_org', 'other')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')) DEFAULT 'pending',
  contact_email TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Institution Users (Staff / recruiters linked to accounts)
CREATE TABLE IF NOT EXISTS public.institution_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'recruiter', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, institution_id)
);

-- 6. Disciplines (Theological & Biblical academic taxonomy)
CREATE TABLE IF NOT EXISTS public.disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Scholar Disciplines
CREATE TABLE IF NOT EXISTS public.scholar_disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scholar_id, discipline_id)
);

-- 8. Traditions (Theological traditions)
CREATE TABLE IF NOT EXISTS public.traditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Scholar Traditions
CREATE TABLE IF NOT EXISTS public.scholar_traditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  tradition_id UUID NOT NULL REFERENCES public.traditions(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scholar_id, tradition_id)
);

-- 10. Confessional Standards (Historic creeds and confessions)
CREATE TABLE IF NOT EXISTS public.confessional_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  year INTEGER,
  tradition_affinity TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Scholar Confessions (Scholars subscribing / affirming standards)
CREATE TABLE IF NOT EXISTS public.scholar_confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  confessional_standard_id UUID NOT NULL REFERENCES public.confessional_standards(id) ON DELETE CASCADE,
  adherence_level TEXT NOT NULL CHECK (adherence_level IN ('full_subscription', 'strict_subscription', 'general_agreement', 'substantial_agreement', 'with_exceptions')),
  exception_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scholar_id, confessional_standard_id)
);

-- 12. Academic Credentials (Degrees, terminal status)
CREATE TABLE IF NOT EXISTS public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  year_awarded INTEGER,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Academic Publications (Books, monographs, articles)
CREATE TABLE IF NOT EXISTS public.publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  publication_type TEXT NOT NULL CHECK (publication_type IN ('book', 'monograph', 'journal_article', 'book_chapter', 'edited_volume', 'conference_paper', 'dissertation', 'popular_essay')),
  publisher_or_journal TEXT,
  year INTEGER,
  doi_or_url TEXT,
  citation_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Courses (Showcase, syllabi, previews)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL CHECK (level IN ('undergraduate', 'graduate', 'doctoral', 'certificate', 'lay_education')),
  primary_discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
  delivery_modes TEXT[] NOT NULL DEFAULT '{}',
  syllabus_path TEXT,
  reading_list TEXT,
  public_preview_enabled BOOLEAN NOT NULL DEFAULT true,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'unlisted', 'private')) DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scholar_id, slug)
);

-- 15. Course Disciplines
CREATE TABLE IF NOT EXISTS public.course_disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, discipline_id)
);

-- 16. Media Links (Lectures, YouTube playlists, podcasts)
CREATE TABLE IF NOT EXISTS public.media_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('youtube_video', 'youtube_playlist', 'podcast', 'audio_lecture', 'article_link')),
  url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Availability Profiles
CREATE TABLE IF NOT EXISTS public.availability_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL UNIQUE REFERENCES public.scholars(id) ON DELETE CASCADE,
  is_available_for_hire BOOLEAN NOT NULL DEFAULT false,
  opportunity_types TEXT[] NOT NULL DEFAULT '{}',
  preferred_delivery_modes TEXT[] NOT NULL DEFAULT '{}',
  available_terms TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Inquiries (Structured institutional inquiries)
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  sender_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  opportunity_type TEXT NOT NULL,
  proposed_term TEXT,
  delivery_mode TEXT,
  message TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'read', 'accepted', 'declined', 'archived')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. Saved Scholars (Institution shortlists)
CREATE TABLE IF NOT EXISTS public.saved_scholars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, scholar_id)
);

-- 20. Saved Courses (Institution bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, course_id)
);

-- 21. Profile Reviews (Admin review history and decisions)
CREATE TABLE IF NOT EXISTS public.profile_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES public.scholar_profile_revisions(id) ON DELETE SET NULL,
  reviewer_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'request_changes', 'reject', 'hide')),
  feedback_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. Content & Trust Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('scholar_profile', 'course', 'media_link')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performant search & multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_scholars_slug ON public.scholars(slug);
CREATE INDEX IF NOT EXISTS idx_scholars_profile_status ON public.scholars(profile_status);
CREATE INDEX IF NOT EXISTS idx_scholars_account_id ON public.scholars(account_id);
CREATE INDEX IF NOT EXISTS idx_scholar_revisions_scholar_id ON public.scholar_profile_revisions(scholar_id);
CREATE INDEX IF NOT EXISTS idx_scholar_revisions_status ON public.scholar_profile_revisions(status);
CREATE INDEX IF NOT EXISTS idx_courses_scholar_id ON public.courses(scholar_id);
CREATE INDEX IF NOT EXISTS idx_courses_visibility ON public.courses(visibility);
CREATE INDEX IF NOT EXISTS idx_inquiries_scholar_id ON public.inquiries(scholar_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_institution_id ON public.inquiries(institution_id);
CREATE INDEX IF NOT EXISTS idx_saved_scholars_institution ON public.saved_scholars(institution_id);
CREATE INDEX IF NOT EXISTS idx_saved_courses_institution ON public.saved_courses(institution_id);
