import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  sendInquiry,
  respondToInquiry,
  toggleSaveScholar,
  toggleSaveCourse,
} from '@/lib/inquiries/actions';
import {
  fetchScholarInquiries,
  fetchInstitutionInquiries,
  fetchSavedScholars,
  fetchSavedCourses,
  checkIsScholarSaved,
  fetchInstitutionStats,
} from '@/lib/inquiries/queries';
import {
  getDispatchedNotifications,
  clearDispatchedNotifications,
} from '@/lib/notifications/email-service';
import { resetInquiryRateLimits } from '@/lib/inquiries/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';

// These tests exercise business rules with the service role; RLS/tenant
// isolation is covered as real users in tests/integration/rls-authenticated.test.ts.
const admin = () => createAdminClient();

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('Institution Inquiry & Shortlist Integration (Phase 5)', () => {
  let client: Client;

  const testAccountId = 'a1888888-0000-0000-0000-000000000088';
  const testScholarId = 'f1888888-0000-0000-0000-000000000088';
  const testCourseId = 'c1888888-0000-0000-0000-000000000088';

  const testInstAccountId = 'a1888888-0000-0000-0000-000000000099';
  const testApprovedInstId = 'f2888888-0000-0000-0000-000000000088';
  const testPendingInstId = 'f2888888-0000-0000-0000-000000000089';

  let createdInquiryId: string;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();

    // 1. Create Scholar Auth User, Account, and Scholar
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'inquiry.scholar@faithfullscholars.org', '', now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
      )
      ON CONFLICT (id) DO NOTHING
    `, [testAccountId]);

    await client.query(`
      INSERT INTO public.accounts (id, email, role)
      VALUES ($1, 'inquiry.scholar@faithfullscholars.org', 'scholar')
      ON CONFLICT (id) DO NOTHING
    `, [testAccountId]);

    await client.query(`
      INSERT INTO public.scholars (
        id, account_id, slug, full_name, profile_status, current_institution
      ) VALUES (
        $1, $2, 'dr-inquiry-scholar', 'Dr. Jonathan Inquiries', 'approved', 'Reformed Seminary'
      )
      ON CONFLICT (id) DO NOTHING
    `, [testScholarId, testAccountId]);

    // 2. Create Course
    await client.query(`
      INSERT INTO public.courses (
        id, scholar_id, slug, title, level, delivery_modes, visibility
      ) VALUES (
        $1, $2, 'reformed-dogmatics-intro', 'Introduction to Reformed Dogmatics', 'graduate',
        ARRAY['modular_intensive', 'in_person'], 'public'
      )
      ON CONFLICT (id) DO NOTHING
    `, [testCourseId, testScholarId]);

    // 3. Create Institution Auth User & Account
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'dean.test@seminary.edu', '', now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
      )
      ON CONFLICT (id) DO NOTHING
    `, [testInstAccountId]);

    await client.query(`
      INSERT INTO public.accounts (id, email, role)
      VALUES ($1, 'dean.test@seminary.edu', 'institution_user')
      ON CONFLICT (id) DO NOTHING
    `, [testInstAccountId]);

    // 4. Create Approved and Pending Institutions
    await client.query(`
      INSERT INTO public.institutions (
        id, name, slug, institution_type, status, contact_email, location
      ) VALUES
        ($1, 'Approved Test Seminary', 'approved-test-seminary', 'seminary', 'approved', 'dean@approved.edu', 'Philadelphia, PA'),
        ($2, 'Pending Test Seminary', 'pending-test-seminary', 'seminary', 'pending', 'dean@pending.edu', 'Dallas, TX')
      ON CONFLICT (id) DO NOTHING
    `, [testApprovedInstId, testPendingInstId]);

    // 5. Link institution user
    await client.query(`
      INSERT INTO public.institution_users (institution_id, account_id, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT DO NOTHING
    `, [testApprovedInstId, testInstAccountId]);

    resetInquiryRateLimits();
    clearDispatchedNotifications();
  });

  afterAll(async () => {
    // Cleanup created test records
    await client.query(`DELETE FROM public.inquiries WHERE institution_id IN ($1, $2) OR scholar_id = $3`, [
      testApprovedInstId,
      testPendingInstId,
      testScholarId,
    ]);
    await client.query(`DELETE FROM public.saved_scholars WHERE institution_id = $1`, [testApprovedInstId]);
    await client.query(`DELETE FROM public.saved_courses WHERE institution_id = $1`, [testApprovedInstId]);
    await client.query(`DELETE FROM public.courses WHERE id = $1`, [testCourseId]);
    await client.query(`DELETE FROM public.scholars WHERE id = $1`, [testScholarId]);
    await client.query(`DELETE FROM public.institution_users WHERE account_id = $1`, [testInstAccountId]);
    await client.query(`DELETE FROM public.institutions WHERE id IN ($1, $2)`, [testApprovedInstId, testPendingInstId]);
    await client.query(`DELETE FROM public.accounts WHERE id IN ($1, $2)`, [testAccountId, testInstAccountId]);
    await client.query(`DELETE FROM auth.users WHERE id IN ($1, $2)`, [testAccountId, testInstAccountId]);
    await client.end();
  });

  it('1. dispatches structured inquiry when initiated by an approved institution', async () => {
    const result = await sendInquiry(admin(), {
      institution_id: testApprovedInstId,
      scholar_id: testScholarId,
      course_id: testCourseId,
      opportunity_type: 'adjunct_teaching',
      proposed_term: 'Fall 2027',
      delivery_mode: 'in_person_modular',
      message: 'We would be honored to explore your availability for teaching Reformed Dogmatics as a block intensive seminar.',
      contact_email: 'dean@approved.edu',
    }, testInstAccountId);

    expect(result.success).toBe(true);
    expect(result.data?.inquiryId).toBeDefined();
    createdInquiryId = result.data!.inquiryId;

    // Verify email notification was sent
    const notifications = getDispatchedNotifications();
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    const notification = notifications.find((n) => n.action_url.includes(createdInquiryId));
    expect(notification).toBeDefined();
    expect(notification?.recipient_name).toBe('Dr. Jonathan Inquiries');
    expect(notification?.subject).toContain('adjunct teaching');
  });

  it('2. blocks unapproved institutions from dispatching inquiries', async () => {
    const result = await sendInquiry(admin(), {
      institution_id: testPendingInstId,
      scholar_id: testScholarId,
      opportunity_type: 'guest_lecturing',
      message: 'Can you speak at our unaccredited conference next month?',
      contact_email: 'dean@pending.edu',
    }, testInstAccountId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Only verified and approved institutions');
  });

  it('3. rejects inquiry messages that are too short or lack valid email', async () => {
    const shortMsgResult = await sendInquiry(admin(), {
      institution_id: testApprovedInstId,
      scholar_id: testScholarId,
      opportunity_type: 'adjunct_teaching',
      message: 'Teach for us?',
      contact_email: 'dean@approved.edu',
    }, testInstAccountId);

    expect(shortMsgResult.success).toBe(false);
    expect(shortMsgResult.error).toContain('at least 20 characters');

    const badEmailResult = await sendInquiry(admin(), {
      institution_id: testApprovedInstId,
      scholar_id: testScholarId,
      opportunity_type: 'adjunct_teaching',
      message: 'This is a sufficiently long message exceeding twenty characters in length.',
      contact_email: 'not-an-email',
    }, testInstAccountId);

    expect(badEmailResult.success).toBe(false);
    expect(badEmailResult.error).toContain('valid institutional contact email');
  });

  it('4. retrieves incoming inquiries for the scholar inbox', async () => {
    const inquiries = await fetchScholarInquiries(admin(), testScholarId);
    expect(inquiries.length).toBeGreaterThanOrEqual(1);

    const match = inquiries.find((i) => i.id === createdInquiryId);
    expect(match).toBeDefined();
    expect(match?.status).toBe('pending');
    expect(match?.institution.name).toBe('Approved Test Seminary');
    expect(match?.course?.title).toBe('Introduction to Reformed Dogmatics');
  });

  it('5. retrieves outgoing inquiries for the institution outbox', async () => {
    const inquiries = await fetchInstitutionInquiries(admin(), testApprovedInstId);
    expect(inquiries.length).toBeGreaterThanOrEqual(1);

    const match = inquiries.find((i) => i.id === createdInquiryId);
    expect(match).toBeDefined();
    expect(match?.scholar.full_name).toBe('Dr. Jonathan Inquiries');
    expect(match?.opportunity_type).toBe('adjunct_teaching');
  });

  it('6. updates inquiry status to accepted and notifies the institution', async () => {
    clearDispatchedNotifications();

    const response = await respondToInquiry(
      admin(),
      createdInquiryId,
      'accepted',
      'I am delighted to accept this teaching engagement for Fall 2027.',
      testScholarId
    );

    expect(response.success).toBe(true);

    // Verify in database
    const inquiries = await fetchScholarInquiries(admin(), testScholarId);
    const updated = inquiries.find((i) => i.id === createdInquiryId);
    expect(updated?.status).toBe('accepted');

    // Verify institution notification was triggered
    const notifications = getDispatchedNotifications();
    expect(notifications.length).toBe(1);
    expect(notifications[0].recipient_email).toBe('dean@approved.edu');
    expect(notifications[0].subject).toContain('Accepted');
    expect(notifications[0].message_preview).toContain('delighted to accept');
  });

  it('7. bookmarks and removes scholar on institution shortlist', async () => {
    // 1. Initial state: not saved
    const isInitiallySaved = await checkIsScholarSaved(admin(), testApprovedInstId, testScholarId);
    expect(isInitiallySaved).toBe(false);

    // 2. Save scholar
    const saveRes = await toggleSaveScholar(
      admin(),
      testApprovedInstId,
      testScholarId,
      'Top candidate for Dogmatics chair.'
    );
    expect(saveRes.success).toBe(true);
    expect(saveRes.data?.saved).toBe(true);

    const isSaved = await checkIsScholarSaved(admin(), testApprovedInstId, testScholarId);
    expect(isSaved).toBe(true);

    const savedList = await fetchSavedScholars(admin(), testApprovedInstId);
    expect(savedList.length).toBe(1);
    expect(savedList[0].scholar_id).toBe(testScholarId);
    expect(savedList[0].notes).toBe('Top candidate for Dogmatics chair.');

    // 3. Remove scholar (toggle again)
    const removeRes = await toggleSaveScholar(admin(), testApprovedInstId, testScholarId);
    expect(removeRes.success).toBe(true);
    expect(removeRes.data?.saved).toBe(false);

    const isStillSaved = await checkIsScholarSaved(admin(), testApprovedInstId, testScholarId);
    expect(isStillSaved).toBe(false);
  });

  it('8. bookmarks and removes course on institution saved courses', async () => {
    // 1. Save course
    const saveRes = await toggleSaveCourse(
      admin(),
      testApprovedInstId,
      testCourseId,
      'Excellent bibliography for Romans exegesis.'
    );
    expect(saveRes.success).toBe(true);
    expect(saveRes.data?.saved).toBe(true);

    const savedCourses = await fetchSavedCourses(admin(), testApprovedInstId);
    expect(savedCourses.length).toBe(1);
    expect(savedCourses[0].course_id).toBe(testCourseId);
    expect(savedCourses[0].notes).toBe('Excellent bibliography for Romans exegesis.');

    // 2. Remove course
    const removeRes = await toggleSaveCourse(admin(), testApprovedInstId, testCourseId);
    expect(removeRes.success).toBe(true);
    expect(removeRes.data?.saved).toBe(false);

    const remainingCourses = await fetchSavedCourses(admin(), testApprovedInstId);
    expect(remainingCourses.length).toBe(0);
  });

  it('9. computes accurate dashboard statistics for the institution', async () => {
    const stats = await fetchInstitutionStats(admin(), testApprovedInstId);
    expect(stats.totalInquiries).toBeGreaterThanOrEqual(1);
    expect(stats.acceptedInquiries).toBeGreaterThanOrEqual(1);
  });
});
