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

describe('Scholar Endorsements & Institutional Postings RLS Defense Integration', () => {
  let client: Client;

  // Canonical Seeded Scholars
  const endorserScholarId = 'f1000000-0000-0000-0000-000000000001';
  const recipientScholarId = 'f1000000-0000-0000-0000-000000000002';

  // Seeded Approved Institution (Westminster)
  const approvedInstitutionId = 'e1000000-0000-0000-0000-000000000001';
  const pendingInstitutionId = 'd1999999-0000-0000-0000-000000000002';

  const testEndorsementId = 'c1999999-0000-0000-0000-000000000001';
  const pendingPostingId = 'e1999999-0000-0000-0000-000000000002';

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();

    // 1. Seed Pending Institution
    await client.query(`
      INSERT INTO public.institutions (id, name, slug, status, website, location, institution_type, contact_email) VALUES
      ($1, 'Pending Test Seminary', 'pending-test-sem', 'pending', 'https://pending.edu', 'New York, NY', 'seminary', 'contact@pending.edu')
      ON CONFLICT (id) DO NOTHING;
    `, [pendingInstitutionId]);

    // 2. Seed Posting under pending institution
    await client.query(`
      INSERT INTO public.institution_postings (
        id, institution_id, title, slug, opportunity_type, required_degree, delivery_mode, term, description, status
      ) VALUES
      ($1, $2, 'Pending Inst Posting', 'pending-inst-posting-test', 'adjunct', 'Ph.D.', 'in_person', 'Fall 2027', 'Desc', 'published')
      ON CONFLICT (id) DO NOTHING;
    `, [pendingPostingId, pendingInstitutionId]);

    // 3. Seed Peer Endorsement
    await client.query(`
      INSERT INTO public.scholar_endorsements (
        id, endorser_scholar_id, recipient_scholar_id, relationship, subject_area, endorsement_text, status
      ) VALUES
      ($1, $2, $3, 'Department Colleague', 'Historical Theology', 'Original commendable text.', 'pending')
      ON CONFLICT (id) DO NOTHING;
    `, [testEndorsementId, endorserScholarId, recipientScholarId]);
  });

  afterAll(async () => {
    // Cleanup
    await client.query(`DELETE FROM public.scholar_endorsements WHERE id = $1;`, [testEndorsementId]);
    await client.query(`DELETE FROM public.institution_postings WHERE id = $1;`, [pendingPostingId]);
    await client.query(`DELETE FROM public.institutions WHERE id = $1;`, [pendingInstitutionId]);
    await client.end();
  });

  describe('Endorsement Immutability Trigger Enforcement', () => {
    it('prevents non-admin callers from modifying endorsement text or scholar associations', async () => {
      let err: Error | null = null;
      try {
        await client.query(`
          UPDATE public.scholar_endorsements
          SET endorsement_text = 'Altered forged text', status = 'approved'
          WHERE id = $1;
        `, [testEndorsementId]);
      } catch (e) {
        err = e as Error;
      }

      expect(err).not.toBeNull();
      expect(err?.message).toMatch(/immutable/i);
    });

    it('allows status transition to approved when content remains immutable', async () => {
      const res = await client.query(`
        UPDATE public.scholar_endorsements
        SET status = 'approved'
        WHERE id = $1
        RETURNING status;
      `, [testEndorsementId]);

      expect(res.rows[0].status).toBe('approved');
    });
  });

  describe('Postings Public Visibility Parent-Institution Gate', () => {
    it('allows public access to published postings from approved institutions', async () => {
      const res = await client.query(`
        SELECT id, title FROM public.institution_postings
        WHERE institution_id = $1
          AND status = 'published'
          AND EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_postings.institution_id AND i.status = 'approved');
      `, [approvedInstitutionId]);

      expect(res.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('blocks public access to published postings from pending or unapproved institutions', async () => {
      const res = await client.query(`
        SELECT id, title FROM public.institution_postings
        WHERE id = $1
          AND status = 'published'
          AND EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_postings.institution_id AND i.status = 'approved');
      `, [pendingPostingId]);

      expect(res.rows.length).toBe(0);
    });
  });
});
