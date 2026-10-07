import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  fetchPendingRevisions,
  fetchRevisionWithBaseline,
  fetchReviewAuditHistory,
  fetchPendingInstitutions,
  fetchContentReports,
} from '@/lib/admin/queries';
import {
  processRevisionReview,
  processInstitutionVerification,
  processContentReport,
} from '@/lib/admin/actions';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('Admin Review & Trust Governance Integration (Phase 4, ADR 0003 & ADR 0005)', () => {
  let client: Client;
  const testScholarId = 'f1999999-0000-0000-0000-000000000099';
  const testAccountId = 'a1999999-0000-0000-0000-000000000099';
  const testBaselineRevId = '01999999-0000-0000-0000-000000000001';
  const testAdminAccountId = 'a1000000-0000-0000-0000-000000000001';
  let testRevisionId: string;
  let testInstitutionId: string;
  let testReportId: string;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();

    // 1. Create dedicated isolated auth user and account
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'review.test.scholar@faithfullscholars.org', '', now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
      )
      ON CONFLICT (id) DO NOTHING
    `, [testAccountId]);

    await client.query(`
      INSERT INTO public.accounts (id, email, role)
      VALUES ($1, 'review.test.scholar@faithfullscholars.org', 'scholar')
      ON CONFLICT (id) DO NOTHING
    `, [testAccountId]);

    await client.query(`
      INSERT INTO public.scholars (
        id, account_id, slug, full_name, title, current_institution, profile_status, verification_status
      ) VALUES (
        $1, $2, 'admin-review-test-scholar', 'Dr. Review Test Scholar',
        'Associate Professor', 'Puritan Seminary', 'draft', 'verified'
      )
      ON CONFLICT (id) DO NOTHING
    `, [testScholarId, testAccountId]);

    // 2. Insert baseline published revision
    await client.query(`
      INSERT INTO public.scholar_profile_revisions (
        id, scholar_id, revision_number, status, snapshot_data, submitted_at, reviewed_at
      ) VALUES (
        $1, $2, 1, 'approved',
        '{"full_name": "Dr. Review Test Scholar", "title": "Associate Professor", "biography": "Specialist in historical theology."}'::jsonb,
        now() - interval '30 days',
        now() - interval '29 days'
      )
      ON CONFLICT (id) DO UPDATE SET status = 'approved', snapshot_data = EXCLUDED.snapshot_data
    `, [testBaselineRevId, testScholarId]);

    await client.query(`
      UPDATE public.scholars
        SET published_revision_id = $1,
            profile_status = 'approved'
        WHERE id = $2
    `, [testBaselineRevId, testScholarId]);

    // 3. Insert a staged draft revision to test review workflows
    const revRes = await client.query(`
      INSERT INTO public.scholar_profile_revisions (
        scholar_id, revision_number, status, snapshot_data, submitted_at
      ) VALUES (
        $1, 2, 'submitted',
        $2::jsonb,
        now()
      )
      ON CONFLICT (scholar_id, revision_number)
      DO UPDATE SET status = 'submitted', snapshot_data = EXCLUDED.snapshot_data
      RETURNING id
    `, [
      testScholarId,
      JSON.stringify({
        full_name: 'Dr. Review Test Scholar, Ph.D.',
        title: 'Distinguished Professor of Historical Theology',
        current_institution: 'Puritan Reformed Theological Seminary',
        biography: 'Specialist in 17th-century covenant theology and Post-Reformation scholasticism.',
        location: 'Grand Rapids, MI',
        timezone: 'America/Detroit',
        doctrinal_statement_text: 'I heartily subscribe to the Westminster Confession of Faith.',
        disciplines: ['church-history', 'systematic-theology'],
        traditions: ['reformed-presbyterian'],
        credentials: [
          {
            degree: 'Ph.D.',
            field_of_study: 'Historical Theology',
            institution_name: 'University of Edinburgh',
            year_awarded: 2005,
            is_terminal: true,
          }
        ],
        publications: [
          {
            title: 'Federal Theology in the Seventeenth Century',
            publication_type: 'book',
            year: 2018,
          }
        ]
      })
    ]);
    testRevisionId = revRes.rows[0].id;

    // 4. Insert a test institution with status 'pending'
    const instRes = await client.query(`
      INSERT INTO public.institutions (
        name, slug, website, institution_type, status, contact_email, location
      ) VALUES (
        'Reformed Covenant Seminary',
        'reformed-covenant-seminary-test',
        'https://reformedcovenant.edu',
        'seminary',
        'pending',
        'dean@reformedcovenant.edu',
        'Charlotte, NC'
      )
      ON CONFLICT (slug) DO UPDATE SET status = 'pending'
      RETURNING id
    `);
    testInstitutionId = instRes.rows[0].id;

    // 5. Insert a test content report
    const repRes = await client.query(`
      INSERT INTO public.reports (
        target_type, target_id, reason, status
      ) VALUES (
        'scholar_profile',
        $1,
        'Suspected inaccurate graduation year on credential.',
        'pending'
      )
      RETURNING id
    `, [testScholarId]);
    testReportId = repRes.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test artifacts
    await client.query('DELETE FROM public.profile_reviews WHERE scholar_id = $1', [testScholarId]);
    await client.query('UPDATE public.scholars SET published_revision_id = NULL WHERE id = $1', [testScholarId]);
    await client.query('DELETE FROM public.scholar_profile_revisions WHERE scholar_id = $1', [testScholarId]);
    await client.query('DELETE FROM public.scholars WHERE id = $1', [testScholarId]);
    await client.query('DELETE FROM public.accounts WHERE id = $1', [testAccountId]);
    await client.query('DELETE FROM auth.users WHERE id = $1', [testAccountId]);
    await client.query('DELETE FROM public.institutions WHERE id = $1', [testInstitutionId]);
    await client.query('DELETE FROM public.reports WHERE id = $1', [testReportId]);
    await client.end();
  });

  it('1. lists pending revisions in the review queue', async () => {
    const revisions = await fetchPendingRevisions('submitted');
    expect(revisions.length).toBeGreaterThanOrEqual(1);

    const targetRev = revisions.find((r) => r.id === testRevisionId);
    expect(targetRev).toBeDefined();
    expect(targetRev?.scholar_name).toContain('Review Test Scholar');
    expect(targetRev?.status).toBe('submitted');
    expect(targetRev?.has_published_baseline).toBe(true);
  });

  it('2. loads submitted revision with published baseline and calculates diff', async () => {
    const detail = await fetchRevisionWithBaseline(testRevisionId);
    expect(detail).not.toBeNull();
    expect(detail?.revision.id).toBe(testRevisionId);
    expect(detail?.scholar.id).toBe(testScholarId);
    expect(detail?.baselineSnapshot).not.toBeNull();
    expect(detail?.submittedSnapshot.full_name).toContain('Review Test Scholar');

    // Verify diff engine detected title and credential updates
    expect(detail?.diff.hasChanges).toBe(true);
    const titleChange = detail?.diff.changes.find((c) => c.field === 'title');
    expect(titleChange).toBeDefined();
    expect(titleChange?.kind).toBe('modified');
  });

  it('3. requests changes on a revision and records feedback in audit log', async () => {
    const feedback = 'Please clarify your current faculty tenure status before publication.';
    const result = await processRevisionReview({
      revisionId: testRevisionId,
      action: 'request_changes',
      feedbackNotes: feedback,
      reviewerAccountId: testAdminAccountId,
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('request_changes');

    // Verify database state
    const revCheck = await client.query(
      'SELECT status, admin_notes FROM public.scholar_profile_revisions WHERE id = $1',
      [testRevisionId]
    );
    expect(revCheck.rows[0].status).toBe('changes_requested');
    expect(revCheck.rows[0].admin_notes).toBe(feedback);

    // Verify profile_reviews audit trail
    const auditLogs = await fetchReviewAuditHistory(testScholarId);
    const log = auditLogs.find((l) => l.revision_id === testRevisionId);
    expect(log).toBeDefined();
    expect(log?.action).toBe('request_changes');
    expect(log?.feedback_notes).toBe(feedback);
  });

  it('4. approves revision, promotes it to published snapshot on scholar record', async () => {
    // The scholar resubmits after the requested changes (reviews act on submitted revisions only).
    await client.query(
      `UPDATE public.scholar_profile_revisions SET status = 'submitted', submitted_at = now(), reviewed_at = NULL WHERE id = $1`,
      [testRevisionId]
    );
    const approvalNotes = 'Verified faculty appointment and credentials with seminary registrar.';
    const result = await processRevisionReview({
      revisionId: testRevisionId,
      action: 'approve',
      feedbackNotes: approvalNotes,
      reviewerAccountId: testAdminAccountId,
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('approve');

    // Verify revision is marked approved
    const revCheck = await client.query(
      'SELECT status, reviewed_at FROM public.scholar_profile_revisions WHERE id = $1',
      [testRevisionId]
    );
    expect(revCheck.rows[0].status).toBe('approved');
    expect(revCheck.rows[0].reviewed_at).not.toBeNull();

    // Verify scholar published_revision_id was promoted to testRevisionId
    const scholarCheck = await client.query(
      'SELECT published_revision_id, profile_status, title FROM public.scholars WHERE id = $1',
      [testScholarId]
    );
    expect(scholarCheck.rows[0].published_revision_id).toBe(testRevisionId);
    expect(scholarCheck.rows[0].profile_status).toBe('approved');
    expect(scholarCheck.rows[0].title).toBe('Distinguished Professor of Historical Theology');

    // Verify profile_reviews audit trail recorded the approval
    const auditLogs = await fetchReviewAuditHistory(testScholarId);
    const approvalLog = auditLogs.find((l) => l.action === 'approve' && l.revision_id === testRevisionId);
    expect(approvalLog).toBeDefined();
    expect(approvalLog?.feedback_notes).toBe(approvalNotes);

    // The relational lists were promoted in the same transaction (ADR 0025).
    const creds = await client.query('SELECT degree, display_order FROM public.credentials WHERE scholar_id = $1', [testScholarId]);
    expect(creds.rows).toEqual([{ degree: 'Ph.D.', display_order: 0 }]);
    const pubs = await client.query('SELECT title FROM public.publications WHERE scholar_id = $1', [testScholarId]);
    expect(pubs.rows).toEqual([{ title: 'Federal Theology in the Seventeenth Century' }]);
    const discs = await client.query(
      `SELECT d.slug, sd.is_primary FROM public.scholar_disciplines sd JOIN public.disciplines d ON d.id = sd.discipline_id
       WHERE sd.scholar_id = $1 ORDER BY d.slug`,
      [testScholarId]
    );
    expect(discs.rows).toEqual([
      { slug: 'church-history', is_primary: true },
      { slug: 'systematic-theology', is_primary: false },
    ]);
    const trads = await client.query(
      `SELECT t.slug, st.is_primary FROM public.scholar_traditions st JOIN public.traditions t ON t.id = st.tradition_id WHERE st.scholar_id = $1`,
      [testScholarId]
    );
    expect(trads.rows).toEqual([{ slug: 'reformed-presbyterian', is_primary: true }]);

    // The previously published revision is superseded and the draft pointer is cleared.
    const baseline = await client.query(
      'SELECT status FROM public.scholar_profile_revisions WHERE id = $1',
      [testBaselineRevId]
    );
    expect(baseline.rows[0].status).toBe('superseded');
    const pointer = await client.query('SELECT draft_revision_id FROM public.scholars WHERE id = $1', [testScholarId]);
    expect(pointer.rows[0].draft_revision_id).toBeNull();
  });

  it('4b. rejects a submitted revision (terminal) without touching the published profile', async () => {
    const rev = await client.query(
      `INSERT INTO public.scholar_profile_revisions (scholar_id, revision_number, status, snapshot_data, submitted_at)
       VALUES ($1, 3, 'submitted', '{"full_name":"Dr. Review Test Scholar","title":"Rejected Title"}'::jsonb, now())
       RETURNING id`,
      [testScholarId]
    );
    const rejectedId = rev.rows[0].id;

    const result = await processRevisionReview({
      revisionId: rejectedId,
      action: 'reject',
      feedbackNotes: 'Credentials could not be verified.',
      reviewerAccountId: testAdminAccountId,
    });
    expect(result.success).toBe(true);

    const revCheck = await client.query(
      'SELECT status, admin_notes FROM public.scholar_profile_revisions WHERE id = $1',
      [rejectedId]
    );
    expect(revCheck.rows[0].status).toBe('rejected');
    expect(revCheck.rows[0].admin_notes).toBe('Credentials could not be verified.');

    const scholar = await client.query(
      'SELECT published_revision_id, profile_status, title FROM public.scholars WHERE id = $1',
      [testScholarId]
    );
    expect(scholar.rows[0].published_revision_id).toBe(testRevisionId);
    expect(scholar.rows[0].profile_status).toBe('approved');
    expect(scholar.rows[0].title).toBe('Distinguished Professor of Historical Theology');

    // A decided revision cannot be reviewed again, and unknown ids are reported as missing.
    const again = await processRevisionReview({
      revisionId: rejectedId,
      action: 'approve',
      reviewerAccountId: testAdminAccountId,
    });
    expect(again.success).toBe(false);
    expect(again.code).toBe('not_reviewable');

    const missing = await processRevisionReview({
      revisionId: '01999999-0000-0000-0000-0000000000ff',
      action: 'approve',
      reviewerAccountId: testAdminAccountId,
    });
    expect(missing.success).toBe(false);
    expect(missing.code).toBe('not_found');
  });

  it('4c. blocks approval of unmatched taxonomy entries with a clear 422-style result and changes nothing', async () => {
    const rev = await client.query(
      `INSERT INTO public.scholar_profile_revisions (scholar_id, revision_number, status, snapshot_data, submitted_at)
       VALUES ($1, 4, 'submitted', $2::jsonb, now()) RETURNING id`,
      [
        testScholarId,
        JSON.stringify({
          full_name: 'Dr. Review Test Scholar',
          title: 'Must Not Be Published',
          credentials: [{ degree: 'Th.D.', field_of_study: 'X', institution_name: 'Y' }],
          traditions: ['Confessional Baptist'],
        }),
      ]
    );
    const unmatchedId = rev.rows[0].id;
    const reviewsBefore = (await client.query('SELECT count(*)::int AS n FROM public.profile_reviews WHERE scholar_id = $1', [testScholarId])).rows[0].n;

    const result = await processRevisionReview({
      revisionId: unmatchedId,
      action: 'approve',
      reviewerAccountId: testAdminAccountId,
    });
    expect(result).toMatchObject({ success: false, code: 'taxonomy_unmatched' });
    expect(result.unmatched).toEqual([{ kind: 'tradition', value: 'Confessional Baptist' }]);
    expect(result.error).toContain('Confessional Baptist');

    const revCheck = await client.query('SELECT status FROM public.scholar_profile_revisions WHERE id = $1', [unmatchedId]);
    expect(revCheck.rows[0].status).toBe('submitted');
    const scholar = await client.query('SELECT title FROM public.scholars WHERE id = $1', [testScholarId]);
    expect(scholar.rows[0].title).toBe('Distinguished Professor of Historical Theology');
    const creds = await client.query('SELECT degree FROM public.credentials WHERE scholar_id = $1', [testScholarId]);
    expect(creds.rows).toEqual([{ degree: 'Ph.D.' }]);
    const reviewsAfter = (await client.query('SELECT count(*)::int AS n FROM public.profile_reviews WHERE scholar_id = $1', [testScholarId])).rows[0].n;
    expect(reviewsAfter).toBe(reviewsBefore);

    // Clean up the open revision so later tests are unaffected.
    await client.query(`UPDATE public.scholar_profile_revisions SET status = 'superseded' WHERE id = $1`, [unmatchedId]);
  });

  it('5. processes institution verification decision', async () => {
    const listBefore = await fetchPendingInstitutions();
    const inst = listBefore.find((i) => i.id === testInstitutionId);
    expect(inst).toBeDefined();
    expect(inst?.status).toBe('pending');

    const updateRes = await processInstitutionVerification(testInstitutionId, 'approved');
    expect(updateRes.success).toBe(true);

    const check = await client.query('SELECT status FROM public.institutions WHERE id = $1', [testInstitutionId]);
    expect(check.rows[0].status).toBe('approved');
  });

  it('6. processes content moderation report resolution', async () => {
    const reportsBefore = await fetchContentReports('pending');
    const report = reportsBefore.find((r) => r.id === testReportId);
    expect(report).toBeDefined();

    const note = 'Investigated with institutional registrar; year confirmed correct.';
    const updateRes = await processContentReport(testReportId, 'resolved', note);
    expect(updateRes.success).toBe(true);

    const check = await client.query('SELECT status, admin_notes FROM public.reports WHERE id = $1', [testReportId]);
    expect(check.rows[0].status).toBe('resolved');
    expect(check.rows[0].admin_notes).toBe(note);
  });
});
