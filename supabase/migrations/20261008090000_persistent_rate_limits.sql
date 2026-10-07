-- ==============================================================================
-- FaithFull Scholars — Migration 20261008090000: Persistent, enforced rate limits
-- ADR 0026 (extends ADR 0008). Idempotent; no data changes.
--
--   1. public.rate_limit_buckets  one fixed-window counter per (key, window).
--                                 FORCE RLS plus an explicit deny-all policy for
--                                 the API roles, so PostgREST cannot reach it.
--   2. public.check_rate_limit()  the single limiter primitive. SECURITY DEFINER,
--                                 service_role only. The caller derives the key
--                                 on the server; a client never supplies it.
--   3. check_search_rate_limit()  legacy limiter: no longer callable by
--                                 authenticated (it let any signed-in user burn
--                                 another client's allowance). Kept for now.
--   4. Inquiry cap in the database: private.guard_inquiry_rate() allows at most
--      10 inquiries per institution per hour for restricted callers, SQLSTATE
--      FS429. It counts inquiries rows, so direct PostgREST inserts are covered
--      and no counter table exists. If the check cannot run, the insert fails
--      (fails closed by construction).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Bucket table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key          TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits         INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window_start
  ON public.rate_limit_buckets (window_start);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets FORCE ROW LEVEL SECURITY;

-- Zero access by design. The only writer is check_rate_limit() (SECURITY DEFINER,
-- owned by the migration role, which bypasses RLS). The explicit deny-all policy
-- documents that intent and keeps `npm run audit:rls` (every table needs a policy).
DROP POLICY IF EXISTS rate_limit_buckets_deny_all ON public.rate_limit_buckets;
CREATE POLICY rate_limit_buckets_deny_all ON public.rate_limit_buckets
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.rate_limit_buckets FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. The limiter primitive
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_seconds INT,
  p_max INT
)
RETURNS TABLE (allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_hits INT;
BEGIN
  IF p_key IS NULL OR length(p_key) < 1 OR length(p_key) > 200 THEN
    RAISE EXCEPTION 'invalid rate limit key' USING ERRCODE = '22023';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit window' USING ERRCODE = '22023';
  END IF;
  IF p_max IS NULL OR p_max < 1 OR p_max > 10000 THEN
    RAISE EXCEPTION 'invalid rate limit max' USING ERRCODE = '22023';
  END IF;

  -- Bounded cleanup (no external scheduler): at most 100 expired rows per call.
  DELETE FROM public.rate_limit_buckets b
  WHERE (b.key, b.window_start) IN (
    SELECT o.key, o.window_start
    FROM public.rate_limit_buckets o
    WHERE o.window_start < now() - interval '1 day'
    LIMIT 100
  );

  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  -- Atomic upsert: concurrent callers are counted exactly.
  INSERT INTO public.rate_limit_buckets AS b (key, window_start, hits)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = b.hits + 1
  RETURNING b.hits INTO v_hits;

  allowed := v_hits <= p_max;
  remaining := GREATEST(p_max - v_hits, 0);
  reset_at := v_window_start + make_interval(secs => p_window_seconds);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;

-- ------------------------------------------------------------------------------
-- 3. Legacy limiter: service_role only (not dropped yet; follow-up removes it
--    together with search_rate_limits)
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_search_rate_limit(TEXT, INT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_search_rate_limit(TEXT, INT, BOOLEAN) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. Inquiry cap at the database
-- ------------------------------------------------------------------------------
-- Counts through a SECURITY DEFINER helper so the count is not narrowed by the
-- caller's RLS. It is VOLATILE on purpose: a STABLE function would reuse the
-- calling statement's snapshot and could miss an inquiry committed by a
-- concurrent transaction while we waited for the advisory lock.
CREATE OR REPLACE FUNCTION private.recent_inquiry_count(p_institution_id UUID)
RETURNS INT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::int
  FROM public.inquiries
  WHERE institution_id = p_institution_id
    AND created_at > now() - interval '1 hour';
$$;

REVOKE EXECUTE ON FUNCTION private.recent_inquiry_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.recent_inquiry_count(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_inquiry_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF private.is_restricted_caller() THEN
    -- Serialise concurrent inserts per institution so the count is exact.
    PERFORM pg_advisory_xact_lock(
      hashtextextended('inquiry-rate:' || NEW.institution_id::text, 0)
    );
    IF private.recent_inquiry_count(NEW.institution_id) >= 10 THEN
      RAISE EXCEPTION 'Unauthorized: inquiry rate limit reached' USING ERRCODE = 'FS429';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.guard_inquiry_rate() FROM PUBLIC;

-- Same-event triggers fire alphabetically. 'trg_guard_inquiries' sorts before
-- 'trg_guard_inquiry_rate' ('i' < 'y' at the 17th character), so the existing
-- guard messages are unchanged and this one only runs on otherwise-valid inserts.
DROP TRIGGER IF EXISTS trg_guard_inquiry_rate ON public.inquiries;
CREATE TRIGGER trg_guard_inquiry_rate
  BEFORE INSERT ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION private.guard_inquiry_rate();
