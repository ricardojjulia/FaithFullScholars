import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchOwnCoursesOrThrow } from '@/lib/courses/course-service';
import { covers } from '../support/covers';

/**
 * Scholar courses under RLS as REAL signed-in users (spec 2026-10-08-scholar-courses).
 * Scholar A is approved, scholar B is a draft. The routes use the user client, so
 * these queries are exactly what the routes run: if the database lets B touch A's
 * course, the routes would too.
 */

covers(
  'api:GET /api/scholars/courses',
  'api:POST /api/scholars/courses',
  'api:PATCH /api/scholars/courses/[id]',
  'api:DELETE /api/scholars/courses/[id]'
);

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
  client: SupabaseClient;
}

describe('scholar courses under RLS (real signed-in users)', () => {
  const admin = createClient(url, serviceKey, noSession);
  const userIds: string[] = [];
  let scholarA: string;
  let scholarB: string;
  let a: Actor;
  let b: Actor;
  let disciplineId: string;
  let publicA: string;
  let privateA: string;
  let unlistedA: string;
  let publicB: string;

  async function createActor(label: string): Promise<Actor> {
    const email = `courses-rls-${label}-${run}@test.faithfullscholars.dev`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error('createUser failed');
    const userId = created.data.user.id;
    userIds.push(userId);
    const account = await admin.from('accounts').insert({ id: userId, email, role: 'scholar' });
    if (account.error) throw account.error;
    const client = createClient(url, anonKey, noSession);
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    return { userId, client };
  }

  async function insertOne(table: string, row: Record<string, unknown>): Promise<string> {
    const { data, error } = await admin.from(table).insert(row).select('id').single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  const course = (scholar_id: string, tag: string, visibility: string) => ({
    scholar_id,
    title: `Courses RLS ${tag} ${run}`,
    slug: `courses-rls-${tag}-${run}`,
    level: 'graduate',
    visibility,
  });

  beforeAll(async () => {
    expect(url && anonKey && serviceKey, 'Supabase env must be set for integration tests').toBeTruthy();
    [a, b] = await Promise.all([createActor('a'), createActor('b')]);
    scholarA = await insertOne('scholars', {
      account_id: a.userId,
      slug: `courses-rls-a-${run}`,
      full_name: `Dr. Courses A ${run}`,
      profile_status: 'approved',
    });
    scholarB = await insertOne('scholars', {
      account_id: b.userId,
      slug: `courses-rls-b-${run}`,
      full_name: `Dr. Courses B ${run}`,
      profile_status: 'draft',
    });
    disciplineId = await insertOne('disciplines', {
      name: `Courses RLS Discipline ${run}`,
      slug: `courses-rls-discipline-${run}`,
      category: 'test',
    });
    publicA = await insertOne('courses', course(scholarA, 'pub', 'public'));
    privateA = await insertOne('courses', course(scholarA, 'priv', 'private'));
    unlistedA = await insertOne('courses', course(scholarA, 'unl', 'unlisted'));
    publicB = await insertOne('courses', course(scholarB, 'bpub', 'public'));
  }, 60_000);

  afterAll(async () => {
    for (const id of [scholarA, scholarB].filter(Boolean)) await admin.from('scholars').delete().eq('id', id);
    if (disciplineId) await admin.from('disciplines').delete().eq('id', disciplineId);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  }, 60_000);

  describe('reads', () => {
    it('a scholar lists exactly their own courses through the page query', async () => {
      const own = await fetchOwnCoursesOrThrow(a.client, scholarA);
      expect(own.map((c) => c.id).sort()).toEqual([publicA, privateA, unlistedA].sort());
      const ownB = await fetchOwnCoursesOrThrow(b.client, scholarB);
      expect(ownB.map((c) => c.id)).toEqual([publicB]);
    });

    it("scholar B cannot read A's private or unlisted courses, only A's public one (A is approved)", async () => {
      const { data, error } = await b.client.from('courses').select('id').eq('scholar_id', scholarA);
      expect(error).toBeNull();
      expect((data ?? []).map((r) => r.id)).toEqual([publicA]);
    });

    it('asking for A\'s scholar_id as B never returns private rows via the page query', async () => {
      const leaked = await fetchOwnCoursesOrThrow(b.client, scholarA);
      expect(leaked.map((c) => c.id)).toEqual([publicA]);
      expect(leaked.every((c) => c.visibility === 'public')).toBe(true);
    });

    it('anonymous visitors see only public courses of approved scholars', async () => {
      const anon = createClient(url, anonKey, noSession);
      const { data, error } = await anon
        .from('courses')
        .select('id, visibility')
        .in('id', [publicA, privateA, unlistedA, publicB]);
      expect(error).toBeNull();
      // B's course is public but B is a draft scholar; A's private and unlisted rows stay hidden.
      expect((data ?? []).map((r) => r.id)).toEqual([publicA]);
    });
  });

  describe('writes', () => {
    it("B cannot update A's course (0 rows) and cannot move it to themselves", async () => {
      const upd = await b.client.from('courses').update({ title: 'hijacked' }).eq('id', privateA).select('id');
      expect(upd.error).toBeNull();
      expect(upd.data).toEqual([]);
      const steal = await b.client.from('courses').update({ scholar_id: scholarB }).eq('id', publicA).select('id');
      expect(steal.data ?? []).toEqual([]);
      const { data } = await admin.from('courses').select('title, scholar_id').eq('id', privateA).single();
      expect(data).toMatchObject({ title: `Courses RLS priv ${run}`, scholar_id: scholarA });
    });

    it("B cannot delete A's course (0 rows)", async () => {
      const del = await b.client.from('courses').delete().eq('id', publicA).select('id');
      expect(del.error).toBeNull();
      expect(del.data).toEqual([]);
      const { data } = await admin.from('courses').select('id').eq('id', publicA);
      expect(data).toHaveLength(1);
    });

    it('B cannot insert a course owned by A', async () => {
      const ins = await b.client.from('courses').insert(course(scholarA, 'forged', 'public'));
      expect(ins.error).not.toBeNull();
      const { data } = await admin.from('courses').select('id').eq('slug', `courses-rls-forged-${run}`);
      expect(data).toEqual([]);
    });

    it("B cannot add course_disciplines to A's course", async () => {
      const ins = await b.client.from('course_disciplines').insert({ course_id: privateA, discipline_id: disciplineId });
      expect(ins.error).not.toBeNull();
      const { data } = await admin.from('course_disciplines').select('id').eq('course_id', privateA);
      expect(data).toEqual([]);
    });

    it('A creates, tags, publishes, unpublishes and deletes their own course', async () => {
      const created = await a.client
        .from('courses')
        .insert({ ...course(scholarA, 'life', 'private'), delivery_modes: ['online_async'], primary_discipline_id: disciplineId })
        .select('id')
        .single();
      expect(created.error).toBeNull();
      const id = (created.data as { id: string }).id;

      const tag = await a.client.from('course_disciplines').insert({ course_id: id, discipline_id: disciplineId });
      expect(tag.error).toBeNull();

      const anon = createClient(url, anonKey, noSession);
      expect((await anon.from('courses').select('id').eq('id', id)).data).toEqual([]);

      const publish = await a.client.from('courses').update({ visibility: 'public' }).eq('id', id).select('id');
      expect(publish.data).toHaveLength(1);
      expect((await anon.from('courses').select('id').eq('id', id)).data).toHaveLength(1);

      const hide = await a.client.from('courses').update({ visibility: 'private' }).eq('id', id).select('id');
      expect(hide.data).toHaveLength(1);
      expect((await anon.from('courses').select('id').eq('id', id)).data).toEqual([]);

      const del = await a.client.from('courses').delete().eq('id', id).select('id');
      expect(del.data).toHaveLength(1);
      // Tags go with the course.
      const { data: tags } = await admin.from('course_disciplines').select('id').eq('course_id', id);
      expect(tags).toEqual([]);
    });

    it('the scholar can see licensing agreements on their course (the delete guard reads them)', async () => {
      const institution = await insertOne('institutions', {
        name: `Courses RLS Seminary ${run}`,
        slug: `courses-rls-inst-${run}`,
        institution_type: 'seminary',
        status: 'approved',
        contact_email: `courses-rls-inst-${run}@test.faithfullscholars.dev`,
        location: 'Test City',
      });
      try {
        const agreement = await admin
          .from('course_licensing_agreements')
          .insert({
            course_id: unlistedA,
            scholar_id: scholarA,
            institution_id: institution,
            license_type: 'syllabus_only',
            term_duration: '1_semester',
          })
          .select('id')
          .single();
        if (agreement.error) throw agreement.error;

        const countA = await a.client
          .from('course_licensing_agreements')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', unlistedA);
        expect(countA.error).toBeNull();
        expect(countA.count).toBe(1);

        // B cannot see it, so B's own delete path could never be tricked by or leak it.
        const countB = await b.client
          .from('course_licensing_agreements')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', unlistedA);
        expect(countB.count).toBe(0);
      } finally {
        await admin.from('institutions').delete().eq('id', institution);
      }
    });
  });
});
