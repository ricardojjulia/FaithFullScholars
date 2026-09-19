import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';
import { checkSearchRateLimit, SEARCH_LIMITS } from '@/lib/search/rate-limiter';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('Search Rate Limits Integration Tests (ADR 0008)', () => {
  let client: Client;
  const testFingerprint = `test-client-${Date.now()}`;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  });

  afterAll(async () => {
    // Clean up test rate limits
    await client.query('DELETE FROM public.search_rate_limits WHERE client_fingerprint = $1', [
      testFingerprint,
    ]);
    await client.end();
  });

  it('1. atomically increments request counter on consecutive calls', async () => {
    const res1 = await checkSearchRateLimit(testFingerprint, false);
    expect(res1.allowed).toBe(true);
    expect(res1.currentCount).toBe(1);
    expect(res1.remaining).toBe(SEARCH_LIMITS.ANONYMOUS - 1);

    const res2 = await checkSearchRateLimit(testFingerprint, false);
    expect(res2.allowed).toBe(true);
    expect(res2.currentCount).toBe(2);
    expect(res2.remaining).toBe(SEARCH_LIMITS.ANONYMOUS - 2);
  });

  it('2. returns allowed = false when rate limit exceeds max allowance', async () => {
    // Call SQL function directly with a low limit (e.g. max 3) to test exhaustion
    const overflowFingerprint = `overflow-test-${Date.now()}`;

    try {
      const res1 = await client.query(
        'SELECT * FROM public.check_search_rate_limit($1, 2, false)',
        [overflowFingerprint]
      );
      expect(res1.rows[0].allowed).toBe(true);
      expect(res1.rows[0].current_count).toBe(1);

      const res2 = await client.query(
        'SELECT * FROM public.check_search_rate_limit($1, 2, false)',
        [overflowFingerprint]
      );
      expect(res2.rows[0].allowed).toBe(true);
      expect(res2.rows[0].current_count).toBe(2);

      // Third call exceeds limit of 2
      const res3 = await client.query(
        'SELECT * FROM public.check_search_rate_limit($1, 2, false)',
        [overflowFingerprint]
      );
      expect(res3.rows[0].allowed).toBe(false);
      expect(res3.rows[0].current_count).toBe(3);
      expect(res3.rows[0].remaining).toBe(0);
    } finally {
      await client.query('DELETE FROM public.search_rate_limits WHERE client_fingerprint = $1', [
        overflowFingerprint,
      ]);
    }
  });

  it('3. verifies search_rate_limits table has RLS enabled and strictly guarded', async () => {
    const rlsRes = await client.query(`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'search_rate_limits'
    `);

    expect(rlsRes.rows.length).toBe(1);
    expect(rlsRes.rows[0].relrowsecurity).toBe(true);
  });
});
