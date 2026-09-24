-- ==============================================================================
-- Migration: 20260924140000_distinguished_scholar_dossiers.sql
-- Description: Phase 13 - Premium Scholar Profiles & Distinguished Faculty Dossiers (ADR 0014)
-- ==============================================================================

-- 1. Extend public.scholars with profile_tier and academic identifiers
ALTER TABLE public.scholars
  ADD COLUMN IF NOT EXISTS profile_tier TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS orcid_id TEXT,
  ADD COLUMN IF NOT EXISTS google_scholar_url TEXT;

-- Enforce constraints
ALTER TABLE public.scholars
  DROP CONSTRAINT IF EXISTS scholars_profile_tier_check,
  ADD CONSTRAINT scholars_profile_tier_check
    CHECK (profile_tier IN ('standard', 'distinguished_fellow'));

ALTER TABLE public.scholars
  DROP CONSTRAINT IF EXISTS scholars_orcid_id_check,
  ADD CONSTRAINT scholars_orcid_id_check
    CHECK (orcid_id IS NULL OR orcid_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$');

ALTER TABLE public.scholars
  DROP CONSTRAINT IF EXISTS scholars_google_scholar_url_check,
  ADD CONSTRAINT scholars_google_scholar_url_check
    CHECK (google_scholar_url IS NULL OR google_scholar_url ~ '^https:\/\/scholar\.google\.[a-z.]+\/citations\?.*user=');

CREATE INDEX IF NOT EXISTS idx_scholars_profile_tier ON public.scholars (profile_tier);

-- 2. Anti-Privilege Escalation Trigger on public.scholars
-- Scholars cannot self-elevate profile_tier to 'distinguished_fellow'
CREATE OR REPLACE FUNCTION public.prevent_scholar_tier_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.profile_tier IS DISTINCT FROM OLD.profile_tier THEN
    IF (COALESCE(auth.role(), '') IN ('authenticated', 'anon')) AND NOT (public.is_admin()) THEN
      RAISE EXCEPTION 'Unauthorized: only platform administrators can modify scholar profile_tier';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_scholar_tier_escalation ON public.scholars;
CREATE TRIGGER trg_prevent_scholar_tier_escalation
  BEFORE UPDATE ON public.scholars
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_scholar_tier_escalation();

-- 3. Extend public.media_links for enhanced lecture showcase
ALTER TABLE public.media_links
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE public.media_links
  DROP CONSTRAINT IF EXISTS media_links_duration_seconds_check,
  ADD CONSTRAINT media_links_duration_seconds_check
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0);

ALTER TABLE public.media_links
  DROP CONSTRAINT IF EXISTS media_links_media_type_check,
  ADD CONSTRAINT media_links_media_type_check
    CHECK (media_type IN ('youtube_video', 'youtube_playlist', 'vimeo_video', 'podcast', 'audio_lecture', 'article_link'));

CREATE INDEX IF NOT EXISTS idx_media_links_featured
  ON public.media_links (scholar_id, display_order)
  WHERE is_featured = true;

-- 4. Re-assert strict RLS policy on media_links with explicit WITH CHECK
DROP POLICY IF EXISTS "Scholars manage own media links" ON public.media_links;
CREATE POLICY "Scholars manage own media links"
  ON public.media_links FOR ALL
  USING (scholar_id = public.get_current_scholar_id() OR public.is_admin())
  WITH CHECK (scholar_id = public.get_current_scholar_id() OR public.is_admin());

ALTER TABLE public.scholars FORCE ROW LEVEL SECURITY;
ALTER TABLE public.media_links FORCE ROW LEVEL SECURITY;
