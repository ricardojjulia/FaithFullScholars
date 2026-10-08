/**
 * Floors used by `verify:deploy`. The integration test
 * tests/integration/deploy-thresholds.test.ts checks that the live policy count
 * of a database with every migration applied is at least this value, so the
 * floor cannot silently exceed reality. Lower it only when a migration removes
 * policies on purpose, and record why.
 */
export const MIN_PUBLIC_POLICIES = 100;
