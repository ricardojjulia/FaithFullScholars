import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('Phase 1 Domain Foundation & RLS Integration Tests', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('1. seeds and queries historic theological taxonomy (disciplines, traditions, confessions)', async () => {
    const discRes = await client.query('SELECT count(*)::int as count FROM public.disciplines');
    expect(discRes.rows[0].count).toBeGreaterThanOrEqual(9);

    const tradRes = await client.query('SELECT count(*)::int as count FROM public.traditions');
    expect(tradRes.rows[0].count).toBeGreaterThanOrEqual(6);

    const confRes = await client.query('SELECT count(*)::int as count FROM public.confessional_standards');
    expect(confRes.rows[0].count).toBeGreaterThanOrEqual(12);

    // Verify historic standards include Westminster and 1689 London Baptist
    const westminster = await client.query(
      "SELECT name, year, tradition_affinity FROM public.confessional_standards WHERE slug = 'westminster-confession'"
    );
    expect(westminster.rows[0].name).toBe('Westminster Confession of Faith');
    expect(westminster.rows[0].year).toBe(1646);

    const londonBaptist = await client.query(
      "SELECT name, year, tradition_affinity FROM public.confessional_standards WHERE slug = '1689-london-baptist'"
    );
    expect(londonBaptist.rows[0].name).toBe('Second London Baptist Confession (1689)');
    expect(londonBaptist.rows[0].year).toBe(1689);
  });

  it('2. verifies approved scholars and published revision pointers (ADR 0005)', async () => {
    const scholarRes = await client.query(`
      SELECT s.id, s.slug, s.full_name, s.profile_status, s.published_revision_id, r.status as revision_status
      FROM public.scholars s
      LEFT JOIN public.scholar_profile_revisions r ON r.id = s.published_revision_id
      WHERE s.profile_status = 'approved'
    `);

    expect(scholarRes.rows.length).toBeGreaterThanOrEqual(2);
    for (const row of scholarRes.rows) {
      expect(row.profile_status).toBe('approved');
      expect(row.published_revision_id).not.toBeNull();
      expect(row.revision_status).toBe('approved');
    }
  });

  it('3. verifies scholar credentials, publications, and availability profiles', async () => {
    // Check credentials exist for sample scholars
    const credRes = await client.query('SELECT count(*)::int as count FROM public.credentials');
    expect(credRes.rows[0].count).toBeGreaterThanOrEqual(4);

    // Check publications exist
    const pubRes = await client.query('SELECT count(*)::int as count FROM public.publications');
    expect(pubRes.rows[0].count).toBeGreaterThanOrEqual(2);

    // Check availability profiles
    const availRes = await client.query('SELECT count(*)::int as count FROM public.availability_profiles WHERE is_available_for_hire = true');
    expect(availRes.rows[0].count).toBeGreaterThanOrEqual(2);
  });

  it('4. verifies course showcase with delivery modes and disciplines', async () => {
    const courseRes = await client.query(`
      SELECT c.title, c.slug, c.level, c.visibility, d.name as discipline_name
      FROM public.courses c
      JOIN public.disciplines d ON d.id = c.primary_discipline_id
      WHERE c.visibility = 'public'
    `);

    expect(courseRes.rows.length).toBeGreaterThanOrEqual(2);
    expect(courseRes.rows[0].level).toBe('graduate');
  });

  it('5. verifies strict RLS enforcement on all 24 public tables', async () => {
    const rlsRes = await client.query(`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r'
        AND c.relname NOT LIKE 'pg_%'
        AND c.relname NOT IN ('schema_migrations', '_prisma_migrations')
    `);

    expect(rlsRes.rows.length).toBe(24);
    for (const table of rlsRes.rows) {
      expect(table.relrowsecurity).toBe(true);
    }
  });
});
