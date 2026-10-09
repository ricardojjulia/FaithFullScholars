-- ==============================================================================
-- FaithFull Scholars — Migration: Course integrity (spec 2026-10-08-scholar-courses)
--
-- Idempotent. Deploy order: apply this migration FIRST, then merge/deploy the app.
--
-- 1. Globally unique course slugs. Public pages look a course up by slug alone
--    (getPublicCourseBySlug), but the table only enforced UNIQUE(scholar_id, slug),
--    so two scholars with the same title broke each other's public page (and a
--    scholar could deliberately take down a rival's page). The per-scholar
--    constraint stays; a global unique index is added beside it.
-- 2. Licensing guard in the database. Deleting a course cascades to its
--    course_licensing_agreements, and "Scholars manage own courses" lets a
--    scholar DELETE their own course straight through PostgREST. A BEFORE DELETE
--    trigger now refuses that for restricted callers (authenticated / anon, not
--    admin) when any agreement references the course. Service role and admins
--    (operational cleanup) are unaffected.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Global slug uniqueness (preflight: counts only, never values)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  dup_slugs INTEGER;
  dup_rows  INTEGER;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(n), 0)
    INTO dup_slugs, dup_rows
    FROM (SELECT COUNT(*) AS n FROM public.courses GROUP BY slug HAVING COUNT(*) > 1) d;
  IF dup_slugs > 0 THEN
    RAISE EXCEPTION 'courses_slug_unique preflight failed: % duplicated slug(s) across % course rows. Rename the duplicates, then re-run.',
      dup_slugs, dup_rows;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_unique ON public.courses (slug);

-- ------------------------------------------------------------------------------
-- 2. Licensing delete guard
-- ------------------------------------------------------------------------------
-- RLS on course_licensing_agreements only shows a scholar rows where they are the
-- agreement's scholar, so the check runs in a DEFINER helper that sees every row.
CREATE OR REPLACE FUNCTION private.course_has_licensing_agreements(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_licensing_agreements WHERE course_id = p_course_id
  );
$$;

REVOKE EXECUTE ON FUNCTION private.course_has_licensing_agreements(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.course_has_licensing_agreements(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_course_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF private.is_restricted_caller() AND private.course_has_licensing_agreements(OLD.id) THEN
    RAISE EXCEPTION 'Unauthorized: this course has licensing agreements; make it private instead'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_course_delete ON public.courses;
CREATE TRIGGER trg_guard_course_delete
  BEFORE DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION private.guard_course_delete();
