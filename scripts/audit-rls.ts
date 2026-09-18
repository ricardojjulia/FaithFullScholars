import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load local environment if present
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

interface TableAudit {
  tablename: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  policy_count: number;
}

async function runAudit() {
  console.log('🔒 Running PostgreSQL Data-Isolation & RLS Audit...');
  console.log(`📡 Connecting to: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
  } catch (err) {
    console.error('\n❌ CRITICAL ERROR: Could not connect to PostgreSQL database.');
    console.error('The RLS audit cannot verify security without a live database.');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  try {
    // Check if running in self-test mode to prove failure detection
    if (process.argv.includes('--test-failure')) {
      console.log('🧪 Running in --test-failure mode to verify audit gate...');
      await client.query('DROP TABLE IF EXISTS _audit_canary_bad;');
      await client.query('CREATE TABLE _audit_canary_bad (id serial primary key, secret text);');
    }

    const query = `
      SELECT
        t.tablename,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced,
        COUNT(p.polname)::int AS policy_count
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE t.schemaname = 'public'
        AND t.tablename NOT LIKE 'supabase_%'
        AND t.tablename NOT LIKE '_prisma%'
        AND t.tablename NOT LIKE 'schema_migrations%'
      GROUP BY t.tablename, c.relrowsecurity, c.relforcerowsecurity
      ORDER BY t.tablename;
    `;

    const result = await client.query<TableAudit>(query);
    const tables = result.rows;

    if (tables.length === 0) {
      console.log('ℹ️  0 application tables currently found in public schema.');
      console.log('✅ Baseline check passed (migrations pending Phase 1).');
      await client.end();
      process.exit(0);
    }

    console.log(`\nFound ${tables.length} table(s) in public schema:\n`);
    console.log(
      '| Table Name                        | RLS Enabled | Policies | Status |'
    );
    console.log(
      '|:----------------------------------|:------------|:---------|:-------|'
    );

    let hasViolations = false;

    for (const table of tables) {
      const rlsOk = table.rls_enabled;
      const policiesOk = table.policy_count > 0;
      const pass = rlsOk && policiesOk;

      if (!pass) {
        hasViolations = true;
      }

      const statusIcon = pass ? '✅ PASS' : '❌ FAIL';
      const rlsText = rlsOk ? 'Enabled' : 'DISABLED';

      console.log(
        `| ${table.tablename.padEnd(34)} | ${rlsText.padEnd(11)} | ${String(
          table.policy_count
        ).padEnd(8)} | ${statusIcon} |`
      );
    }

    // Clean up canary table if tested
    if (process.argv.includes('--test-failure')) {
      await client.query('DROP TABLE IF EXISTS _audit_canary_bad;');
    }

    if (hasViolations) {
      console.error(
        '\n❌ SECURITY AUDIT FAILED: One or more tables violate Row-Level Security policy requirements!'
      );
      console.error(
        'Every public application table must have RLS enabled and at least one active policy.'
      );
      await client.end();
      process.exit(1);
    }

    console.log('\n✅ ALL TABLES PASS: Row-Level Security is strictly enforced.');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing audit query:', err);
    await client.end();
    process.exit(1);
  }
}

runAudit();
