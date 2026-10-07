/**
 * Text length caps and year bounds for the profile editors (ADR 0025).
 * These mirror the caps applied by sanitizeSnapshot in revision-service.ts,
 * which truncates silently. The UI enforces them with maxLength so nothing is
 * cut off without the scholar seeing it. tests/unit/profile-rows.test.ts checks
 * that these numbers still match the server.
 */

export const FIELD_LIMITS = {
  full_name: 200,
  title: 200,
  current_institution: 200,
  institutional_role: 200,
  location: 200,
  biography: 5000,
  doctrinal_statement_text: 10000,
  timezone: 100,
  orcid_id: 50,
  google_scholar_url: 500,
  credential_degree: 200,
  credential_field: 200,
  credential_institution: 200,
  publication_title: 500,
  publication_publisher: 300,
  publication_link: 500,
  publication_citation: 2000,
  exception_notes: 2000
} as const;

export const MIN_YEAR = 1000;
export const MAX_YEAR = 2100;
