import { describe, it, expect, beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  getPublicScholars,
  getPublicScholarBySlug,
  getPublicCourses,
  getPublicCourseBySlug,
  getTaxonomies,
} from '@/lib/domain/queries';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('Public Discovery Integration Tests (Phase 2)', () => {
  beforeAll(async () => {
    // Sanity check database connection
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    const res = await client.query('SELECT count(*)::int as count FROM public.scholars');
    expect(res.rows[0].count).toBeGreaterThanOrEqual(2);
    await client.end();
  });

  describe('Taxonomies Loader', () => {
    it('loads disciplines, traditions, and confessional standards from database', async () => {
      const taxonomies = await getTaxonomies();
      expect(taxonomies.disciplines.length).toBeGreaterThanOrEqual(9);
      expect(taxonomies.traditions.length).toBeGreaterThanOrEqual(6);
      expect(taxonomies.confessionalStandards.length).toBeGreaterThanOrEqual(12);

      const hasWestminster = taxonomies.confessionalStandards.some(
        (c) => c.slug === 'westminster-confession'
      );
      expect(hasWestminster).toBe(true);

      const hasLondonBaptist = taxonomies.confessionalStandards.some(
        (c) => c.slug === '1689-london-baptist'
      );
      expect(hasLondonBaptist).toBe(true);
    });
  });

  describe('Public Scholars Query', () => {
    it('fetches approved scholars with associated disciplines, traditions, and confessions', async () => {
      const scholars = await getPublicScholars();
      expect(scholars.length).toBeGreaterThanOrEqual(2);

      const calvin = scholars.find((s) => s.slug === 'calvin-edwards');
      expect(calvin).toBeDefined();
      expect(calvin?.full_name).toBe('Dr. Calvin Edwards');
      expect(calvin?.disciplines.length).toBeGreaterThan(0);
      expect(calvin?.traditions.length).toBeGreaterThan(0);
      expect(calvin?.confessions.length).toBeGreaterThan(0);
      expect(calvin?.is_available_for_hire).toBe(true);

      const sarah = scholars.find((s) => s.slug === 'sarah-macarthur');
      expect(sarah).toBeDefined();
      expect(sarah?.full_name).toBe('Dr. Sarah MacArthur');
    });

    it('filters scholars by keyword search', async () => {
      const results = await getPublicScholars({ search: 'Calvin' });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((s) => s.slug === 'calvin-edwards')).toBe(true);
    });

    it('filters scholars by discipline slug', async () => {
      const results = await getPublicScholars({ discipline: 'church-history' });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((s) => s.slug === 'calvin-edwards')).toBe(true);

      const ntResults = await getPublicScholars({ discipline: 'new-testament' });
      expect(ntResults.length).toBeGreaterThanOrEqual(1);
      expect(ntResults.some((s) => s.slug === 'sarah-macarthur')).toBe(true);
    });

    it('filters scholars by confessional standard slug', async () => {
      const results = await getPublicScholars({ confession: 'westminster-confession' });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((s) => s.slug === 'calvin-edwards')).toBe(true);
    });

    it('filters scholars by availability for hire', async () => {
      const results = await getPublicScholars({ availableForHire: true });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((s) => s.is_available_for_hire)).toBe(true);
    });
  });

  describe('Public Scholar By Slug Query (Academic Portfolio)', () => {
    it('retrieves full academic portfolio for approved scholar (Calvin Edwards)', async () => {
      const scholar = await getPublicScholarBySlug('calvin-edwards');
      expect(scholar).not.toBeNull();
      expect(scholar?.full_name).toBe('Dr. Calvin Edwards');
      expect(scholar?.credentials.length).toBeGreaterThanOrEqual(2);
      expect(scholar?.publications.length).toBeGreaterThanOrEqual(1);
      expect(scholar?.courses.length).toBeGreaterThanOrEqual(1);
      expect(scholar?.doctrinal_statement_text).toBeDefined();
      expect(scholar?.confessions.length).toBeGreaterThanOrEqual(1);
      expect(scholar?.availability).not.toBeNull();
      expect(scholar?.availability?.is_available_for_hire).toBe(true);
    });

    it('returns null for non-existent scholar slug', async () => {
      const scholar = await getPublicScholarBySlug('non-existent-scholar-slug');
      expect(scholar).toBeNull();
    });

    it('enforces draft isolation: unapproved or draft scholars return null to public queries', async () => {
      const client = new Client({ connectionString: dbUrl });
      await client.connect();

      // Use a dedicated isolated test account
      const testAccountId = 'a0000000-0000-0000-0000-000000000099';
      await client.query(`
        INSERT INTO auth.users (id, instance_id, aud, role, email) 
        VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'draft-test-isolated@faithfullscholars.org')
        ON CONFLICT (id) DO NOTHING;
      `, [testAccountId]);
      await client.query(`
        INSERT INTO public.accounts (id, email, role) 
        VALUES ($1, 'draft-test-isolated@faithfullscholars.org', 'scholar')
        ON CONFLICT (id) DO NOTHING;
      `, [testAccountId]);
      const accountId = testAccountId;

      // Temporarily insert a draft scholar to verify public loader ignores it
      const insertRes = await client.query(`
        INSERT INTO public.scholars (
          account_id, slug, full_name, profile_status, verification_status
        ) VALUES (
          $1, 'draft-test-scholar', 'Dr. Draft Isolated', 'draft', 'unverified'
        ) RETURNING id;
      `, [accountId]);
      const draftId = insertRes.rows[0].id;

      try {
        // Query public loader: must return null for this slug
        const publicScholar = await getPublicScholarBySlug('draft-test-scholar');
        expect(publicScholar).toBeNull();

        // Query public list: must NOT include this draft scholar
        const publicList = await getPublicScholars({ search: 'Draft Isolated' });
        expect(publicList).toHaveLength(0);
      } finally {
        // Clean up draft scholar
        await client.query('DELETE FROM public.scholars WHERE id = $1', [draftId]);
        await client.query('DELETE FROM public.accounts WHERE id = $1', [testAccountId]);
        await client.query('DELETE FROM auth.users WHERE id = $1', [testAccountId]);
        await client.end();
      }
    });
  });

  describe('Public Courses Showcase Queries', () => {
    it('fetches public courses with instructor information and discipline data', async () => {
      const courses = await getPublicCourses();
      expect(courses.length).toBeGreaterThanOrEqual(2);

      const histCourse = courses.find(
        (c) => c.slug === 'hist-theo-2-reformation'
      );
      expect(histCourse).toBeDefined();
      expect(histCourse?.scholar.full_name).toBe('Dr. Calvin Edwards');
      expect(histCourse?.discipline).not.toBeNull();
      expect(histCourse?.visibility).toBe('public');
    });

    it('filters courses by discipline', async () => {
      const courses = await getPublicCourses({ discipline: 'church-history' });
      expect(courses.length).toBeGreaterThanOrEqual(1);
      expect(courses.every((c) => c.discipline?.slug === 'church-history')).toBe(true);
    });

    it('retrieves single public course by slug', async () => {
      const course = await getPublicCourseBySlug('hist-theo-2-reformation');
      expect(course).not.toBeNull();
      expect(course?.title).toBe('Historical Theology II: The Reformation & Early Modern Era');
      expect(course?.scholar.full_name).toBe('Dr. Calvin Edwards');
    });

    it('returns null for non-existent course slug', async () => {
      const course = await getPublicCourseBySlug('non-existent-course-slug');
      expect(course).toBeNull();
    });

    it('enforces course draft isolation: private/draft courses are excluded from public catalog', async () => {
      const client = new Client({ connectionString: dbUrl });
      await client.connect();

      // Get an existing scholar id
      const sRes = await client.query("SELECT id FROM public.scholars WHERE slug = 'calvin-edwards'");
      const scholarId = sRes.rows[0].id;

      // Insert a private course
      const insertRes = await client.query(`
        INSERT INTO public.courses (
          scholar_id, title, slug, level, visibility, delivery_modes
        ) VALUES (
          $1, 'Secret Private Unpublished Seminar', 'private-secret-seminar', 'graduate', 'private', '{"online_async"}'
        ) RETURNING id;
      `, [scholarId]);
      const courseId = insertRes.rows[0].id;

      try {
        const publicCourse = await getPublicCourseBySlug('private-secret-seminar');
        expect(publicCourse).toBeNull();

        const catalog = await getPublicCourses({ search: 'Secret Private' });
        expect(catalog).toHaveLength(0);
      } finally {
        await client.query('DELETE FROM public.courses WHERE id = $1', [courseId]);
        await client.end();
      }
    });
  });
});
