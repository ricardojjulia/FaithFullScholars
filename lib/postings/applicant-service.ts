/**
 * ==============================================================================
 * FaithFull Scholars — Search Committee Applicant Matrix (ADR 0020, ADR 0027)
 *
 * Reads the REAL applications of one posting with the member's own client, so
 * Postgres RLS is the enforcing layer: a member sees only applications of their
 * own institution, and the institution's private notes only if they are not the
 * applicant. There is no service-role client and no guessing: the dossier shown
 * is the frozen snapshot sealed when the scholar applied, never the live profile.
 *
 * There is deliberately NO derived confessional "fit" score (owner decision,
 * 2026-10-08): the committee sees what the scholar DECLARED, beside what the
 * posting requires, and judges for itself.
 *
 * Two queries (no N+1): the posting, then its applications with their note.
 * ==============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isTerminalDoctorate } from '@/lib/accreditation/ats-matrix-generator';
import { isApplicationStatus, type ApplicationStatus } from '@/lib/postings/application-status';
import { PortalQueryError } from '@/lib/inquiries/queries';

export interface DossierCredential {
  degree: string;
  fieldOfStudy: string | null;
  institutionName: string | null;
  yearAwarded: number | null;
  isTerminal: boolean;
}

export interface DossierPublication {
  title: string;
  publicationType: string | null;
  publisherOrJournal: string | null;
  year: number | null;
  doiOrUrl: string | null;
}

export interface DossierNamed {
  name: string;
  slug: string;
  isPrimary?: boolean;
}

export interface DossierConfession extends DossierNamed {
  adherenceLevel: string | null;
  exceptionNotes: string | null;
}

/** The frozen dossier, parsed defensively from the stored JSON. */
export interface DossierView {
  sealedAt: string | null;
  biography: string | null;
  location: string | null;
  institutionalRole: string | null;
  doctrinalStatement: string | null;
  orcidId: string | null;
  googleScholarUrl: string | null;
  credentials: DossierCredential[];
  publications: DossierPublication[];
  disciplines: DossierNamed[];
  traditions: DossierNamed[];
  confessions: DossierConfession[];
}

export interface ApplicantDossier {
  applicationId: string;
  scholarId: string;
  scholarName: string;
  scholarSlug: string;
  title: string | null;
  currentInstitution: string | null;
  highestDegree: string | null;
  degreeInstitution: string | null;
  isTerminalDoctorate: boolean;
  /** The scholar's declared confessions (name, adherence, exception notes) from the frozen snapshot. */
  confessions: DossierConfession[];
  coverNote: string;
  status: ApplicationStatus;
  appliedAt: string;
  statusChangedAt: string;
  /** The institution's private note (empty when none, or when the caller is the applicant). */
  note: string;
  dossier: DossierView;
}

export interface PostingApplicantReport {
  postingId: string;
  postingTitle: string;
  postingSlug: string;
  opportunityType: string;
  term: string;
  requiredDegree: string;
  confessionalRequirements: string | null;
  /** The posting's stated confessional standard (its tradition), if any. */
  confessionalStandard: string | null;
  totalApplicants: number;
  terminalDoctoratesCount: number;
  terminalDoctoratesRatio: number;
  applicants: ApplicantDossier[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {});
const asList = (value: unknown): Json[] => (Array.isArray(value) ? value.map(asObject) : []);
const asText = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Parses the stored snapshot into a safe view. Unknown shapes degrade to empty lists, never throw. */
export function parseDossierSnapshot(raw: unknown): DossierView & { fullName: string | null; title: string | null; currentInstitution: string | null; scholarSlug: string | null } {
  const s = asObject(raw);
  const named = (list: unknown): DossierNamed[] =>
    asList(list)
      .map((row) => ({ name: asText(row.name) ?? '', slug: asText(row.slug) ?? '', isPrimary: row.is_primary === true }))
      .filter((row) => row.name !== '');
  return {
    fullName: asText(s.full_name),
    title: asText(s.title),
    currentInstitution: asText(s.current_institution),
    scholarSlug: asText(s.scholar_slug),
    sealedAt: asText(s.sealed_at),
    biography: asText(s.biography),
    location: asText(s.location),
    institutionalRole: asText(s.institutional_role),
    doctrinalStatement: asText(s.doctrinal_statement_text),
    orcidId: asText(s.orcid_id),
    googleScholarUrl: asText(s.google_scholar_url),
    credentials: asList(s.credentials)
      .map((row) => ({
        degree: asText(row.degree) ?? '',
        fieldOfStudy: asText(row.field_of_study),
        institutionName: asText(row.institution_name),
        yearAwarded: asNumber(row.year_awarded),
        isTerminal: row.is_terminal === true,
      }))
      .filter((row) => row.degree !== ''),
    publications: asList(s.publications)
      .map((row) => ({
        title: asText(row.title) ?? '',
        publicationType: asText(row.publication_type),
        publisherOrJournal: asText(row.publisher_or_journal),
        year: asNumber(row.year),
        doiOrUrl: asText(row.doi_or_url),
      }))
      .filter((row) => row.title !== ''),
    disciplines: named(s.disciplines),
    traditions: named(s.traditions),
    confessions: asList(s.confessions)
      .map((row) => ({
        name: asText(row.name) ?? '',
        slug: asText(row.slug) ?? '',
        adherenceLevel: asText(row.adherence_level),
        exceptionNotes: asText(row.exception_notes),
      }))
      .filter((row) => row.name !== ''),
  };
}

/** The credential to headline: a terminal doctorate if there is one, else the most recent. */
export function pickHighestCredential(credentials: DossierCredential[]): DossierCredential | null {
  if (credentials.length === 0) return null;
  const terminal = credentials.find((c) => isTerminalDoctorate(c.degree));
  if (terminal) return terminal;
  return [...credentials].sort((a, b) => (b.yearAwarded ?? 0) - (a.yearAwarded ?? 0))[0];
}

interface ApplicationRow {
  id: string;
  scholar_id: string;
  cover_note: string;
  dossier_snapshot: unknown;
  status: string;
  status_changed_at: string;
  created_at: string;
  posting_application_notes?: { body?: string | null }[] | { body?: string | null } | null;
}

/**
 * Compiles the applicant comparison report for one posting, or null when the
 * posting does not exist or is not one of the caller's institutions' postings.
 *
 * `client` MUST be the caller's own (RLS-scoped) client and `institutionIds` the
 * verified membership from the session. RLS is the enforcing layer; the explicit
 * `.in()` keeps the query honest and cheap. Throws PortalQueryError when a query
 * fails (an outage is not "no applicants").
 */
export async function getPostingApplicantReport(
  client: SupabaseClient,
  postingId: string,
  institutionIds: string[]
): Promise<PostingApplicantReport | null> {
  if (!UUID_REGEX.test(postingId) || institutionIds.length === 0) {
    return null;
  }

  // Query 1: the posting, only if it belongs to one of the caller's institutions.
  const { data: posting, error: postingError } = await client
    .from('institution_postings')
    .select('id, institution_id, title, slug, opportunity_type, term, required_degree, confessional_requirements, traditions(name)')
    .eq('id', postingId)
    .in('institution_id', institutionIds)
    .maybeSingle();

  if (postingError) {
    throw new PortalQueryError('posting', postingError.code);
  }
  if (!posting) {
    return null;
  }

  // Query 2: its applications with the institution's private note.
  const { data: rows, error: applicationsError } = await client
    .from('posting_applications')
    .select('id, scholar_id, cover_note, dossier_snapshot, status, status_changed_at, created_at, posting_application_notes(body)')
    .eq('posting_id', postingId)
    .in('institution_id', institutionIds)
    .order('created_at', { ascending: false });

  if (applicationsError) {
    throw new PortalQueryError('posting applications', applicationsError.code);
  }

  const traditionName = (posting.traditions as unknown as { name?: string } | null)?.name;

  const applicants: ApplicantDossier[] = [];
  let terminalDoctoratesCount = 0;

  for (const row of (rows ?? []) as unknown as ApplicationRow[]) {
    if (!isApplicationStatus(row.status)) continue;

    const dossier = parseDossierSnapshot(row.dossier_snapshot);
    const highest = pickHighestCredential(dossier.credentials);
    const terminal = highest ? isTerminalDoctorate(highest.degree) : false;
    if (terminal) terminalDoctoratesCount++;

    const noteRow = Array.isArray(row.posting_application_notes)
      ? row.posting_application_notes[0]
      : row.posting_application_notes;

    applicants.push({
      applicationId: row.id,
      scholarId: row.scholar_id,
      scholarName: dossier.fullName ?? 'Applicant',
      scholarSlug: dossier.scholarSlug ?? '',
      title: dossier.title,
      currentInstitution: dossier.currentInstitution,
      highestDegree: highest ? [highest.degree, highest.fieldOfStudy].filter(Boolean).join(' in ') : null,
      degreeInstitution: highest?.institutionName ?? null,
      isTerminalDoctorate: terminal,
      confessions: dossier.confessions,
      coverNote: row.cover_note,
      status: row.status,
      appliedAt: row.created_at,
      statusChangedAt: row.status_changed_at,
      note: noteRow?.body ?? '',
      dossier: {
        sealedAt: dossier.sealedAt,
        biography: dossier.biography,
        location: dossier.location,
        institutionalRole: dossier.institutionalRole,
        doctrinalStatement: dossier.doctrinalStatement,
        orcidId: dossier.orcidId,
        googleScholarUrl: dossier.googleScholarUrl,
        credentials: dossier.credentials,
        publications: dossier.publications,
        disciplines: dossier.disciplines,
        traditions: dossier.traditions,
        confessions: dossier.confessions,
      },
    });
  }

  const totalApplicants = applicants.length;
  const terminalDoctoratesRatio = totalApplicants > 0 ? Math.round((terminalDoctoratesCount / totalApplicants) * 100) : 0;

  return {
    postingId: posting.id,
    postingTitle: posting.title,
    postingSlug: posting.slug,
    opportunityType: posting.opportunity_type,
    term: posting.term,
    requiredDegree: posting.required_degree,
    confessionalRequirements: posting.confessional_requirements,
    confessionalStandard: traditionName ?? null,
    totalApplicants,
    terminalDoctoratesCount,
    terminalDoctoratesRatio,
    applicants,
  };
}
