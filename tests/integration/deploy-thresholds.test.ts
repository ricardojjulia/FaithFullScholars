import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';
import { MIN_PUBLIC_POLICIES } from '../../scripts/deploy-thresholds';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('verify:deploy floors do not exceed reality', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  });
  afterAll(async () => {
    await client.end();
  });

  it('the live public policy count is at least the script floor', async () => {
    const policies = (
      await client.query(
        `SELECT count(*)::int AS n FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid
         JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public'`
      )
    ).rows[0].n;
    const tables = (
      await client.query(
        `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r'`
      )
    ).rows[0].n;
    console.log(`MEASURED public policies=${policies} tables=${tables} (floor=${MIN_PUBLIC_POLICIES})`);
    expect(policies).toBeGreaterThanOrEqual(MIN_PUBLIC_POLICIES);
  });
});
