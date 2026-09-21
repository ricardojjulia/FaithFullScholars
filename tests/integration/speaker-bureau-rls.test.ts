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

describe('Theological Speaking Bureau RLS Policy & Data-Isolation Integration', () => {
  let adminClient: Client;
  let anonClient: Client;

  // Scholar 4 (Dr. Marcus Vance) has conference_speaking in availability_profiles
  const speakerScholarId = 'f1000000-0000-0000-0000-000000000004';
  // Scholar 5 (Dr. Elizabeth Montgomery-Knox) does NOT have conference_speaking or guest_lecturing
  const nonSpeakerScholarId = 'f1000000-0000-0000-0000-000000000005';

  const visibleTopicId = 'b1000000-0000-0000-0000-000000000001';
  const hiddenTopicId = 'b1000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    adminClient = new Client({ connectionString: dbUrl });
    await adminClient.connect();

    // 1. Insert speaking topic for scholar with active speaking availability
    await adminClient.query(`
      INSERT INTO public.speaker_topics (
        id, scholar_id, title, description, target_audience, display_order, is_featured
      ) VALUES
      ($1, $2, 'Presuppositional Apologetics & Cultural Engagement', 'An in-depth keynote address.', 'academic', 1, true)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
    `, [visibleTopicId, speakerScholarId]);

    // 2. Insert speaking topic for scholar WITHOUT speaking availability
    await adminClient.query(`
      INSERT INTO public.speaker_topics (
        id, scholar_id, title, description, target_audience, display_order, is_featured
      ) VALUES
      ($1, $2, 'Christian Bioethics & Terminal Illness', 'A private seminar topic.', 'academic', 1, false)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
    `, [hiddenTopicId, nonSpeakerScholarId]);

    anonClient = new Client({ connectionString: dbUrl });
    await anonClient.connect();
    await anonClient.query('SET ROLE anon;');
  });

  afterAll(async () => {
    await adminClient.query(`DELETE FROM public.speaker_topics WHERE id IN ($1, $2);`, [visibleTopicId, hiddenTopicId]);
    await anonClient.end();
    await adminClient.end();
  });

  describe('Public Discovery & RLS Enforcement', () => {
    it('allows public anonymous read of speaking topics for approved scholars with speaking availability', async () => {
      const res = await anonClient.query(
        `SELECT id, title, target_audience FROM public.speaker_topics WHERE id = $1;`,
        [visibleTopicId]
      );
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].title).toBe('Presuppositional Apologetics & Cultural Engagement');
      expect(res.rows[0].target_audience).toBe('academic');
    });

    it('blocks public anonymous read of speaking topics when scholar has not enabled speaking availability', async () => {
      const res = await anonClient.query(
        `SELECT id, title FROM public.speaker_topics WHERE id = $1;`,
        [hiddenTopicId]
      );
      expect(res.rows.length).toBe(0);
    });

    it('blocks anonymous users from inserting speaking topics (RLS violation)', async () => {
      await expect(
        anonClient.query(`
          INSERT INTO public.speaker_topics (
            scholar_id, title, description, target_audience
          ) VALUES
          ($1, 'Unauthorized Lecture', 'Should fail due to RLS violation', 'academic');
        `, [speakerScholarId])
      ).rejects.toThrow();
    });

    it('blocks anonymous users from updating speaking topics (RLS violation)', async () => {
      const res = await anonClient.query(
        `UPDATE public.speaker_topics SET title = 'Hacked Lecture' WHERE id = $1 RETURNING id;`,
        [visibleTopicId]
      );
      expect(res.rowCount).toBe(0);

      // Verify original title remained intact
      const verify = await adminClient.query(
        `SELECT title FROM public.speaker_topics WHERE id = $1;`,
        [visibleTopicId]
      );
      expect(verify.rows[0].title).toBe('Presuppositional Apologetics & Cultural Engagement');
    });

    it('blocks anonymous users from deleting speaking topics (RLS violation)', async () => {
      const res = await anonClient.query(
        `DELETE FROM public.speaker_topics WHERE id = $1 RETURNING id;`,
        [visibleTopicId]
      );
      expect(res.rowCount).toBe(0);

      // Verify row still exists
      const verify = await adminClient.query(
        `SELECT count(*) FROM public.speaker_topics WHERE id = $1;`,
        [visibleTopicId]
      );
      expect(parseInt(verify.rows[0].count, 10)).toBe(1);
    });
  });
});
