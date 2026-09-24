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

describe('Distinguished Scholar Dossiers & Media Showcase Integration (ADR 0014)', () => {
  let adminClient: Client;
  let anonClient: Client;
  let scholarClient: Client;

  // Pilot Scholar 1 (Dr. Calvin Edwards)
  const scholar1Id = 'f1000000-0000-0000-0000-000000000001';
  const scholar1AccountId = 'a1000000-0000-0000-0000-000000000002'; // role: 'scholar'

  // Scholar 2 (Dr. Sarah MacArthur)
  const scholar2AccountId = 'a1000000-0000-0000-0000-000000000003'; // role: 'scholar'

  const testMediaId = 'c1000000-0000-0000-0000-000000000099';

  beforeAll(async () => {
    adminClient = new Client({ connectionString: dbUrl });
    await adminClient.connect();

    // Ensure test media item is cleaned up and scholar 1 tier is standard
    await adminClient.query(`DELETE FROM public.media_links WHERE id = $1;`, [testMediaId]);
    await adminClient.query(`UPDATE public.scholars SET profile_tier = 'standard' WHERE id = $1;`, [scholar1Id]);

    // Create anon client
    anonClient = new Client({ connectionString: dbUrl });
    await anonClient.connect();
    await anonClient.query('SET ROLE anon;');

    // Create scholar client pretending to be scholar 1
    scholarClient = new Client({ connectionString: dbUrl });
    await scholarClient.connect();
    await scholarClient.query('SET ROLE authenticated;');
    await scholarClient.query(
      `SELECT set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, false);`,
      [scholar1AccountId]
    );
  });

  afterAll(async () => {
    await adminClient.query(`DELETE FROM public.media_links WHERE id = $1;`, [testMediaId]);
    await anonClient.end();
    await scholarClient.end();
    await adminClient.end();
  });

  describe('Anti-Privilege Escalation Trigger (ADR 0014 Condition 2)', () => {
    it('prevents authenticated scholar from self-elevating profile_tier to distinguished_fellow', async () => {
      let threw = false;
      try {
        await scholarClient.query(`
          UPDATE public.scholars
          SET profile_tier = 'distinguished_fellow'
          WHERE id = $1;
        `, [scholar1Id]);
      } catch (err: unknown) {
        threw = true;
        expect((err as Error).message).toContain('Unauthorized: only platform administrators');
      }
      expect(threw).toBe(true);
    });

    it('prevents authenticated scholar from inserting new scholar with profile_tier = distinguished_fellow', async () => {
      let threw = false;
      try {
        await scholarClient.query(`
          INSERT INTO public.scholars (
            account_id, slug, full_name, profile_tier
          ) VALUES (
            $1, 'rogue-scholar', 'Dr. Rogue', 'distinguished_fellow'
          );
        `, [scholar1AccountId]);
      } catch (err: unknown) {
        threw = true;
        expect((err as Error).message).toContain('Unauthorized: only platform administrators');
      }
      expect(threw).toBe(true);
    });

    it('allows admin / platform superuser to set distinguished_fellow status', async () => {
      const res = await adminClient.query(`
        UPDATE public.scholars
        SET profile_tier = 'distinguished_fellow',
            orcid_id = '0000-0002-1825-0097',
            google_scholar_url = 'https://scholar.google.com/citations?user=calvin-edwards'
        WHERE id = $1
        RETURNING profile_tier, orcid_id, google_scholar_url;
      `, [scholar1Id]);

      expect(res.rows[0].profile_tier).toBe('distinguished_fellow');
      expect(res.rows[0].orcid_id).toBe('0000-0002-1825-0097');
      expect(res.rows[0].google_scholar_url).toContain('scholar.google.com');
    });
  });

  describe('Media Links RLS & Ownership Isolation', () => {
    it('allows scholar to insert media links for their own profile', async () => {
      const res = await scholarClient.query(`
        INSERT INTO public.media_links (
          id, scholar_id, title, media_type, url, description, is_featured, duration_seconds
        ) VALUES (
          $1, $2, 'Covenant Theology Lecture', 'youtube_video',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'Keynote lecture on the pactum salutis.', true, 3600
        ) RETURNING id, title, is_featured, duration_seconds;
      `, [testMediaId, scholar1Id]);

      expect(res.rows[0].id).toBe(testMediaId);
      expect(res.rows[0].title).toBe('Covenant Theology Lecture');
      expect(res.rows[0].is_featured).toBe(true);
      expect(res.rows[0].duration_seconds).toBe(3600);
    });

    it('allows public anonymous users to view media links for approved published scholars', async () => {
      const res = await anonClient.query(`
        SELECT id, title, url, is_featured
        FROM public.media_links
        WHERE id = $1;
      `, [testMediaId]);

      expect(res.rows.length).toBe(1);
      expect(res.rows[0].title).toBe('Covenant Theology Lecture');
    });

    it('prevents scholar from modifying another scholar media links', async () => {
      // Create a scholar 2 client
      const otherScholarClient = new Client({ connectionString: dbUrl });
      await otherScholarClient.connect();
      await otherScholarClient.query('SET ROLE authenticated;');
      await otherScholarClient.query(
        `SELECT set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, false);`,
        [scholar2AccountId]
      );

      // Attempt to delete scholar 1's media link
      const deleteRes = await otherScholarClient.query(`
        DELETE FROM public.media_links WHERE id = $1;
      `, [testMediaId]);

      expect(deleteRes.rowCount).toBe(0);

      // Verify the link is still intact
      const checkRes = await adminClient.query(`SELECT id FROM public.media_links WHERE id = $1;`, [testMediaId]);
      expect(checkRes.rows.length).toBe(1);

      await otherScholarClient.end();
    });

    it('allows scholar to delete their own media link', async () => {
      const deleteRes = await scholarClient.query(`
        DELETE FROM public.media_links WHERE id = $1;
      `, [testMediaId]);

      expect(deleteRes.rowCount).toBe(1);
    });
  });
});
