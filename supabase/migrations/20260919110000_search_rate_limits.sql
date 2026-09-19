-- ==============================================================================
-- FaithFull Scholars — Migration 20260919110000: Search Abuse Gating & Rate Limits
-- Implements token-bucket rate limiting for public search & directory scraping defense.
-- ADR 0008: Search Abuse Gating, Anti-Scraping Defenses & PII Protection
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.search_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_fingerprint TEXT NOT NULL,
  window_bucket TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  is_authenticated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_search_rate_limits_window UNIQUE (client_fingerprint, window_bucket)
);

CREATE INDEX IF NOT EXISTS idx_search_rate_limits_lookup 
ON public.search_rate_limits (client_fingerprint, window_bucket);

CREATE INDEX IF NOT EXISTS idx_search_rate_limits_cleanup
ON public.search_rate_limits (window_bucket);

-- ==============================================================================
-- Row Level Security (RLS) Enforcement
-- ==============================================================================
ALTER TABLE public.search_rate_limits ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated clients can record telemetry/rate limits
CREATE POLICY search_rate_limits_insert ON public.search_rate_limits
  FOR INSERT
  WITH CHECK (true);

-- Only admins or service role can inspect global search rate-limit metrics
CREATE POLICY search_rate_limits_admin_select ON public.search_rate_limits
  FOR SELECT
  USING (
    public.is_admin() OR auth.role() = 'service_role'
  );

CREATE POLICY search_rate_limits_admin_update ON public.search_rate_limits
  FOR UPDATE
  USING (
    public.is_admin() OR auth.role() = 'service_role'
  );

CREATE POLICY search_rate_limits_admin_delete ON public.search_rate_limits
  FOR DELETE
  USING (
    public.is_admin() OR auth.role() = 'service_role'
  );

-- ==============================================================================
-- Atomic Rate Limiting Function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_search_rate_limit(
  p_client_fingerprint TEXT,
  p_max_allowed INT DEFAULT 15,
  p_is_authenticated BOOLEAN DEFAULT false
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INT,
  remaining INT,
  reset_epoch BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bucket TIMESTAMPTZ := date_trunc('minute', now());
  v_count INT;
  v_reset BIGINT := EXTRACT(EPOCH FROM (v_bucket + INTERVAL '1 minute'))::BIGINT;
BEGIN
  INSERT INTO public.search_rate_limits (
    client_fingerprint,
    window_bucket,
    request_count,
    is_authenticated,
    created_at,
    updated_at
  )
  VALUES (
    p_client_fingerprint,
    v_bucket,
    1,
    p_is_authenticated,
    now(),
    now()
  )
  ON CONFLICT (client_fingerprint, window_bucket)
  DO UPDATE SET
    request_count = public.search_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING public.search_rate_limits.request_count INTO v_count;

  RETURN QUERY SELECT
    (v_count <= p_max_allowed) AS allowed,
    v_count AS current_count,
    GREATEST(0, p_max_allowed - v_count) AS remaining,
    v_reset AS reset_epoch;
END;
$$;
