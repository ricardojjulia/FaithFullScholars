/**
 * Server-side helpers for the scholar course routes and page. Everything runs on
 * the signed-in user's own client, so the `courses` / `course_disciplines` RLS
 * policies are the real gate; `scholar_id` always comes from the session.
 */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/auth/session';
import type { CourseLevel, CourseVisibility, DeliveryMode } from '@/lib/domain/types';

export const COURSE_SELECT =
  'id, title, slug, description, level, primary_discipline_id, delivery_modes, reading_list, visibility, created_at, updated_at, course_disciplines(discipline_id)';

export interface ScholarCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: CourseLevel;
  primary_discipline_id: string | null;
  delivery_modes: DeliveryMode[];
  reading_list: string | null;
  visibility: CourseVisibility;
  created_at: string;
  updated_at: string;
  course_disciplines?: Array<{ discipline_id: string }> | null;
}

export type CourseAuth =
  | { ok: true; supabase: SupabaseClient; scholarId: string }
  | { ok: false; response: NextResponse };

const json = (error: string, status: number) => NextResponse.json({ error }, { status });

/** 401 signed out, 503 lookup outage, 404 no scholar profile; otherwise the session's scholar id. */
export async function resolveCourseAuth(): Promise<CourseAuth> {
  const supabase = await createClient();
  const session = await getSessionContext(supabase);
  if (!session) return { ok: false, response: json('Authentication required', 401) };
  if (session.lookupFailed) {
    return { ok: false, response: json('Your access could not be verified right now. Please try again.', 503) };
  }
  if (!session.scholarId) return { ok: false, response: json('Scholar profile not found', 404) };
  return { ok: true, supabase, scholarId: session.scholarId };
}

/** Logs a database error code only, never the error object. */
export function logCode(label: string, error: unknown): void {
  const code = error && typeof error === 'object' ? (error as { code?: string }).code : undefined;
  console.error(`${label} (code):`, code ?? 'unknown');
}

export function isDbCode(error: unknown, code: string): boolean {
  return !!error && typeof error === 'object' && (error as { code?: string }).code === code;
}

/** Replaces the course's discipline tags. Returns the database error, if any. */
export async function replaceCourseDisciplines(
  supabase: SupabaseClient,
  courseId: string,
  disciplineIds: string[]
): Promise<unknown | null> {
  const removed = await supabase.from('course_disciplines').delete().eq('course_id', courseId);
  if (removed.error) return removed.error;
  if (disciplineIds.length === 0) return null;
  const added = await supabase
    .from('course_disciplines')
    .insert(disciplineIds.map((discipline_id) => ({ course_id: courseId, discipline_id })));
  return added.error ?? null;
}

/** The signed-in scholar's own courses, newest first. Throws on a database error. */
export async function fetchOwnCoursesOrThrow(supabase: SupabaseClient, scholarId: string): Promise<ScholarCourse[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(COURSE_SELECT)
    .eq('scholar_id', scholarId)
    .order('created_at', { ascending: false });
  if (error) {
    logCode('fetchOwnCoursesOrThrow', error);
    throw new Error('courses_unavailable');
  }
  return (data ?? []) as unknown as ScholarCourse[];
}

export interface DisciplineOption {
  id: string;
  name: string;
}

export async function fetchDisciplineOptionsOrThrow(supabase: SupabaseClient): Promise<DisciplineOption[]> {
  const { data, error } = await supabase.from('disciplines').select('id, name').order('name', { ascending: true });
  if (error) {
    logCode('fetchDisciplineOptionsOrThrow', error);
    throw new Error('disciplines_unavailable');
  }
  return (data ?? []) as DisciplineOption[];
}
