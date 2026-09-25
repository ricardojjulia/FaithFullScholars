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
        disciplines: ['Historical Theology', 'Systematic Theology'],
        traditions: ['Reformed & Presbyterian'],
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
