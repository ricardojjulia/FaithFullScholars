import { NextRequest, NextResponse } from 'next/server';
import { slugify, uniqueSlug, validateCourseInput } from '@/lib/courses/course-validation';
import {
  COURSE_SELECT,
  checkDisciplinesExist,
  fetchOwnCoursesOrThrow,
  isDbCode,
  logCode,
  resolveCourseAuth,
  syncCourseDisciplines,
} from '@/lib/courses/course-service';

export const dynamic = 'force-dynamic';

const GENERIC_ERROR = 'Unable to process the request. Please try again.';
const MAX_BODY_BYTES = 40_000;
const MAX_SLUG_RETRIES = 5;

export async function GET() {
  try {
    const auth = await resolveCourseAuth();
    if (!auth.ok) return auth.response;
    const courses = await fetchOwnCoursesOrThrow(auth.supabase, auth.scholarId);
    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveCourseAuth();
    if (!auth.ok) return auth.response;
    const { supabase, scholarId } = auth;

    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Unknown keys (including any scholar_id or slug) are dropped by the validator.
    const parsed = validateCourseInput(body, { partial: false });
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Please fix the highlighted fields.', fields: parsed.errors }, { status: 400 });
    }
    const input = parsed.value;

    // Fail before any write when a discipline id is not real.
    const disciplineIds = input.discipline_ids ?? [];
    const exists = await checkDisciplinesExist(supabase, disciplineIds);
    if (exists === 'missing') {
      return NextResponse.json(
        { error: 'Choose valid disciplines.', fields: { discipline_ids: 'Choose valid disciplines.' } },
        { status: 400 }
      );
    }
    if (exists === 'error') return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });

    const base = slugify(input.title ?? '');
    const { data: existing, error: slugError } = await supabase
      .from('courses')
      .select('slug')
      .eq('scholar_id', scholarId)
      .like('slug', `${base}%`);
    if (slugError) {
      logCode('POST /api/scholars/courses slug lookup', slugError);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

    const insertRow = (slug: string) => ({
      scholar_id: scholarId,
      title: input.title,
      slug,
      description: input.description ?? null,
      reading_list: input.reading_list ?? null,
      level: input.level,
      primary_discipline_id: input.primary_discipline_id ?? null,
      delivery_modes: input.delivery_modes ?? [],
      // New courses are private until the scholar publishes them (owner decision).
      visibility: 'private',
    });

    // Slugs are globally unique, but RLS hides other scholars' private rows, so a clash can only
    // be seen as a 23505. Retry with a short random suffix, then answer generically: the reply
    // must not reveal whether another course exists.
    let slug = uniqueSlug(base, taken);
    let inserted = await supabase.from('courses').insert(insertRow(slug)).select('id').single();
    for (
      let attempt = 0;
      attempt < MAX_SLUG_RETRIES && inserted.error && isDbCode(inserted.error, '23505');
      attempt += 1
    ) {
      slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
      inserted = await supabase.from('courses').insert(insertRow(slug)).select('id').single();
    }
    if (inserted.error || !inserted.data) {
      if (isDbCode(inserted.error, '23505')) {
        return NextResponse.json(
          { error: 'We could not create a web address for this course. Please try a different title.' },
          { status: 409 }
        );
      }
      if (isDbCode(inserted.error, '23503')) {
        return NextResponse.json(
          { error: 'Choose a valid discipline.', fields: { primary_discipline_id: 'Choose a valid discipline.' } },
          { status: 400 }
        );
      }
      logCode('POST /api/scholars/courses insert', inserted.error);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    const courseId = (inserted.data as { id: string }).id;

    const tagError = await syncCourseDisciplines(supabase, courseId, disciplineIds, false);
    if (tagError) {
      logCode('POST /api/scholars/courses disciplines', tagError);
      // Do not leave a half-created course behind.
      const cleanup = await supabase.from('courses').delete().eq('id', courseId).eq('scholar_id', scholarId);
      if (cleanup.error) logCode('POST /api/scholars/courses cleanup', cleanup.error);
      const status = isDbCode(tagError, '23503') ? 400 : 500;
      return NextResponse.json(
        { error: status === 400 ? 'Choose valid disciplines.' : GENERIC_ERROR },
        { status }
      );
    }

    const { data: course, error: readError } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .eq('id', courseId)
      .eq('scholar_id', scholarId)
      .single();
    if (readError || !course) {
      logCode('POST /api/scholars/courses read-back', readError);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    return NextResponse.json({ course }, { status: 201 });
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
