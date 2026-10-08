import { NextRequest, NextResponse } from 'next/server';
import { isUuid, validateCourseInput } from '@/lib/courses/course-validation';
import {
  COURSE_SELECT,
  isDbCode,
  logCode,
  replaceCourseDisciplines,
  resolveCourseAuth,
} from '@/lib/courses/course-service';

export const dynamic = 'force-dynamic';

const GENERIC_ERROR = 'Unable to process the request. Please try again.';
const NOT_FOUND = 'Course not found';
const MAX_BODY_BYTES = 40_000;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await resolveCourseAuth();
    if (!auth.ok) return auth.response;
    const { supabase, scholarId } = auth;

    const { id } = await ctx.params;
    if (!isUuid(id)) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

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

    const parsed = validateCourseInput(body, { partial: true });
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Please fix the highlighted fields.', fields: parsed.errors }, { status: 400 });
    }
    const { discipline_ids, ...columns } = parsed.value;

    // Only allow-listed columns; scholar_id and slug are never updatable here.
    const update: Record<string, unknown> = { ...columns };
    if (Object.keys(update).length === 0 && discipline_ids === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    update.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('courses')
      .update(update)
      .eq('id', id)
      .eq('scholar_id', scholarId)
      .select('id')
      .maybeSingle();
    if (updateError) {
      if (isDbCode(updateError, '23503')) {
        return NextResponse.json({ error: 'Choose a valid discipline.' }, { status: 400 });
      }
      logCode('PATCH /api/scholars/courses/[id] update', updateError);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    if (!updated) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

    if (discipline_ids !== undefined) {
      const tagError = await replaceCourseDisciplines(supabase, id, discipline_ids);
      if (tagError) {
        logCode('PATCH /api/scholars/courses/[id] disciplines', tagError);
        const status = isDbCode(tagError, '23503') ? 400 : 500;
        return NextResponse.json(
          { error: status === 400 ? 'Choose valid disciplines.' : GENERIC_ERROR },
          { status }
        );
      }
    }

    const { data: course, error: readError } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .eq('id', id)
      .eq('scholar_id', scholarId)
      .maybeSingle();
    if (readError || !course) {
      logCode('PATCH /api/scholars/courses/[id] read-back', readError);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    return NextResponse.json({ course });
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const auth = await resolveCourseAuth();
    if (!auth.ok) return auth.response;
    const { supabase, scholarId } = auth;

    const { id } = await ctx.params;
    if (!isUuid(id)) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

    const { data: owned, error: ownError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', id)
      .eq('scholar_id', scholarId)
      .maybeSingle();
    if (ownError) {
      logCode('DELETE /api/scholars/courses/[id] lookup', ownError);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    if (!owned) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

    // Deleting a course cascades to its licensing agreements, so refuse when any exist (owner decision).
    const { count, error: countError } = await supabase
      .from('course_licensing_agreements')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', id);
    if (countError) {
      logCode('DELETE /api/scholars/courses/[id] licensing count', countError);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            'This course has licensing agreements and cannot be deleted. Make it private instead to hide it from the catalogue.',
          code: 'has_licensing_agreements',
        },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
      .eq('scholar_id', scholarId);
    if (deleteError) {
      logCode('DELETE /api/scholars/courses/[id] delete', deleteError);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
