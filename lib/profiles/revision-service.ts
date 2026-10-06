/**
 * ==============================================================================
 * FaithFull Scholars — Revision Service (ADR 0024)
 * Shared server-side logic for the scholar revision lifecycle: snapshot
 * sanitising (allow-list) and loading the scholar's current revision state.
 * Authorization is enforced by RLS and guard triggers, not here.
 * ==============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdherenceLevel,
  PublicationType,
  RevisionSnapshotData,
  ScholarProfileRevision,
} from '@/lib/domain/types';

export const MAX_SNAPSHOT_BYTES = 262144;
export const OPEN_REVISION_STATUSES = ['draft', 'submitted', 'changes_requested'] as const;

const PUBLICATION_TYPES: PublicationType[] = [
  'book',
  'monograph',
  'journal_article',
  'book_chapter',
  'edited_volume',
  'conference_paper',
  'dissertation',
  'popular_essay',
];

const ADHERENCE_LEVELS: AdherenceLevel[] = [
  'full_subscription',
  'strict_subscription',
  'general_agreement',
  'substantial_agreement',
  'with_exceptions',
];

const MAX_ITEMS = 50;

function str(value: unknown, max: number): string | undefined {
  return typeof value === 'string' ? value.trim().slice(0, max) : undefined;
}

function nullableStr(value: unknown, max: number): string | null | undefined {
  if (value === null) return null;
  return str(value, max);
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ITEMS)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Reduces untrusted client input to the known RevisionSnapshotData shape.
 * Unknown keys (and profile_tier, which is staff-controlled) are dropped,
 * strings are trimmed and capped, arrays are capped and item-typed.
 */
export function sanitizeSnapshot(input: unknown): RevisionSnapshotData {
  const src = input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
  const out: RevisionSnapshotData = { full_name: str(src.full_name, 200) ?? '' };

  const scalars: Array<[keyof RevisionSnapshotData, number]> = [
    ['title', 200],
    ['current_institution', 200],
    ['institutional_role', 200],
    ['location', 200],
    ['biography', 5000],
    ['doctrinal_statement_text', 10000],
    ['timezone', 100],
    ['orcid_id', 50],
    ['google_scholar_url', 500],
  ];
  for (const [key, max] of scalars) {
    if (!(key in src)) continue;
    const value = nullableStr(src[key], max);
    if (value !== undefined) {
      (out as unknown as Record<string, unknown>)[key] = value;
    }
  }

  if ('credentials' in src) {
    out.credentials = records(src.credentials).flatMap((c) => {
      const degree = str(c.degree, 200);
      const field = str(c.field_of_study, 200);
      const institution = str(c.institution_name, 200);
      if (degree === undefined || field === undefined || institution === undefined) return [];
      const year =
        typeof c.year_awarded === 'number' && Number.isInteger(c.year_awarded) ? c.year_awarded : null;
      return [
        {
          degree,
          field_of_study: field,
          institution_name: institution,
          year_awarded: year,
          is_terminal: c.is_terminal === true,
        },
      ];
    });
  }

  if ('publications' in src) {
    out.publications = records(src.publications).flatMap((p) => {
      const title = str(p.title, 500);
      if (!title || !PUBLICATION_TYPES.includes(p.publication_type as PublicationType)) return [];
      return [
        {
          title,
          publication_type: p.publication_type as PublicationType,
          publisher_or_journal: nullableStr(p.publisher_or_journal, 300) ?? null,
          year: typeof p.year === 'number' && Number.isInteger(p.year) ? p.year : null,
          doi_or_url: nullableStr(p.doi_or_url, 500) ?? null,
          citation_text: nullableStr(p.citation_text, 2000) ?? null,
        },
      ];
    });
  }

  if ('confessions' in src) {
    out.confessions = records(src.confessions).flatMap((c) => {
      const id = str(c.confessional_standard_id, 100);
      if (!id || !ADHERENCE_LEVELS.includes(c.adherence_level as AdherenceLevel)) return [];
      const name = str(c.confessional_standard_name, 200);
      return [
        {
          confessional_standard_id: id,
          ...(name !== undefined ? { confessional_standard_name: name } : {}),
          adherence_level: c.adherence_level as AdherenceLevel,
          exception_notes: nullableStr(c.exception_notes, 2000) ?? null,
        },
      ];
    });
  }

  for (const key of ['disciplines', 'traditions'] as const) {
    if (!(key in src)) continue;
    const value = src[key];
    out[key] = Array.isArray(value)
      ? value
          .slice(0, MAX_ITEMS)
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().slice(0, 200))
          .filter((item) => item.length > 0)
      : [];
  }

  return out;
}

export interface RevisionScholarSummary {
  id: string;
  slug: string;
  full_name: string;
  profile_status: string;
  verification_status: string;
  published_revision_id: string | null;
  draft_revision_id: string | null;
}

export interface RevisionBaseline {
  source: 'published_revision' | 'profile';
  revision_id: string | null;
  snapshot: RevisionSnapshotData;
}

export interface RevisionState {
  scholar: RevisionScholarSummary;
  revision: ScholarProfileRevision | null;
  baseline: RevisionBaseline;
}

const SCHOLAR_COLUMNS =
  'id, slug, full_name, title, current_institution, institutional_role, biography, location, timezone, ' +
  'doctrinal_statement_text, orcid_id, google_scholar_url, profile_status, verification_status, ' +
  'published_revision_id, draft_revision_id';

const REVISION_COLUMNS =
  'id, scholar_id, revision_number, status, snapshot_data, admin_notes, submitted_at, reviewed_at, created_at, updated_at';

type ScholarRow = RevisionScholarSummary & {
  title: string | null;
  current_institution: string | null;
  institutional_role: string | null;
  biography: string | null;
  location: string | null;
  timezone: string | null;
  doctrinal_statement_text: string | null;
  orcid_id: string | null;
  google_scholar_url: string | null;
};

function baselineFromScholar(s: ScholarRow): RevisionSnapshotData {
  return {
    full_name: s.full_name,
    title: s.title,
    current_institution: s.current_institution,
    institutional_role: s.institutional_role,
    biography: s.biography,
    location: s.location,
    timezone: s.timezone,
    doctrinal_statement_text: s.doctrinal_statement_text,
    orcid_id: s.orcid_id,
    google_scholar_url: s.google_scholar_url,
    credentials: [],
    publications: [],
    confessions: [],
    disciplines: [],
    traditions: [],
  };
}

/**
 * Loads the scholar's current revision state through the caller's own
 * (RLS-scoped) client. Returns null when the scholar row is not readable.
 */
export async function loadRevisionState(
  supabase: SupabaseClient,
  scholarId: string
): Promise<RevisionState | null> {
  const { data: scholarData, error: scholarError } = await supabase
    .from('scholars')
    .select(SCHOLAR_COLUMNS)
    .eq('id', scholarId)
    .maybeSingle();
  if (scholarError || !scholarData) return null;
  const scholar = scholarData as unknown as ScholarRow;

  type PublishedRow = { id: string; revision_number: number; snapshot_data: RevisionSnapshotData };
  let published = null as PublishedRow | null;
  if (scholar.published_revision_id) {
    const { data } = await supabase
      .from('scholar_profile_revisions')
      .select('id, revision_number, snapshot_data')
      .eq('id', scholar.published_revision_id)
      .eq('scholar_id', scholarId)
      .maybeSingle();
    if (data?.snapshot_data) {
      published = data as unknown as PublishedRow;
    }
  }

  const { data: open } = await supabase
    .from('scholar_profile_revisions')
    .select(REVISION_COLUMNS)
    .eq('scholar_id', scholarId)
    .in('status', [...OPEN_REVISION_STATUSES])
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  let revision = (open as unknown as ScholarProfileRevision | null) ?? null;

  if (!revision) {
    const { data: rejected } = await supabase
      .from('scholar_profile_revisions')
      .select(REVISION_COLUMNS)
      .eq('scholar_id', scholarId)
      .eq('status', 'rejected')
      .gt('revision_number', published?.revision_number ?? 0)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    revision = (rejected as unknown as ScholarProfileRevision | null) ?? null;
  }

  const baseline: RevisionBaseline = published
    ? { source: 'published_revision', revision_id: published.id, snapshot: published.snapshot_data }
    : { source: 'profile', revision_id: null, snapshot: baselineFromScholar(scholar) };

  return {
    scholar: {
      id: scholar.id,
      slug: scholar.slug,
      full_name: scholar.full_name,
      profile_status: scholar.profile_status,
      verification_status: scholar.verification_status,
      published_revision_id: scholar.published_revision_id,
      draft_revision_id: scholar.draft_revision_id,
    },
    revision,
    baseline,
  };
}

/**
 * Finds the scholar's single open revision (draft, submitted or changes
 * requested) by query. scholars.draft_revision_id is advisory only.
 */
export async function findOpenRevision(
  supabase: SupabaseClient,
  scholarId: string
): Promise<{ revision: ScholarProfileRevision | null; failed: boolean }> {
  const { data, error } = await supabase
    .from('scholar_profile_revisions')
    .select(REVISION_COLUMNS)
    .eq('scholar_id', scholarId)
    .in('status', [...OPEN_REVISION_STATUSES])
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { revision: null, failed: true };
  return { revision: (data as unknown as ScholarProfileRevision | null) ?? null, failed: false };
}

export const REVISION_SELECT_COLUMNS = REVISION_COLUMNS;
