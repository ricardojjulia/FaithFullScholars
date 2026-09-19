import { describe, it, expect, afterAll } from 'vitest';
import { Client } from 'pg';
import { checkRateLimit } from '@/lib/feedback/rate-limit';
import { upsertFeedbackRecord, updateTriageRecord, fetchTriageRecords } from '@/lib/feedback/store';
import { computeFeedbackFingerprint } from '@/lib/feedback/fingerprint';

describe('PostgreSQL Pilot Feedback & Rate Limit Live Integration Tests', () => {
  const testSessionId = crypto.randomUUID();
  const testFingerprint = computeFeedbackFingerprint({
    route: `/test/route-${Date.now()}`,
    category: 'BUG',
    note: 'Integration test bug report',
  });

  const pgClient = new Client({
    connectionString:
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:49322/postgres',
  });

  afterAll(async () => {
    try {
      await pgClient.connect();
      await pgClient.query(
        'DELETE FROM public.pilot_feedback WHERE fingerprint = $1',
        [testFingerprint]
      );
      await pgClient.query(
        'DELETE FROM public.pilot_feedback_rate_limits WHERE session_id = $1',
        [testSessionId]
      );
      await pgClient.end();
    } catch {
      // Ignore cleanup error if already closed
    }
  });

  it('atomically rate-limits submissions in shared PostgreSQL storage', async () => {
    // 20 requests should succeed
    for (let i = 0; i < 20; i++) {
      const allowed = await checkRateLimit(testSessionId, 20);
      expect(allowed).toBe(true);
    }

    // 21st request should be rejected by PostgreSQL atomic check
    const exceeded = await checkRateLimit(testSessionId, 20);
    expect(exceeded).toBe(false);
  });

  it('atomically deduplicates reports, increments hit count, and reopens processed rows', async () => {
    // First submission
    const res1 = await upsertFeedbackRecord({
      fingerprint: testFingerprint,
      sessionId: testSessionId,
      route: '/test/route',
      category: 'BUG',
      note: 'Integration test bug report',
      breadcrumbs: ['/', '/test/route'],
      appVersion: '0.1.0',
      sessionDurationSeconds: 10,
    });

    expect(res1.hitCount).toBe(1);
    expect(res1.processed).toBe(false);
    expect(res1.isNew).toBe(true);

    // Triage the record: staff marks it processed and fixed
    const updated = await updateTriageRecord(res1.id, {
      processed: true,
      action: 'FIXED_IN_CODE',
    });
    expect(updated.processed).toBe(true);
    expect(updated.action).toBe('FIXED_IN_CODE');

    // Second submission with exact same fingerprint (regression)
    const res2 = await upsertFeedbackRecord({
      fingerprint: testFingerprint,
      sessionId: testSessionId,
      route: '/test/route',
      category: 'BUG',
      note: 'Integration test bug report',
      breadcrumbs: ['/', '/test/route'],
      appVersion: '0.1.0',
      sessionDurationSeconds: 35,
    });

    // Must have same row ID, incremented hit count, and automatically reopened
    expect(res2.id).toBe(res1.id);
    expect(res2.hitCount).toBe(2);
    expect(res2.processed).toBe(false);
    expect(res2.isNew).toBe(false);

    // Verify in triage query that action was reset and row is open
    const openRecords = await fetchTriageRecords({ status: 'open' });
    const match = openRecords.find((r) => r.id === res1.id);
    expect(match).toBeDefined();
    expect(match?.hit_count).toBe(2);
    expect(match?.processed).toBe(false);
    expect(match?.action).toBeNull();
  });
});
