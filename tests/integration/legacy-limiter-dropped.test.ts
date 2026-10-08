import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

/**
 * The legacy search limiter (ADR 0008) was replaced by the persistent limiter
 * (ADR 0026) and dropped by migration 20261010090000. This guards that the old
 * objects stay gone and the replacement stays present.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('Legacy search limiter is dropped (ADR 0026)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('public.search_rate_limits no longer exists', async () => {
    const res = await client.query(`SELECT to_regclass('public.search_rate_limits') AS t`);
    expect(res.rows[0].t).toBeNull();
  });

  it('public.check_search_rate_limit(text, int, boolean) no longer exists', async () => {
    const res = await client.query(
      `SELECT to_regprocedure('public.check_search_rate_limit(text,integer,boolean)') AS f`
    );
    expect(res.rows[0].f).toBeNull();
  });

  it('the replacement limiter is present', async () => {
    const res = await client.query(
      `SELECT to_regclass('public.rate_limit_buckets') AS t,
              to_regprocedure('public.check_rate_limit(text,integer,integer)') AS f`
    );
    expect(res.rows[0].t).not.toBeNull();
    expect(res.rows[0].f).not.toBeNull();
  });

  it('probe: the existence check detects an object that is present', async () => {
    // Proof the assertion can fail: recreate the legacy table inside a
    // rolled-back transaction and show the same check now sees it.
    await client.query('BEGIN');
    try {
      await client.query(`CREATE TABLE public.search_rate_limits (id int)`);
      const res = await client.query(`SELECT to_regclass('public.search_rate_limits') AS t`);
      expect(res.rows[0].t).not.toBeNull();
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
