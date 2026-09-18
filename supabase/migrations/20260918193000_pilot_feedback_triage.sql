-- Migration: 20260918193000_pilot_feedback_triage.sql
-- Purpose: Pilot Feedback & Error-Triage System (Schema, RLS, and Atomic Helpers)

CREATE TABLE IF NOT EXISTS public.pilot_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint TEXT UNIQUE NOT NULL,
    session_id UUID NOT NULL,
    route TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('BUG', 'ERROR', 'UNEXPECTED_RESULT', 'IMPROVEMENT')),
    error_message TEXT,
    note TEXT,
    breadcrumbs JSONB DEFAULT '[]'::jsonb,
    user_email TEXT,
    user_role TEXT,
    app_version TEXT,
    session_duration_seconds INT CHECK (session_duration_seconds IS NULL OR session_duration_seconds >= 0),
    hit_count INT NOT NULL DEFAULT 1 CHECK (hit_count >= 1),
    metadata JSONB DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT false,
    action TEXT CHECK (action IS NULL OR action IN ('FIXED_IN_CODE', 'NO_ACTION_NEEDED', 'ACKNOWLEDGED', 'IMPLEMENTED', 'RECEIVED_AND_CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pilot_feedback_rate_limits (
    session_id UUID NOT NULL,
    window_bucket TIMESTAMPTZ NOT NULL,
    request_count INT NOT NULL DEFAULT 1,
    PRIMARY KEY (session_id, window_bucket)
);

-- Indexes for efficient triage querying and filtering
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_route ON public.pilot_feedback (route);
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_category ON public.pilot_feedback (category);
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_session_id ON public.pilot_feedback (session_id);
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_created_at_desc ON public.pilot_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_processed_created ON public.pilot_feedback (processed, created_at DESC);

-- Enable and force Row Level Security (RLS)
ALTER TABLE public.pilot_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_feedback FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pilot_feedback_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_feedback_rate_limits FORCE ROW LEVEL SECURITY;

-- RLS Policies for Staff/Admin Access
-- Only authenticated users with role = 'admin' may read or mutate triage records directly
CREATE POLICY "staff_read_pilot_feedback" ON public.pilot_feedback
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

CREATE POLICY "staff_update_pilot_feedback" ON public.pilot_feedback
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

CREATE POLICY "staff_manage_rate_limits" ON public.pilot_feedback_rate_limits
    FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Atomic Rate Limiting Function
CREATE OR REPLACE FUNCTION public.check_pilot_feedback_rate_limit(
    p_session_id UUID,
    p_max_requests INT DEFAULT 20
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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
        RETURN false; -- Exceeded rate limit
    END IF;

    RETURN true; -- Allowed
END;
$$;

-- Atomic Feedback Upsert Function
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
