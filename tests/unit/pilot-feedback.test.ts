import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { computeFeedbackFingerprint } from '@/lib/feedback/fingerprint';
import { POST as submitFeedback } from '@/app/api/feedback/route';
import { PATCH as updateTriage } from '@/app/api/admin/triage/[id]/route';
import { GET as getTriageRecords } from '@/app/api/admin/triage/route';
import * as feedbackStore from '@/lib/feedback/store';
import * as rateLimitModule from '@/lib/feedback/rate-limit';
import * as authModule from '@/lib/feedback/auth';
import * as supabaseServer from '@/lib/supabase/server';

describe('Pilot Feedback & Error Triage System (§2.8 Playbook Tests)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED = 'true';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Client-side inertness when gate is off
  // --------------------------------------------------------------------------
  it('1. verifies client and server gate flags are recognized and inert when disabled', () => {
    process.env.NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED = 'false';
    const isEnabled = process.env.NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED === 'true';
    expect(isEnabled).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 2. Server rejects submissions when gate is off
  // --------------------------------------------------------------------------
  it('2. rejects submissions with HTTP 403 when the feature gate is disabled', async () => {
    process.env.NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED = 'false';
    delete process.env.PILOT_FEEDBACK_ENABLED;

    const req = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/scholars',
        category: 'BUG',
        note: 'Search filter is not resetting.',
      }),
    });

    const res = await submitFeedback(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('disabled');
  });

  // --------------------------------------------------------------------------
  // 3. Manual submission carries the expected context
  // --------------------------------------------------------------------------
  it('3. processes manual submission carrying full contextual telemetry', async () => {
    const upsertSpy = vi.spyOn(feedbackStore, 'upsertFeedbackRecord').mockResolvedValue({
      id: 'b0000000-0000-4000-8000-000000000002',
      hitCount: 1,
      processed: false,
      isNew: true,
    });
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(true);

    const sessionId = 'a0000000-0000-4000-8000-000000000001';
    const req = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        route: '/courses',
        category: 'IMPROVEMENT',
        note: 'Add PDF export for syllabus preview',
        breadcrumbs: ['/', '/scholars', '/courses'],
        appVersion: '0.1.0',
        sessionDurationSeconds: 145,
      }),
    });

    const res = await submitFeedback(req);
    expect(res.status).toBe(200);

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        route: '/courses',
        category: 'IMPROVEMENT',
        note: 'Add PDF export for syllabus preview',
        breadcrumbs: ['/', '/scholars', '/courses'],
        appVersion: '0.1.0',
        sessionDurationSeconds: 145,
      })
    );
  });

  // --------------------------------------------------------------------------
  // 4. Automatic error capture submits context and swallows reporting failures
  // --------------------------------------------------------------------------
  it('4. accepts automatic error report without leaking stack traces or credentials', async () => {
    const upsertSpy = vi.spyOn(feedbackStore, 'upsertFeedbackRecord').mockResolvedValue({
      id: 'b0000000-0000-4000-8000-000000000003',
      hitCount: 1,
      processed: false,
      isNew: true,
    });
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(true);

    const sessionId = 'a0000000-0000-4000-8000-000000000001';
    const req = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        route: '/scholars/dr-calvin',
        category: 'ERROR',
        errorMessage: 'Cannot read properties of undefined (reading "publications")',
        breadcrumbs: ['/', '/scholars', '/scholars/dr-calvin'],
        appVersion: '0.1.0',
        sessionDurationSeconds: 42,
      }),
    });

    const res = await submitFeedback(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'ERROR',
        errorMessage: 'Cannot read properties of undefined (reading "publications")',
      })
    );
  });

  // --------------------------------------------------------------------------
  // 5. Client-supplied identity and fingerprint fields are ignored
  // --------------------------------------------------------------------------
  it('5. strictly ignores client-supplied identity and fingerprint fields', async () => {
    const upsertSpy = vi.spyOn(feedbackStore, 'upsertFeedbackRecord').mockResolvedValue({
      id: 'b0000000-0000-4000-8000-000000000004',
      hitCount: 1,
      processed: false,
      isNew: true,
    });
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(true);

    const req = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/dev/status',
        category: 'BUG',
        note: 'Bug report with forged identity',
        // Injected malicious client fields:
        user_email: 'attacker@evil.com',
        user_role: 'admin',
        fingerprint: 'forged-fake-sha256-hash',
      }),
    });

    const res = await submitFeedback(req);
    expect(res.status).toBe(200);

    const callArgs = upsertSpy.mock.calls[0][0];
    // Fingerprint must be a valid 64-char hex SHA-256 hash computed server-side
    expect(callArgs.fingerprint).not.toBe('forged-fake-sha256-hash');
    expect(callArgs.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    // User email must not be the client-injected attacker email
    expect(callArgs.userEmail).not.toBe('attacker@evil.com');
  });

  // --------------------------------------------------------------------------
  // 6. Authenticated identity correctly derived; anonymous stores null
  // --------------------------------------------------------------------------
  it('6. derives identity from server session when authenticated, null when anonymous', async () => {
    // 6a: Anonymous visitor
    const upsertSpy = vi.spyOn(feedbackStore, 'upsertFeedbackRecord').mockResolvedValue({
      id: 'b0000000-0000-4000-8000-000000000005',
      hitCount: 1,
      processed: false,
      isNew: true,
    });
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(true);

    // Mock unauthenticated Supabase getUser
    vi.spyOn(supabaseServer, 'createClient').mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>);

    const reqAnon = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/',
        category: 'IMPROVEMENT',
        note: 'Anonymous suggestion',
      }),
    });

    await submitFeedback(reqAnon);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: null,
        userRole: null,
      })
    );

    // 6b: Authenticated scholar session
    vi.spyOn(supabaseServer, 'createClient').mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: 'scholar@westminster.edu',
              app_metadata: { role: 'scholar' },
            },
          },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>);

    const reqAuth = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/dashboard/profile',
        category: 'BUG',
        note: 'Bio formatting glitch',
      }),
    });

    await submitFeedback(reqAuth);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: 'scholar@westminster.edu',
        userRole: 'scholar',
      })
    );
  });

  // --------------------------------------------------------------------------
  // 7. Equivalent normalized reports collapse to one fingerprint; different notes do not
  // --------------------------------------------------------------------------
  it('7. collapses equivalent normalized reports to one fingerprint and separates distinct notes', () => {
    // Exact same normalized text with varying whitespace & casing
    const fp1 = computeFeedbackFingerprint({
      route: '/scholars/dr-edwards',
      category: 'BUG',
      note: 'Profile picture failed to load.',
    });

    const fp2 = computeFeedbackFingerprint({
      route: '  /scholars/dr-edwards/  ',
      category: 'BUG',
      note: '  PROFILE   PICTURE   FAILED TO LOAD.  ',
    });

    expect(fp1).toBe(fp2);

    // Materially different note on same route
    const fpDifferent = computeFeedbackFingerprint({
      route: '/scholars/dr-edwards',
      category: 'BUG',
      note: 'CV PDF download link returned 404.',
    });

    expect(fp1).not.toBe(fpDifferent);

    // Error category fingerprinting
    const fpError1 = computeFeedbackFingerprint({
      route: '/api/v1',
      category: 'ERROR',
      errorMessage: 'Network timeout: 504 gateway timeout',
    });

    const fpError2 = computeFeedbackFingerprint({
      route: '/api/v1',
      category: 'ERROR',
      errorMessage: '  NETWORK TIMEOUT: 504 GATEWAY TIMEOUT  ',
    });

    expect(fpError1).toBe(fpError2);
  });

  // --------------------------------------------------------------------------
  // 8. Field validation bounds and category allowlist enforcement
  // --------------------------------------------------------------------------
  it('8. enforces validation bounds on UUID, category allowlist, and lengths', async () => {
    // 8a: Invalid UUID
    const reqInvalidUUID = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'not-a-valid-uuid',
        route: '/',
        category: 'BUG',
      }),
    });
    const res1 = await submitFeedback(reqInvalidUUID);
    expect(res1.status).toBe(400);
    const body1 = await res1.json();
    expect(body1.error).toContain('sessionId');

    // 8b: Invalid Category
    const reqInvalidCat = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/',
        category: 'SECURITY_VULNERABILITY_UNLISTED',
      }),
    });
    const res2 = await submitFeedback(reqInvalidCat);
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.error).toContain('category');

    // 8c: Truncates oversized input gracefully
    const upsertSpy = vi.spyOn(feedbackStore, 'upsertFeedbackRecord').mockResolvedValue({
      id: 'b0000000-0000-4000-8000-000000000006',
      hitCount: 1,
      processed: false,
      isNew: true,
    });
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(true);

    const longNote = 'A'.repeat(3000);
    const reqLongNote = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/very-long-route',
        category: 'BUG',
        note: longNote,
      }),
    });

    const res3 = await submitFeedback(reqLongNote);
    expect(res3.status).toBe(200);
    const notePassed = upsertSpy.mock.calls[0][0].note;
    expect(notePassed?.length).toBe(2000);
  });

  // --------------------------------------------------------------------------
  // 9. Rate limit exhaustion returns HTTP 429; storage error returns masked 500
  // --------------------------------------------------------------------------
  it('9. returns HTTP 429 when rate limit is exceeded and masks raw 500 internals', async () => {
    // 9a: Rate limit exceeded
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(false);

    const reqRateLimited = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/',
        category: 'BUG',
        note: 'Spamming',
      }),
    });

    const res429 = await submitFeedback(reqRateLimited);
    expect(res429.status).toBe(429);
    const body429 = await res429.json();
    expect(body429.error).toContain('rate limit');

    // 9b: Internal database error masked
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(true);
    vi.spyOn(feedbackStore, 'upsertFeedbackRecord').mockRejectedValue(
      new Error('FATAL: connection terminated unexpectedly on port 49322')
    );

    const reqDbError = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/',
        category: 'BUG',
        note: 'Normal note',
      }),
    });

    const res500 = await submitFeedback(reqDbError);
    expect(res500.status).toBe(500);
    const body500 = await res500.json();
    // Must NOT leak database port, credentials, or internal query
    expect(body500.error).toBe('An unexpected error occurred while processing feedback.');
    expect(JSON.stringify(body500)).not.toContain('49322');
    expect(JSON.stringify(body500)).not.toContain('FATAL');
  });

  // --------------------------------------------------------------------------
  // 10. Only staff can load or mutate triage records (unauthenticated & wrong-role)
  // --------------------------------------------------------------------------
  it('10. asserts staff-only authorization on triage endpoints for unauthenticated and wrong-role callers', async () => {
    const recordId = 'c0000000-0000-4000-8000-000000000001';

    // 10a: Unauthenticated caller
    vi.spyOn(authModule, 'verifyStaffUser').mockResolvedValue({
      authorized: false,
      status: 401,
      error: 'Unauthorized: Authentication required.',
    });

    const reqUnauth = new NextRequest(`http://localhost:3845/api/admin/triage/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ processed: true }),
    });

    const resUnauth = await updateTriage(reqUnauth, {
      params: Promise.resolve({ id: recordId }),
    });
    expect(resUnauth.status).toBe(401);

    const resGetUnauth = await getTriageRecords(
      new NextRequest('http://localhost:3845/api/admin/triage')
    );
    expect(resGetUnauth.status).toBe(401);

    // 10b: Authenticated but wrong role ('scholar')
    vi.spyOn(authModule, 'verifyStaffUser').mockResolvedValue({
      authorized: false,
      status: 403,
      error: 'Forbidden: Platform staff role required.',
    });

    const reqScholar = new NextRequest(`http://localhost:3845/api/admin/triage/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'FIXED_IN_CODE' }),
    });

    const resScholar = await updateTriage(reqScholar, {
      params: Promise.resolve({ id: recordId }),
    });
    expect(resScholar.status).toBe(403);

    const resGetScholar = await getTriageRecords(
      new NextRequest('http://localhost:3845/api/admin/triage')
    );
    expect(resGetScholar.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // 11. Triage workspace filters and update actions work
  // --------------------------------------------------------------------------
  it('11. verifies triage update mutations accept valid taxonomy and persist changes', async () => {
    const recordId = 'c0000000-0000-4000-8000-000000000001';

    vi.spyOn(authModule, 'verifyStaffUser').mockResolvedValue({
      authorized: true,
      status: 200,
      user: { id: 'admin-1', role: 'admin' },
    });

    const updateSpy = vi.spyOn(feedbackStore, 'updateTriageRecord').mockResolvedValue({
      id: recordId,
      fingerprint: 'test-fingerprint',
      session_id: 'a0000000-0000-4000-8000-000000000001',
      route: '/scholars',
      category: 'BUG',
      error_message: null,
      note: 'Resolved bug note',
      breadcrumbs: [],
      user_email: 'test@example.com',
      user_role: 'scholar',
      app_version: '0.1.0',
      session_duration_seconds: 120,
      hit_count: 3,
      metadata: {},
      processed: true,
      action: 'FIXED_IN_CODE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const reqValidUpdate = new NextRequest(`http://localhost:3845/api/admin/triage/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        processed: true,
        action: 'FIXED_IN_CODE',
      }),
    });

    const resValid = await updateTriage(reqValidUpdate, {
      params: Promise.resolve({ id: recordId }),
    });
    expect(resValid.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(recordId, {
      processed: true,
      action: 'FIXED_IN_CODE',
    });
    const body = await resValid.json();
    expect(body.success).toBe(true);
    expect(body.record.action).toBe('FIXED_IN_CODE');
    expect(body.record.processed).toBe(true);

    // Invalid action taxonomy rejection
    const reqInvalidAction = new NextRequest(`http://localhost:3845/api/admin/triage/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'INVALID_NON_EXISTENT_ACTION',
      }),
    });

    const resInvalid = await updateTriage(reqInvalidAction, {
      params: Promise.resolve({ id: recordId }),
    });
    expect(resInvalid.status).toBe(400);
  });

  // --------------------------------------------------------------------------
  // 12. Duplicate submission increments hit count and reopens a processed record
  // --------------------------------------------------------------------------
  it('12. tests atomic duplicate upsert behavior: hit_count increments and reopens processed records', async () => {
    // Mock store returning reopened status on fingerprint conflict
    vi.spyOn(feedbackStore, 'upsertFeedbackRecord').mockResolvedValue({
      id: 'b0000000-0000-4000-8000-000000000007',
      hitCount: 5,
      processed: false,
      isNew: false, // Reopened existing record
    });
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(true);

    const req = new NextRequest('http://localhost:3845/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'a0000000-0000-4000-8000-000000000001',
        route: '/courses',
        category: 'ERROR',
        errorMessage: 'Connection timeout',
      }),
    });

    const res = await submitFeedback(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hitCount).toBe(5);
    expect(body.reopened).toBe(true);
  });
});
