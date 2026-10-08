import { APPLICATIONS_POSTING, serviceClient } from '../portal-fixtures';

/**
 * Clears every application to the dedicated E2E posting (ADR 0027), so the specs
 * that apply to it are rerun-safe. Notes and audit events go with their
 * application (ON DELETE CASCADE).
 *
 * Uses the service role on the disposable local stack only. It THROWS when the
 * environment is missing or not local (serviceClient does), and when the delete
 * fails: a reset that silently skips would let a stale application from a previous
 * run make the next run pass or fail for the wrong reason.
 */
export async function resetApplications(): Promise<void> {
  const db = serviceClient();
  const { error } = await db.from('posting_applications').delete().eq('posting_id', APPLICATIONS_POSTING.id);
  if (error) {
    throw new Error(`Could not reset the E2E applications (code ${error.code ?? 'unknown'}).`);
  }
}
