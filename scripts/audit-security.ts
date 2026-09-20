import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

interface Finding {
  name: string;
  title: string;
  level: string;
  categories: string[];
  description: string;
  detail: string;
  metadata: Record<string, unknown>;
}

async function runSecurityAudit() {
  console.log('🛡️  Running Supabase Security & Performance Audit (Splinter)...');
  console.log(`📡 Connecting to: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
  } catch (err) {
    console.error('❌ Connection error to database:', err);
    process.exit(1);
  }

  try {
    const sqlPath = path.resolve(process.cwd(), 'scripts/splinter.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Error: ${sqlPath} not found.`);
      process.exit(1);
    }

    const isTestFailure = process.argv.includes('--test-failure');
    if (isTestFailure) {
      console.log('🧪 Running in --test-failure mode to verify security audit gate...');
      await client.query('DROP FUNCTION IF EXISTS _audit_canary_bad_fn();');
      await client.query('CREATE FUNCTION _audit_canary_bad_fn() RETURNS void LANGUAGE sql AS $$ SELECT 1; $$;');
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const rawRes = await client.query(sql);
    const selectRes = Array.isArray(rawRes)
      ? rawRes.find((r) => r.command === 'SELECT') || rawRes[rawRes.length - 1]
      : rawRes;
    const findings: Finding[] = selectRes.rows || [];

    // Critical and high security checks that must never pass if findings exist
    const errors = findings.filter((f) => f.level === 'ERROR');
    const searchPathFindings = findings.filter(
      (f) => f.name === 'function_search_path_mutable'
    );
    const userMetadataFindings = findings.filter(
      (f) => f.name === 'rls_references_user_metadata'
    );
    const alwaysTrueFindings = findings.filter(
      (f) => f.name === 'rls_policy_always_true'
    );
    const unindexedFkeys = findings.filter(
      (f) => f.name === 'unindexed_foreign_keys'
    );
    const initplanFindings = findings.filter(
      (f) => f.name === 'auth_rls_initplan'
    );

    console.log('┌────────────────────────────────────────────────────────┬────────┬──────────┐');
    console.log('│ Security & Performance Advisor Check                   │ Count  │ Status   │');
    console.log('├────────────────────────────────────────────────────────┼────────┼──────────┤');
    console.log(`│ 0002 / 0015: Critical Schema Errors (RLS / Auth)       │ ${String(errors.length).padEnd(6)} │ ${errors.length === 0 ? '✅ PASS   ' : '❌ FAIL   '} │`);
    console.log(`│ 0011: Function Search Path Pinned                      │ ${String(searchPathFindings.length).padEnd(6)} │ ${searchPathFindings.length === 0 ? '✅ PASS   ' : '❌ FAIL   '} │`);
    console.log(`│ 0015: RLS User Metadata References (Tampering Defense) │ ${String(userMetadataFindings.length).padEnd(6)} │ ${userMetadataFindings.length === 0 ? '✅ PASS   ' : '❌ FAIL   '} │`);
    console.log(`│ 0024: Restrict Permissive Inserts (Policy Bypass)     │ ${String(alwaysTrueFindings.length).padEnd(6)} │ ${alwaysTrueFindings.length === 0 ? '✅ PASS   ' : '❌ FAIL   '} │`);
    console.log(`│ 0001: Covering Indexes on Foreign Keys                │ ${String(unindexedFkeys.length).padEnd(6)} │ ${unindexedFkeys.length === 0 ? '✅ PASS   ' : '❌ FAIL   '} │`);
    console.log(`│ 0003: Subquery InitPlan on RLS Auth Functions         │ ${String(initplanFindings.length).padEnd(6)} │ ${initplanFindings.length === 0 ? '✅ PASS   ' : '❌ FAIL   '} │`);
    console.log('└────────────────────────────────────────────────────────┴────────┴──────────┘\n');

    let hasCriticalFailures = false;

    if (errors.length > 0) {
      hasCriticalFailures = true;
      console.error(`❌ CRITICAL: ${errors.length} ERROR findings detected:`);
      errors.forEach((e) => console.error(`   - [${e.name}] ${e.detail || e.description}`));
    }

    if (searchPathFindings.length > 0) {
      hasCriticalFailures = true;
      console.error(`❌ VULNERABILITY: ${searchPathFindings.length} mutable function search_path findings:`);
      searchPathFindings.forEach((f) => console.error(`   - ${f.detail}`));
    }

    if (userMetadataFindings.length > 0) {
      hasCriticalFailures = true;
      console.error(`❌ VULNERABILITY: ${userMetadataFindings.length} user_metadata RLS findings:`);
      userMetadataFindings.forEach((f) => console.error(`   - ${f.detail}`));
    }

    if (alwaysTrueFindings.length > 0) {
      hasCriticalFailures = true;
      console.error(`❌ VULNERABILITY: ${alwaysTrueFindings.length} always-true insert policy findings:`);
      alwaysTrueFindings.forEach((f) => console.error(`   - ${f.detail}`));
    }

    if (unindexedFkeys.length > 0) {
      console.warn(`⚠️  WARNING: ${unindexedFkeys.length} unindexed foreign keys detected.`);
      unindexedFkeys.forEach((f) => console.warn(`   - ${f.detail}`));
    }

    if (hasCriticalFailures) {
      console.error('\n❌ DATABASE SECURITY AUDIT FAILED: Fix the above vulnerabilities before proceeding.');
      process.exitCode = 1;
      return;
    }

    console.log('✅ ALL DATABASE SECURITY ADVISOR GATES PASS: Database is hardened and secured.');
  } finally {
    if (process.argv.includes('--test-failure')) {
      try {
        await client.query('DROP FUNCTION IF EXISTS _audit_canary_bad_fn();');
      } catch {
        // ignore cleanup error
      }
    }
    await client.end();
  }
}

runSecurityAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
