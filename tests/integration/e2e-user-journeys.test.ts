import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { createAdminClient } from '@/lib/supabase/server';
import { parseCvText } from '@/lib/profiles/cv-parser';
import { computeRevisionDiff } from '@/lib/domain/diff';
import { processRevisionReview } from '@/lib/admin/actions';
import { fetchPendingRevisions } from '@/lib/admin/queries';
import { getPublicScholars, getPublicScholarBySlug } from '@/lib/domain/queries';
import { checkSearchRateLimit } from '@/lib/search/rate-limiter';
import {
  sendInquiry,
  respondToInquiry,
  toggleSaveScholar,
} from '@/lib/inquiries/actions';
import {
  fetchScholarInquiries,
  fetchInstitutionInquiries,
  fetchSavedScholars,
  checkIsScholarSaved,
} from '@/lib/inquiries/queries';
import {
  getDispatchedNotifications,
  clearDispatchedNotifications,
} from '@/lib/notifications/email-service';
import { RevisionSnapshotData } from '@/lib/domain/types';

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('End-to-End User Journeys Integration (Phase 6 MVP Hardening)', () => {
  let client: Client;
  const supabase = createAdminClient();

  // Test Entities
  const testScholarAccountId = 'e2e00000-0000-0000-0000-000000000001';
  const testAdminAccountId = 'e2e00000-0000-0000-0000-000000000002';
  const testInstAccountId = 'e2e00000-0000-0000-0000-000000000003';
  const testInstitutionId = 'e2e00000-0000-0000-0000-000000000010';
  const testScholarId = 'e2e00000-0000-0000-0000-000000000020';
  const testRevisionId = 'e2e00000-0000-0000-0000-000000000030';
  const testCourseId = 'e2e00000-0000-0000-0000-000000000040';

  let createdInquiryId: string;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();

    // 1. Clean previous run artifacts
    await supabase.from('inquiries').delete().eq('institution_id', testInstitutionId);
    await supabase.from('saved_scholars').delete().eq('institution_id', testInstitutionId);
    await supabase.from('saved_courses').delete().eq('institution_id', testInstitutionId);
    await supabase.from('profile_reviews').delete().eq('reviewer_account_id', testAdminAccountId);
    await supabase.from('courses').delete().eq('id', testCourseId);
    await supabase.from('scholar_profile_revisions').delete().eq('scholar_id', testScholarId);
    await supabase.from('scholars').delete().eq('id', testScholarId);
    await supabase.from('institution_users').delete().eq('institution_id', testInstitutionId);
    await supabase.from('institutions').delete().eq('id', testInstitutionId);
    await supabase
      .from('accounts')
      .delete()
      .in('id', [testScholarAccountId, testAdminAccountId, testInstAccountId]);

    // 2. Insert auth.users
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES
      ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e2e.scholar@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
      ($2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e2e.admin@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
      ($3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e2e.provost@reformedseminary.edu', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
      ON CONFLICT (id) DO NOTHING
    `, [testScholarAccountId, testAdminAccountId, testInstAccountId]);

    // 3. Insert public.accounts
    await client.query(`
      INSERT INTO public.accounts (id, email, role) VALUES
      ($1, 'e2e.scholar@faithfullscholars.org', 'scholar'),
      ($2, 'e2e.admin@faithfullscholars.org', 'admin'),
      ($3, 'e2e.provost@reformedseminary.edu', 'institution_user')
      ON CONFLICT (id) DO NOTHING
    `, [testScholarAccountId, testAdminAccountId, testInstAccountId]);

    // 4. Create approved testing institution
    await supabase.from('institutions').insert({
      id: testInstitutionId,
      name: 'Reformed Theological Academy',
      slug: 'reformed-theological-academy',
      institution_type: 'seminary',
      status: 'approved',
      location: 'Philadelphia, PA',
      contact_email: 'provost@reformedseminary.edu',
      website: 'https://reformedacademy.edu',
    });

    await supabase.from('institution_users').insert({
      institution_id: testInstitutionId,
      account_id: testInstAccountId,
      role: 'admin',
    });

    clearDispatchedNotifications();
  });

  afterAll(async () => {
    // Teardown test entities
    await supabase.from('inquiries').delete().eq('institution_id', testInstitutionId);
    await supabase.from('saved_scholars').delete().eq('institution_id', testInstitutionId);
    await supabase.from('saved_courses').delete().eq('institution_id', testInstitutionId);
    await supabase.from('profile_reviews').delete().eq('reviewer_account_id', testAdminAccountId);
    await supabase.from('courses').delete().eq('id', testCourseId);
    await supabase.from('scholar_profile_revisions').delete().eq('scholar_id', testScholarId);
    await supabase.from('scholars').delete().eq('id', testScholarId);
    await supabase.from('institution_users').delete().eq('institution_id', testInstitutionId);
    await supabase.from('institutions').delete().eq('id', testInstitutionId);
    await supabase
      .from('accounts')
      .delete()
      .in('id', [testScholarAccountId, testAdminAccountId, testInstAccountId]);

    await client.query(`
      DELETE FROM auth.users WHERE id IN ($1, $2, $3)
    `, [testScholarAccountId, testAdminAccountId, testInstAccountId]);

    await client.end();
  });

  // =========================================================================
  // JOURNEY 1: Scholar Onboarding, CV Ingestion & Draft Revision Staging
  // =========================================================================
  describe('Journey 1: Scholar Onboarding & Draft Revision Staging', () => {
    it('parses curriculum vitae text and extracts theological academic identity', () => {
      const sampleCvText = `
        Dr. Cornelius Van Til Jr.
        Professor of Apologetics and Systematic Theology
        Westminster Theological Seminary, Philadelphia, PA
        
        EDUCATION
        Ph.D. in Philosophical Theology, Princeton University, 2018
        Th.M. in Reformed Dogmatics, Westminster Theological Seminary, 2014
        M.Div., Reformed Theological Seminary, 2012
        
        PUBLICATIONS
        The Presuppositional Defense of Historic Christianity, P&R Publishing, 2021
        Covenant Epistemology and Van Tillian Transcendental Arguments, WTJ, 2023
      `;

      const parsed = parseCvText(sampleCvText);
      expect(parsed.credentials.length).toBeGreaterThanOrEqual(2);
      expect(parsed.credentials.some((d) => d.degree.includes('Ph.D.'))).toBe(true);
      expect(parsed.publications.length).toBeGreaterThanOrEqual(1);
      expect(parsed.suggested_disciplines).toContain('Systematic Theology');
      expect(parsed.suggested_traditions.some((t) => t.includes('Reformed'))).toBe(true);
    });

    it('creates an unapproved scholar profile in draft mode', async () => {
      const { data: scholar, error } = await supabase
        .from('scholars')
        .insert({
          id: testScholarId,
          account_id: testScholarAccountId,
          slug: 'cornelius-van-til-jr',
          full_name: 'Dr. Cornelius Van Til Jr.',
          title: 'Associate Professor of Systematic Theology',
          current_institution: 'Westminster Theological Seminary',
          biography: 'Scholar of Reformed epistemology, covenant apologetics, and post-Reformation dogmatics.',
          location: 'Philadelphia, PA',
          profile_status: 'draft',
          verification_status: 'pending',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(scholar).toBeDefined();
      expect(scholar.profile_status).toBe('draft');
      expect(scholar.published_revision_id).toBeNull();
    });

    it('stages a comprehensive draft profile revision with doctrinal statement and course', async () => {
      // 1. Create course showcase item
      await supabase.from('courses').insert({
        id: testCourseId,
        scholar_id: testScholarId,
        title: 'Presuppositional Apologetics & Covenant Epistemology',
        slug: 'presuppositional-apologetics',
        description: 'Advanced graduate examination of transcendental argument and biblical presuppositions.',
        level: 'graduate',
        delivery_modes: ['in_person_modular', 'online_sync'],
        public_preview_enabled: true,
      });

      // 2. Stage revision snapshot
      const snapshot: RevisionSnapshotData = {
        full_name: 'Dr. Cornelius Van Til Jr.',
        title: 'Associate Professor of Systematic Theology',
        current_institution: 'Westminster Theological Seminary',
        biography: 'Scholar of Reformed epistemology, covenant apologetics, and post-Reformation dogmatics.',
        location: 'Philadelphia, PA',
        doctrinal_statement_text: 'We affirm the plenary verbal inspiration and infallible authority of Sacred Scripture...',
        credentials: [
          {
            degree: 'Ph.D.',
            field_of_study: 'Philosophical Theology',
            institution_name: 'Princeton University',
            year_awarded: 2018,
            is_terminal: true,
          },
        ],
        publications: [
          {
            title: 'The Presuppositional Defense of Historic Christianity',
            publication_type: 'book',
            publisher_or_journal: 'P&R Publishing',
            year: 2021,
          },
        ],
        confessions: [
          {
            confessional_standard_id: 'c1000000-0000-0000-0000-000000000001', // Westminster Confession
            adherence_level: 'full_subscription',
            exception_notes: null,
          },
        ],
        disciplines: [],
        traditions: [],
      };

      const { data: revision, error: revError } = await supabase
        .from('scholar_profile_revisions')
        .insert({
          id: testRevisionId,
          scholar_id: testScholarId,
          revision_number: 1,
          status: 'submitted',
          admin_notes: 'Initial profile submission with doctoral credentials, book publication, and syllabus.',
          snapshot_data: snapshot,
        })
        .select()
        .single();

      expect(revError).toBeNull();
      expect(revision).toBeDefined();
      expect(revision.status).toBe('submitted');

      // Update scholar status to submitted
      await supabase
        .from('scholars')
        .update({ profile_status: 'submitted', draft_revision_id: testRevisionId })
        .eq('id', testScholarId);
    });

    it('confirms the unapproved scholar is hidden from public discovery', async () => {
      const publicScholars = await getPublicScholars({ search: 'Van Til' });
      const match = publicScholars.find((s) => s.id === testScholarId);
      expect(match).toBeUndefined();

      const slugDetail = await getPublicScholarBySlug('cornelius-van-til-jr');
      expect(slugDetail).toBeNull();
    });
  });

  // =========================================================================
  // JOURNEY 2: Admin Visual Diff Review, Snapshot Promotion & Audit Logging
  // =========================================================================
  describe('Journey 2: Admin Review & Snapshot Promotion', () => {
    it('retrieves the submitted revision in the admin review queue', async () => {
      const pending = await fetchPendingRevisions();
      const match = pending.find((r) => r.id === testRevisionId);
      expect(match).toBeDefined();
      expect(match?.scholar_name).toBe('Dr. Cornelius Van Til Jr.');
      expect(match?.status).toBe('submitted');
    });

    it('computes visual diff between empty baseline and initial profile snapshot', async () => {
      const { data: rev } = await supabase
        .from('scholar_profile_revisions')
        .select('*')
        .eq('id', testRevisionId)
        .single();

      expect(rev).toBeDefined();
      const diff = computeRevisionDiff(null, rev.snapshot_data);
      expect(diff.hasChanges).toBe(true);
      expect(diff.totalChanges).toBeGreaterThan(0);
      expect(diff.changes.some((c) => c.field === 'full_name')).toBe(true);
    });

    it('approves revision, promoting snapshot to live public listing with immutable audit trail', async () => {
      const decision = await processRevisionReview({
        revisionId: testRevisionId,
        action: 'approve',
        feedbackNotes: 'Verified doctoral credentials with Princeton registry. Approved for public directory.',
        reviewerAccountId: testAdminAccountId,
      });

      expect(decision.success).toBe(true);

      // Verify scholar profile was promoted live
      const { data: scholar } = await supabase
        .from('scholars')
        .select('profile_status, published_revision_id')
        .eq('id', testScholarId)
        .single();

      expect(scholar?.profile_status).toBe('approved');
      expect(scholar?.published_revision_id).toBe(testRevisionId);

      // Verify immutable audit log in profile_reviews
      const { data: reviews } = await supabase
        .from('profile_reviews')
        .select('*')
        .eq('revision_id', testRevisionId);

      expect(reviews).toHaveLength(1);
      expect(reviews![0].action).toBe('approve');
      expect(reviews![0].feedback_notes).toContain('Verified doctoral credentials');
    });
  });

  // =========================================================================
  // JOURNEY 3: Public Discovery, Anonymous Rate Limiting & Gating
  // =========================================================================
  describe('Journey 3: Public Discovery & Security Wall', () => {
    it('discovers the approved scholar in public search and profile routes', async () => {
      const publicScholars = await getPublicScholars({ search: 'Van Til' });
      const match = publicScholars.find((s) => s.id === testScholarId);
      expect(match).toBeDefined();
      expect(match?.full_name).toBe('Dr. Cornelius Van Til Jr.');
      expect(match?.current_institution).toBe('Westminster Theological Seminary');

      // Fetch public profile detail
      const profile = await getPublicScholarBySlug('cornelius-van-til-jr');
      expect(profile).toBeDefined();
      expect(profile?.full_name).toBe('Dr. Cornelius Van Til Jr.');
      expect(profile?.doctrinal_statement_text).toContain('plenary verbal inspiration');
    });

    it('enforces anonymous search rate limiter tracking without errors', async () => {
      const testIp = '198.51.100.42';
      const check = await checkSearchRateLimit(testIp, false);
      expect(check.allowed).toBe(true);
      expect(check.remaining).toBeLessThanOrEqual(15);
    });
  });

  // =========================================================================
  // JOURNEY 4: Institutional Shortlist, Outreach & Notification Lifecycle
  // =========================================================================
  describe('Journey 4: Institutional Outreach & Shortlist Lifecycle', () => {
    it('allows approved institution to bookmark scholar on recruitment shortlist', async () => {
      const saveResult = await toggleSaveScholar(
        testInstitutionId,
        testScholarId,
        'Top candidate for Fall 2027 Apologetics block modular intensive'
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.data?.saved).toBe(true);

      const isSaved = await checkIsScholarSaved(testInstitutionId, testScholarId);
      expect(isSaved).toBe(true);

      const savedList = await fetchSavedScholars(testInstitutionId);
      expect(savedList.some((s) => s.scholar_id === testScholarId)).toBe(true);
    });

    it('dispatches structured academic inquiry and fires transactional notification', async () => {
      clearDispatchedNotifications();

      const inquiryResult = await sendInquiry(
        {
          institution_id: testInstitutionId,
          scholar_id: testScholarId,
          course_id: testCourseId,
          opportunity_type: 'intensives_modular',
          proposed_term: 'Fall 2027',
          delivery_mode: 'in_person_modular',
          message:
            'We would be delighted to invite you to teach a 1-week block module on Presuppositional Apologetics.',
          contact_email: 'provost@reformedseminary.edu',
        },
        testInstAccountId
      );

      expect(inquiryResult.success).toBe(true);
      expect(inquiryResult.data?.inquiryId).toBeDefined();
      createdInquiryId = inquiryResult.data!.inquiryId;

      // Verify email notification abstraction dispatched alert to scholar
      const notifications = getDispatchedNotifications();
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      const email = notifications.find((n) => n.action_url.includes(createdInquiryId));
      expect(email).toBeDefined();
      expect(email?.recipient_name).toBe('Dr. Cornelius Van Til Jr.');
      expect(email?.subject).toContain('intensives modular');
    });

    it('retrieves inquiry in scholar inbox and accepts with personal response notes', async () => {
      clearDispatchedNotifications();

      // Scholar inspects inbox
      const inbox = await fetchScholarInquiries(testScholarId);
      const target = inbox.find((i) => i.id === createdInquiryId);
      expect(target).toBeDefined();
      expect(target?.status).toBe('pending');
      expect(target?.institution.name).toBe('Reformed Theological Academy');

      // Scholar accepts inquiry
      const acceptResult = await respondToInquiry(
        createdInquiryId,
        'accepted',
        'I would be honored to accept. Fall 2027 block format suits my research sabbatical schedule.'
      );
      expect(acceptResult.success).toBe(true);

      // Verify response notification dispatched back to institution contact
      const notifications = getDispatchedNotifications();
      const responseEmail = notifications.find((n) => n.action_url.includes(createdInquiryId));
      expect(responseEmail).toBeDefined();
      expect(responseEmail?.recipient_email).toBe('provost@reformedseminary.edu');
      expect(responseEmail?.subject).toContain('Accepted');

      // Verify institution outbox reflects accepted status
      const outbox = await fetchInstitutionInquiries(testInstitutionId);
      const outboxItem = outbox.find((i) => i.id === createdInquiryId);
      expect(outboxItem?.status).toBe('accepted');
    });
  });
});
