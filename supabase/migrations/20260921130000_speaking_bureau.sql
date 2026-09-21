-- Migration: Theological Conference Speaker Directory & Speaking Bureau (ADR 0009)
-- Creates speaker_topics table and extends availability_profiles with speaking metadata.

-- 1. Extend availability_profiles with travel preferences, bio, and honorarium guidelines
ALTER TABLE public.availability_profiles
ADD COLUMN IF NOT EXISTS travel_preferences TEXT,
ADD COLUMN IF NOT EXISTS speaking_bio TEXT,
ADD COLUMN IF NOT EXISTS honorarium_policy TEXT;

-- 2. Create speaker_topics table
CREATE TABLE IF NOT EXISTS public.speaker_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'academic' CHECK (target_audience IN ('academic', 'pastoral', 'church_wide', 'undergraduate')),
    sample_media_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Covering Indexes (Splinter 0001)
CREATE INDEX IF NOT EXISTS idx_speaker_topics_scholar_id ON public.speaker_topics(scholar_id);
CREATE INDEX IF NOT EXISTS idx_speaker_topics_audience ON public.speaker_topics(target_audience);
CREATE INDEX IF NOT EXISTS idx_speaker_topics_featured ON public.speaker_topics(is_featured);

-- 4. Search-path-pinned updated_at trigger (Splinter 0011)
DROP TRIGGER IF EXISTS set_speaker_topics_updated_at ON public.speaker_topics;
CREATE TRIGGER set_speaker_topics_updated_at
    BEFORE UPDATE ON public.speaker_topics
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable and Force Row Level Security (Splinter 0002)
ALTER TABLE public.speaker_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_topics FORCE ROW LEVEL SECURITY;

-- 6. Granular Row Level Security Policies
-- Policy 1: Public SELECT for approved scholars with active speaking availability
DROP POLICY IF EXISTS "Public can view active speaker topics" ON public.speaker_topics;
CREATE POLICY "Public can view active speaker topics"
ON public.speaker_topics FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.scholars s
        JOIN public.availability_profiles ap ON ap.scholar_id = s.id
        WHERE s.id = speaker_topics.scholar_id
          AND s.profile_status = 'approved'
          AND ('conference_speaking' = ANY(ap.opportunity_types) OR 'guest_lecturing' = ANY(ap.opportunity_types))
    )
);

-- Policy 2: Scholars can view their own speaker topics regardless of approval/availability
DROP POLICY IF EXISTS "Scholars can view their own speaker topics" ON public.speaker_topics;
CREATE POLICY "Scholars can view their own speaker topics"
ON public.speaker_topics FOR SELECT
TO authenticated
USING (scholar_id = (SELECT public.get_current_scholar_id()));

-- Policy 3: Scholars can insert their own speaker topics (Splinter 0003 & 0024)
DROP POLICY IF EXISTS "Scholars can insert their own speaker topics" ON public.speaker_topics;
CREATE POLICY "Scholars can insert their own speaker topics"
ON public.speaker_topics FOR INSERT
TO authenticated
WITH CHECK (scholar_id = (SELECT public.get_current_scholar_id()));

-- Policy 4: Scholars can update their own speaker topics
DROP POLICY IF EXISTS "Scholars can update their own speaker topics" ON public.speaker_topics;
CREATE POLICY "Scholars can update their own speaker topics"
ON public.speaker_topics FOR UPDATE
TO authenticated
USING (scholar_id = (SELECT public.get_current_scholar_id()))
WITH CHECK (scholar_id = (SELECT public.get_current_scholar_id()));

-- Policy 5: Scholars can delete their own speaker topics
DROP POLICY IF EXISTS "Scholars can delete their own speaker topics" ON public.speaker_topics;
CREATE POLICY "Scholars can delete their own speaker topics"
ON public.speaker_topics FOR DELETE
TO authenticated
USING (scholar_id = (SELECT public.get_current_scholar_id()));

-- Policy 6: Platform administrators can manage all speaker topics
DROP POLICY IF EXISTS "Admins can manage all speaker topics" ON public.speaker_topics;
CREATE POLICY "Admins can manage all speaker topics"
ON public.speaker_topics FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
