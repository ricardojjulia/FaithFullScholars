import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  fetchInstitutionStats,
  fetchInstitutionProfileOrThrow,
  fetchScholarInquiriesOrThrow,
  fetchInstitutionInquiriesOrThrow,
  fetchSavedScholarsOrThrow,
  fetchSavedCoursesOrThrow,
} from '@/lib/inquiries/queries';
import { removeSavedScholar, removeSavedCourse } from '@/lib/inquiries/actions';
import { fetchScholarDashboardSummary } from '@/lib/profiles/dashboard-summary';
import { covers } from '../support/covers';

/**
 * Portal data as REAL signed-in users.
 *
 * Users are created through the Auth Admin API and sign in with supabase-js
 * (anon key + password), so every query below goes through PostgREST with a
 * genuine JWT and RLS applied, exactly like the pages. Two institutions and two
 * scholars get deliberately different data, so any cross-tenant leak changes a
 * count. Everything is created per run and removed afterwards.
 */

covers('api:DELETE /api/institution/saved-scholars', 'api:DELETE /api/institution/saved-courses');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const run = randomUUID().slice(0, 8);
const password = `Pw-${randomUUID()}`;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

interface Actor {
  userId: string;
  email: string;
  client: SupabaseClient;
}

describe('portal data under RLS (real signed-in users)', () => {
  const admin = createClient(url, serviceKey, noSession);
  const userIds: string[] = [];

  let instA: string;
  let instB: string;
  let scholar1: string;
  let scholar2: string;
  let course1: string;
  let userA: Actor;
  let userB: Actor;
  let s1: Actor;
  let s2: Actor;

  async function createActor(label: string, role: 'scholar' | 'institution_user'): Promise<Actor> {
    const email = `portal-rls-${label}-${run}@test.faithfullscholars.dev`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error('createUser failed');
    const userId = created.data.user.id;
    userIds.push(userId);
    const account = await admin.from('accounts').insert({ id: userId, email, role });
    if (account.error) throw account.error;

    const client = createClient(url, anonKey, noSession);
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    return { userId, email, client };
  }

  async function insertOne<T>(table: string, row: Record<string, unknown>): Promise<T> {
    const { data, error } = await admin.from(table).insert(row).select('id').single();
    if (error) throw error;
    return (data as { id: string }).id as T;
  }

  const inquiry = (institutionId: string, scholarId: string, sender: string, status: string, createdAt: string) => ({
    institution_id: institutionId,
    scholar_id: scholarId,
    sender_account_id: sender,
    opportunity_type: 'adjunct_teaching',
    message: `Portal RLS probe ${run}: ${status}`,
    contact_email: 'dean@test.faithfullscholars.dev',
    status,
    created_at: createdAt,
  });

  beforeAll(async () => {
    expect(url && anonKey && serviceKey, 'Supabase env must be set for integration tests').toBeTruthy();

    [userA, userB, s1, s2] = await Promise.all([
      createActor('inst-a', 'institution_user'),
      createActor('inst-b', 'institution_user'),
      createActor('scholar-1', 'scholar'),
      createActor('scholar-2', 'scholar'),
    ]);

    instA = await insertOne<string>('institutions', {
      name: `Portal RLS Seminary A ${run}`,
      slug: `portal-rls-a-${run}`,
      institution_type: 'seminary',
      status: 'approved',
      contact_email: userA.email,
      location: 'Alpha City',
    });
    instB = await insertOne<string>('institutions', {
      name: `Portal RLS Seminary B ${run}`,
      slug: `portal-rls-b-${run}`,
      institution_type: 'seminary',
      status: 'approved',
      contact_email: userB.email,
      location: 'Beta City',
    });
    for (const [inst, actor] of [[instA, userA], [instB, userB]] as const) {
      const { error } = await admin
        .from('institution_users')
        .insert({ institution_id: inst, account_id: actor.userId, role: 'owner' });
      if (error) throw error;
    }

    scholar1 = await insertOne<string>('scholars', {
      account_id: s1.userId,
      slug: `portal-rls-s1-${run}`,
      full_name: `Dr. Portal One ${run}`,
      profile_status: 'approved',
    });
    scholar2 = await insertOne<string>('scholars', {
      account_id: s2.userId,
      slug: `portal-rls-s2-${run}`,
      full_name: `Dr. Portal Two ${run}`,
      profile_status: 'approved',
    });
    course1 = await insertOne<string>('courses', {
      scholar_id: scholar1,
      title: `Portal RLS Course ${run}`,
      slug: `portal-rls-course-${run}`,
      level: 'graduate',
      visibility: 'public',
    });
    await insertOne('courses', {
      scholar_id: scholar1,
      title: `Portal RLS Private Course ${run}`,
      slug: `portal-rls-private-${run}`,
      level: 'graduate',
      visibility: 'private',
    });

    // Institution A: 4 inquiries (2 pending, 1 read, 1 accepted); B: 1 pending.
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const rows = [
      inquiry(instA, scholar1, userA.userId, 'pending', now),
      inquiry(instA, scholar1, userA.userId, 'read', now),
      inquiry(instA, scholar1, userA.userId, 'accepted', old),
      inquiry(instA, scholar2, userA.userId, 'pending', now),
      inquiry(instB, scholar1, userB.userId, 'pending', now),
    ];
    const ins = await admin.from('inquiries').insert(rows);
    if (ins.error) throw ins.error;

    // Shortlists: A saves both scholars and a course; B saves scholar 1 only.
    const savedScholars = await admin.from('saved_scholars').insert([
      { institution_id: instA, scholar_id: scholar1 },
      { institution_id: instA, scholar_id: scholar2 },
      { institution_id: instB, scholar_id: scholar1 },
    ]);
    if (savedScholars.error) throw savedScholars.error;
    const savedCourses = await admin.from('saved_courses').insert({ institution_id: instA, course_id: course1 });
    if (savedCourses.error) throw savedCourses.error;

    const availability = await admin.from('availability_profiles').insert({
      scholar_id: scholar1,
      is_available_for_hire: true,
      opportunity_types: ['adjunct_teaching'],
    });
    if (availability.error) throw availability.error;
  }, 60_000);

  afterAll(async () => {
    // Deleting the institutions, scholars and auth users cascades to everything above.
    for (const id of [instA, instB].filter(Boolean)) await admin.from('institutions').delete().eq('id', id);
    for (const id of [scholar1, scholar2].filter(Boolean)) await admin.from('scholars').delete().eq('id', id);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  }, 60_000);

  describe('institution isolation', () => {
    it('each institution sees exactly its own counts (A != B so a leak would show)', async () => {
      expect(await fetchInstitutionStats(userA.client, instA)).toEqual({
        totalInquiries: 4,
        pendingInquiries: 2,
        awaitingInquiries: 3, // pending + read
        acceptedInquiries: 1,
        savedScholarsCount: 2,
        savedCoursesCount: 1,
      });
      expect(await fetchInstitutionStats(userB.client, instB)).toEqual({
        totalInquiries: 1,
        pendingInquiries: 1,
        awaitingInquiries: 1,
        acceptedInquiries: 0,
        savedScholarsCount: 1,
        savedCoursesCount: 0,
      });
    });

    it('asking for another institution returns nothing, never that institution’s numbers', async () => {
      const crossed = await fetchInstitutionStats(userB.client, instA);
      expect(Object.values(crossed).every((n) => n === 0)).toBe(true);
      expect(await fetchInstitutionInquiriesOrThrow(userB.client, instA)).toEqual([]);
      expect(await fetchSavedScholarsOrThrow(userB.client, instA)).toEqual([]);
      expect(await fetchSavedCoursesOrThrow(userB.client, instA)).toEqual([]);
    });

    it('the institution home profile is the member’s own institution, with only the narrowed columns', async () => {
      const profile = await fetchInstitutionProfileOrThrow(userA.client, instA);
      expect(profile).toMatchObject({ id: instA, location: 'Alpha City', status: 'approved' });
      expect(profile).not.toHaveProperty('contact_email');
    });

    it('lists the real outbox and shortlist for the member institution only', async () => {
      const outbox = await fetchInstitutionInquiriesOrThrow(userA.client, instA);
      expect(outbox).toHaveLength(4);
      expect(outbox.every((row) => row.institution_id === instA)).toBe(true);

      const scholars = await fetchSavedScholarsOrThrow(userA.client, instA);
      expect(scholars.map((s) => s.scholar_id).sort()).toEqual([scholar1, scholar2].sort());
      expect(scholars.every((s) => s.scholar?.full_name?.includes(run))).toBe(true);

      const courses = await fetchSavedCoursesOrThrow(userA.client, instA);
      expect(courses).toHaveLength(1);
      expect(courses[0].course).toMatchObject({ id: course1, scholar_name: `Dr. Portal One ${run}` });
    });
  });

  describe('shortlist removal', () => {
    it('a cross-institution delete removes 0 rows and leaves the owner’s shortlist intact', async () => {
      // Institution B tries to remove institution A's saved scholar and course.
      const scholarResult = await removeSavedScholar(userB.client, instA, scholar2);
      expect(scholarResult).toMatchObject({ success: true, data: { removed: false } });
      const courseResult = await removeSavedCourse(userB.client, instA, course1);
      expect(courseResult).toMatchObject({ success: true, data: { removed: false } });

      const { count: scholarsLeft } = await admin
        .from('saved_scholars')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', instA);
      const { count: coursesLeft } = await admin
        .from('saved_courses')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', instA);
      expect(scholarsLeft).toBe(2);
      expect(coursesLeft).toBe(1);
    });

    it('B can remove its own entry; the second call is an idempotent no-op that adds nothing', async () => {
      const first = await removeSavedScholar(userB.client, instB, scholar1);
      expect(first).toMatchObject({ success: true, data: { removed: true } });
      const second = await removeSavedScholar(userB.client, instB, scholar1);
      expect(second).toMatchObject({ success: true, data: { removed: false } });

      const { count } = await admin
        .from('saved_scholars')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', instB);
      expect(count).toBe(0);
      // and A's row for the same scholar is untouched
      const aRow = await admin.from('saved_scholars').select('id').eq('institution_id', instA).eq('scholar_id', scholar1);
      expect(aRow.data).toHaveLength(1);
    });
  });

  describe('scholar isolation', () => {
    it('scholar 1 sees only their own 4 inquiries; scholar 2 only their 1', async () => {
      const mine = await fetchScholarInquiriesOrThrow(s1.client, scholar1);
      expect(mine).toHaveLength(4);
      expect(mine.every((row) => row.scholar_id === scholar1)).toBe(true);

      const theirs = await fetchScholarInquiriesOrThrow(s2.client, scholar2);
      expect(theirs).toHaveLength(1);
      expect(theirs[0].scholar_id).toBe(scholar2);
    });

    it('asking for another scholar’s inquiries returns nothing', async () => {
      expect(await fetchScholarInquiriesOrThrow(s2.client, scholar1)).toEqual([]);
      expect(await fetchScholarInquiriesOrThrow(s1.client, scholar2)).toEqual([]);
    });

    it('the dashboard summary is real and scoped: counts, trend, public courses, availability', async () => {
      const summary = await fetchScholarDashboardSummary(s1.client, scholar1, new Date());
      expect(summary).not.toBeNull();
      expect(summary).toMatchObject({
        fullName: `Dr. Portal One ${run}`,
        profile: { label: 'Published' },
        totalInquiries: 4,
        publicCourseCount: 1, // the private course is not counted
        availability: { badge: 'Available', detail: 'Adjunct Teaching' },
      });
      // 3 inquiries in the last 30 days, 1 (40 days old) in the previous window
      expect(summary!.trend).toMatchObject({ last30: 3, previous30: 1, delta: 2 });

      const other = await fetchScholarDashboardSummary(s2.client, scholar2, new Date());
      expect(other).toMatchObject({ totalInquiries: 1, publicCourseCount: 0, availability: { state: 'unset' } });
    });

    it('another scholar’s summary request shows no private inquiry data', async () => {
      // Scholar 1's profile is public (approved), but their inquiries are not readable by scholar 2.
      const crossed = await fetchScholarDashboardSummary(s2.client, scholar1, new Date());
      expect(crossed?.totalInquiries ?? 0).toBe(0);
      expect(crossed?.trend.last30 ?? 0).toBe(0);
    });
  });
});
