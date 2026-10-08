import { NextRequest, NextResponse } from 'next/server';
import { slugify, uniqueSlug, validateCourseInput } from '@/lib/courses/course-validation';
import {
  COURSE_SELECT,
  fetchOwnCoursesOrThrow,
  isDbCode,
  logCode,
  replaceCourseDisciplines,
  resolveCourseAuth,
} from '@/lib/courses/course-service';

export const dynamic = 'force-dynamic';

const GENERIC_ERROR = 'Unable to process the request. Please try again.';
const MAX_BODY_BYTES = 40_000;

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

    let slug = uniqueSlug(base, taken);
    let inserted = await supabase.from('courses').insert(insertRow(slug)).select('id').single();
    if (inserted.error && isDbCode(inserted.error, '23505')) {
      // Lost a race for the slug: retry once with a random suffix.
      slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
      inserted = await supabase.from('courses').insert(insertRow(slug)).select('id').single();
    }
    if (inserted.error || !inserted.data) {
      if (isDbCode(inserted.error, '23503')) {
        return NextResponse.json({ error: 'Choose a valid discipline.', fields: { primary_discipline_id: 'Choose a valid discipline.' } }, { status: 400 });
      }
      logCode('POST /api/scholars/courses insert', inserted.error);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    const courseId = (inserted.data as { id: string }).id;

    const tagError = await replaceCourseDisciplines(supabase, courseId, input.discipline_ids ?? []);
    if (tagError) {
      logCode('POST /api/scholars/courses disciplines', tagError);
      // Do not leave a half-created course behind.
      await supabase.from('courses').delete().eq('id', courseId).eq('scholar_id', scholarId);
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
