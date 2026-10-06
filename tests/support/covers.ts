/**
 * Tags a test file with the product surfaces it exercises, for the test-surface
 * gate (scripts/test-surface.mjs). Ids look like:
 *   page:/institution/postings/[id]/applicants
 *   api:GET /api/inquiries
 *   action:lib/auth/auth-actions.signupInstitution
 * List every discoverable id with `npm run test:surface -- --list`.
 * The call is a no-op at runtime; the gate reads the string literals statically.
 */
export function covers(...surfaceIds: string[]): void {
  void surfaceIds;
}
