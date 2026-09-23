import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { computeRevisionDiff } from '@/lib/domain/diff';

describe('Track C: Admin Moderation, Visual Diffing & Error Triage Simulation', () => {
  let db: Client;
  const scholarId = 'f1000000-0000-0000-0000-000000000006'; // Dr. Jonathan Edwards-Owen
  const testAdminId = 'a1000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    db = new Client({
      connectionString:
        process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:49322/postgres',
    });
    await db.connect();
    // Clean up prior simulation runs
    await db.query("DELETE FROM public.profile_reviews WHERE feedback_notes LIKE '%Simulation%'");
    await db.query("DELETE FROM public.scholar_profile_revisions WHERE revision_number > 1 AND scholar_id = $1", [scholarId]);
    await db.query("DELETE FROM public.pilot_feedback WHERE user_email = 'simulation.user@test.org'");
  });

  afterAll(async () => {
    // Cleanup temporary test revisions and feedback
    await db.query("DELETE FROM public.profile_reviews WHERE feedback_notes LIKE '%Simulation%'");
    await db.query("DELETE FROM public.scholar_profile_revisions WHERE revision_number > 1 AND scholar_id = $1", [scholarId]);
    await db.query("UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000006' WHERE id = $1", [scholarId]);
    await db.query("DELETE FROM public.pilot_feedback WHERE user_email = 'simulation.user@test.org'");
    await db.end();
  });

  it('computes structured visual diffs between active baseline snapshot and submitted revision', () => {
    const baselineSnapshot = {
      full_name: 'Dr. Jonathan Edwards-Owen',
      title: 'Professor of Historical Theology & Puritan Studies',
      biography: 'Specialist in Post-Reformation Reformed dogmatics and Puritan theology.',
      current_institution: 'Westminster Theological Seminary',
    };

    const submittedSnapshot = {
      full_name: 'Dr. Jonathan Edwards-Owen',
      title: 'Distinguished Professor of Historical Theology & Puritan Studies',
      biography: 'Specialist in Post-Reformation Reformed dogmatics, English Puritan covenant theology, and Jonathan Edwards pneumatology.',
      current_institution: 'Westminster Theological Seminary',
    };

    const diff = computeRevisionDiff(baselineSnapshot, submittedSnapshot);
    expect(diff).toBeDefined();
    expect(diff.hasChanges).toBe(true);
    expect(diff.totalChanges).toBe(2);
    
    const changedFields = diff.changes.map((c) => c.field);
    expect(changedFields).toContain('title');
    expect(changedFields).toContain('biography');
    expect(changedFields).not.toContain('full_name');
  });

  it('atomically approves submitted revision and promotes snapshot to live scholar profile', async () => {
    // Determine next revision number
    const maxRevRes = await db.query(
      'SELECT COALESCE(MAX(revision_number), 0) + 1 as next_rev FROM public.scholar_profile_revisions WHERE scholar_id = $1',
      [scholarId]
    );
    const nextRevNumber = parseInt(maxRevRes.rows[0].next_rev, 10);

    // 1. Create a submitted draft revision
    const newRevRes = await db.query(`
      INSERT INTO public.scholar_profile_revisions (
        id, scholar_id, revision_number, status, snapshot_data, admin_notes, submitted_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'submitted',
        '{"title": "Distinguished Professor of Historical Theology & Puritan Studies", "availability_status": "open"}'::jsonb,
        'Test automated diff review', now()
      ) RETURNING id;
    `, [scholarId, nextRevNumber]);

    const revisionId = newRevRes.rows[0].id;

    // 2. Simulate Admin Approval transaction
    await db.query('BEGIN;');
    await db.query(`
      UPDATE public.scholar_profile_revisions
      SET status = 'approved', reviewed_at = now()
      WHERE id = $1;
    `, [revisionId]);

    await db.query(`
      UPDATE public.scholars
      SET published_revision_id = $1, title = 'Distinguished Professor of Historical Theology & Puritan Studies'
      WHERE id = $2;
    `, [revisionId, scholarId]);

    await db.query(`
      INSERT INTO public.profile_reviews (id, scholar_id, revision_id, reviewer_account_id, action, feedback_notes)
      VALUES (gen_random_uuid(), $1, $2, $3, 'approve', 'Promoted title to Distinguished Professor (Simulation)');
    `, [scholarId, revisionId, testAdminId]);
    await db.query('COMMIT;');

    // 3. Verify promotion
    const scholarCheck = await db.query(
      'SELECT published_revision_id, title FROM public.scholars WHERE id = $1',
      [scholarId]
    );
    expect(scholarCheck.rows[0].published_revision_id).toBe(revisionId);
    expect(scholarCheck.rows[0].title).toBe('Distinguished Professor of Historical Theology & Puritan Studies');
  });

  it('records pilot feedback and simulates administrative triage resolution', async () => {
    // 1. Ingest pilot error report
    const feedbackRes = await db.query(`
      INSERT INTO public.pilot_feedback (
        id, session_id, fingerprint, route, category, error_message, note, user_email, user_role, metadata, processed, action
      ) VALUES (
        gen_random_uuid(), gen_random_uuid(), 'fp_simulation_001', '/dashboard/courses', 'BUG',
        'Syllabus PDF upload showed network timeout warning on 25MB file.',
        'Please increase upload size ceiling.', 'simulation.user@test.org', 'scholar',
        '{"browser": "Chrome 128", "os": "macOS", "file_size_bytes": 26214400}'::jsonb,
        false, NULL
      ) RETURNING id;
    `, []);

    const feedbackId = feedbackRes.rows[0].id;

    // 2. Query open triage items
    const openItems = await db.query(
      'SELECT id, error_message, processed, action FROM public.pilot_feedback WHERE id = $1',
      [feedbackId]
    );
    expect(openItems.rows.length).toBe(1);
    expect(openItems.rows[0].action).toBeNull();
    expect(openItems.rows[0].processed).toBe(false);

    // 3. Admin triages and resolves the issue
    await db.query(`
      UPDATE public.pilot_feedback
      SET processed = true,
          action = 'FIXED_IN_CODE',
          metadata = metadata || '{"resolved_by": "admin", "resolution_notes": "Increased maximum upload size limit to 50MB."}'::jsonb
      WHERE id = $1;
    `, [feedbackId]);

    const resolvedCheck = await db.query(
      'SELECT processed, action, metadata FROM public.pilot_feedback WHERE id = $1',
      [feedbackId]
    );
    expect(resolvedCheck.rows[0].processed).toBe(true);
    expect(resolvedCheck.rows[0].action).toBe('FIXED_IN_CODE');
    expect(resolvedCheck.rows[0].metadata.resolution_notes).toContain('50MB');
  });
});
