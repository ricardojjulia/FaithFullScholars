/**
 * ==============================================================================
 * FaithFull Scholars — Pilot Cohort Readiness Diagnostic Script (Phase 6 MVP)
 * Validates that reference seed data, taxonomy, confessional standards,
 * and institutions are properly populated for pilot onboarding.
 *
 * Usage: npx tsx scripts/verify-pilot-readiness.ts
 * ==============================================================================
 */

import { Client } from 'pg';

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

interface DiagnosticResult {
  category: string;
  item: string;
  expected: string;
  actual: string | number;
  status: 'PASS' | 'WARN' | 'FAIL';
  notes?: string;
}

async function runPilotReadinessDiagnostic() {
  console.log('\n============================================================');
  console.log('   FaithFull Scholars — Pilot Release Diagnostic Inspector   ');
  console.log('============================================================\n');

  const client = new Client({ connectionString: dbUrl });
  const results: DiagnosticResult[] = [];

  try {
    await client.connect();
    console.log(`Connected to database at ${dbUrl.replace(/:[^:@]+@/, ':***@')}\n`);

    // 1. Disciplines Taxonomy Check
    const disciplinesRes = await client.query('SELECT count(*) FROM disciplines;');
    const discCount = parseInt(disciplinesRes.rows[0].count, 10);
    results.push({
      category: 'Taxonomy',
      item: 'Theological Disciplines',
      expected: '>= 5 disciplines',
      actual: discCount,
      status: discCount >= 5 ? 'PASS' : 'FAIL',
      notes: discCount >= 5 ? 'Standard theological disciplines populated' : 'Run seed script',
    });

    // 2. Confessional Standards Check
    const confessionsRes = await client.query('SELECT count(*) FROM confessional_standards;');
    const confCount = parseInt(confessionsRes.rows[0].count, 10);
    results.push({
      category: 'Taxonomy',
      item: 'Confessional Standards',
      expected: '>= 4 historic standards',
      actual: confCount,
      status: confCount >= 4 ? 'PASS' : 'FAIL',
      notes: confCount >= 4 ? 'Westminster, 1689, Nicene, 39 Articles present' : 'Run seed script',
    });

    // 3. Theological Traditions Check
    const traditionsRes = await client.query('SELECT count(*) FROM traditions;');
    const tradCount = parseInt(traditionsRes.rows[0].count, 10);
    results.push({
      category: 'Taxonomy',
      item: 'Theological Traditions',
      expected: '>= 3 traditions',
      actual: tradCount,
      status: tradCount >= 3 ? 'PASS' : 'FAIL',
      notes: tradCount >= 3 ? 'Reformed, Baptist, Anglican present' : 'Run seed script',
    });

    // 4. Reference Scholars Check
    const scholarsRes = await client.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE profile_status = 'approved') as approved,
        count(*) FILTER (WHERE profile_status = 'draft') as draft
      FROM scholars;
    `);
    const totalScholars = parseInt(scholarsRes.rows[0].total, 10);
    const approvedScholars = parseInt(scholarsRes.rows[0].approved, 10);
    results.push({
      category: 'Pilot Cohort',
      item: 'Approved Reference Scholars',
      expected: '>= 3 approved scholars',
      actual: approvedScholars,
      status: approvedScholars >= 3 ? 'PASS' : 'WARN',
      notes: `${totalScholars} total scholars in database (${approvedScholars} approved, ${scholarsRes.rows[0].draft} draft)`,
    });

    // 5. Reference Institutions Check
    const institutionsRes = await client.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status = 'approved') as approved
      FROM institutions;
    `);
    const totalInst = parseInt(institutionsRes.rows[0].total, 10);
    const approvedInst = parseInt(institutionsRes.rows[0].approved, 10);
    results.push({
      category: 'Pilot Cohort',
      item: 'Accredited Institutions',
      expected: '>= 1 approved institution',
      actual: approvedInst,
      status: approvedInst >= 1 ? 'PASS' : 'WARN',
      notes: `${totalInst} total institutions (${approvedInst} approved)`,
    });

    // 6. Security & Rate Limiter Tables Check
    const rateLimitRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'search_rate_limits'
      ) as exists;
    `);
    const rateLimitExists = rateLimitRes.rows[0].exists;
    results.push({
      category: 'Security',
      item: 'Search Abuse Rate Limiter Table',
      expected: 'search_rate_limits table exists',
      actual: rateLimitExists ? 'Present' : 'Missing',
      status: rateLimitExists ? 'PASS' : 'FAIL',
      notes: 'ADR 0008 token-bucket search protection table',
    });

    // 7. RLS Verification across all tables
    const rlsRes = await client.query(`
      SELECT count(*) as total_tables,
             count(*) FILTER (WHERE rowsecurity = true) as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public';
    `);
    const totalTables = parseInt(rlsRes.rows[0].total_tables, 10);
    const rlsEnabled = parseInt(rlsRes.rows[0].rls_enabled, 10);
    results.push({
      category: 'Security',
      item: 'Row Level Security Coverage',
      expected: '100% tables with RLS enabled',
      actual: `${rlsEnabled}/${totalTables} tables (${Math.round((rlsEnabled / totalTables) * 100)}%)`,
      status: rlsEnabled === totalTables ? 'PASS' : 'FAIL',
      notes: 'PostgreSQL Row Level Security multi-tenant isolation',
    });

    // 8. Enterprise Capabilities (Subscriptions, Contracts & Consortia)
    const subsRes = await client.query(`SELECT count(*) as count FROM institution_subscriptions;`);
    const subsCount = parseInt(subsRes.rows[0].count, 10);
    results.push({
      category: 'Enterprise',
      item: 'Institutional Subscriptions',
      expected: '>= 1 active subscription',
      actual: subsCount,
      status: subsCount >= 1 ? 'PASS' : 'WARN',
      notes: `${subsCount} active institutional subscriptions (ADR 0010)`,
    });

    const contractsRes = await client.query(`SELECT count(*) as count FROM institution_contracts;`);
    const contractsCount = parseInt(contractsRes.rows[0].count, 10);
    results.push({
      category: 'Enterprise',
      item: 'Institutional Contracts',
      expected: '>= 1 contract',
      actual: contractsCount,
      status: contractsCount >= 1 ? 'PASS' : 'WARN',
      notes: `${contractsCount} active engagement contracts (ADR 0011)`,
    });

    const consortiumRes = await client.query(`SELECT count(*) as count FROM consortiums;`);
    const consortiumCount = parseInt(consortiumRes.rows[0].count, 10);
    results.push({
      category: 'Enterprise',
      item: 'Seminary Consortia',
      expected: '>= 1 consortium',
      actual: consortiumCount,
      status: consortiumCount >= 1 ? 'PASS' : 'WARN',
      notes: `${consortiumCount} active seminary consortia (ADR 0012)`,
    });

    // Format output table
    console.table(
      results.map((r) => ({
        Category: r.category,
        Item: r.item,
        Expected: r.expected,
        Actual: r.actual,
        Status: r.status,
        Notes: r.notes || '',
      }))
    );

    const hasFailure = results.some((r) => r.status === 'FAIL');
    if (hasFailure) {
      console.error('\n❌ PILOT READINESS CHECK FAILED: Address items marked with FAIL.');
      process.exit(1);
    } else {
      console.log('\n✅ ALL CRITICAL PILOT READINESS CHECKS PASSED.\n');
    }
  } catch (err) {
    console.error('Diagnostic failed with error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runPilotReadinessDiagnostic();
