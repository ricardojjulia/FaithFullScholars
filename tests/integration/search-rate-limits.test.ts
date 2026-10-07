import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

// The enforced limiter is the persistent primitive (ADR 0026); see
// persistent-rate-limits.test.ts. This file only guards the legacy table.
describe('Legacy search rate limit table (ADR 0008, superseded by ADR 0026)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('1. legacy limiter (kept until the follow-up drop) still counts and refuses when rate limit exceeds max allowance', async () => {
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

  it('2. verifies search_rate_limits table has RLS enabled and strictly guarded', async () => {
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
