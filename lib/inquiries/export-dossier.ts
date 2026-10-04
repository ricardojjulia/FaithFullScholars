/**
 * ==============================================================================
 * FaithFull Scholars — Search Committee Shortlist & Dossier Export
 *
 * Provides data fetching and CSV/HTML dossier formatting for seminary academic
 * search committees, deans, and provosts reviewing prospective adjunct faculty.
 * ==============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ShortlistDossierCandidate {
  id: string;
  scholar_id: string;
  full_name: string;
  slug: string;
  title?: string | null;
  current_institution?: string | null;
  primary_discipline?: string | null;
  primary_tradition?: string | null;
  confessions: string[];
  terminal_degree?: string | null;
  terminal_degree_institution?: string | null;
  graduation_year?: number | null;
  key_publications: string[];
  availability_formats: string[];
  relocation_preference?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ShortlistDossier {
  institution_id: string;
  institution_name: string;
  exported_at: string;
  total_candidates: number;
  candidates: ShortlistDossierCandidate[];
}

/**
 * Escapes a field value for RFC-4180 compliant CSV output.
 */
function escapeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an RFC-4180 CSV string with UTF-8 BOM for Excel/Sheets compatibility.
 */
export function generateShortlistCsv(
  candidates: ShortlistDossierCandidate[],
  baseUrl: string = 'https://faithfullscholars.com'
): string {
  const headers = [
    'Full Name',
    'Academic Title',
    'Current Institution',
    'Primary Discipline',
    'Primary Tradition',
    'Confessional Standards',
    'Terminal Degree',
    'Degree Institution',
    'Graduation Year',
    'Key Publications',
    'Availability Formats',
    'Relocation Preference',
    'Committee Notes',
    'Saved Date',
    'Profile URL'
  ];

  const rows = candidates.map((c) => [
    escapeCsvValue(c.full_name),
    escapeCsvValue(c.title || ''),
    escapeCsvValue(c.current_institution || 'Independent'),
    escapeCsvValue(c.primary_discipline || ''),
    escapeCsvValue(c.primary_tradition || ''),
    escapeCsvValue(c.confessions.join('; ')),
    escapeCsvValue(c.terminal_degree || ''),
    escapeCsvValue(c.terminal_degree_institution || ''),
    escapeCsvValue(c.graduation_year || ''),
    escapeCsvValue(c.key_publications.join(' | ')),
    escapeCsvValue(c.availability_formats.join(', ')),
    escapeCsvValue(c.relocation_preference || ''),
    escapeCsvValue(c.notes || ''),
    escapeCsvValue(new Date(c.created_at).toISOString().split('T')[0]),
    escapeCsvValue(`${baseUrl}/scholars/${c.slug}`)
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  // Prepend UTF-8 BOM (\uFEFF)
  return `\uFEFF${csvContent}`;
}

/**
 * Fetches enriched candidates for an institution's shortlist dossier.
 */
export async function fetchShortlistDossier(
  supabase: SupabaseClient,
  institutionId: string
): Promise<ShortlistDossier> {

  // 1. Fetch institution details
  const { data: instData } = await supabase
    .from('institutions')
    .select('id, name')
    .eq('id', institutionId)
    .maybeSingle();

  const institutionName = instData?.name || 'Academic Search Committee';

  // 2. Fetch saved scholars with full nested domain relations
  const { data: savedRows, error } = await supabase
    .from('saved_scholars')
    .select(`
      id,
      institution_id,
      scholar_id,
      notes,
      created_at,
      scholars!saved_scholars_scholar_id_fkey (
        id,
        full_name,
        slug,
        title,
        current_institution,
        credentials (*),
        publications (*),
        availability_profiles (*),
        scholar_disciplines (
          is_primary,
          disciplines (name)
        ),
        scholar_traditions (
          is_primary,
          traditions (name)
        ),
        scholar_confessions (
          adherence_level,
          confessional_standards (name)
        )
      )
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error || !savedRows) {
    console.error('Error fetching shortlist dossier:', error);
    return {
      institution_id: institutionId,
      institution_name: institutionName,
      exported_at: new Date().toISOString(),
      total_candidates: 0,
      candidates: []
    };
  }

  interface RawScholarRel {
    id: string;
    full_name: string;
    slug: string;
    title: string | null;
    current_institution: string | null;
    credentials?: Array<{ degree: string; institution_name: string; year_awarded: number | null; is_terminal: boolean }>;
    publications?: Array<{ title: string; year: number | null; citation_text: string | null }>;
    availability_profiles?: Array<{ formats?: string[]; relocation_preference?: string }>;
    scholar_disciplines?: Array<{ is_primary: boolean; disciplines: { name: string } | null }>;
    scholar_traditions?: Array<{ is_primary: boolean; traditions: { name: string } | null }>;
    scholar_confessions?: Array<{ adherence_level: string; confessional_standards: { name: string } | null }>;
  }

  const candidates: ShortlistDossierCandidate[] = savedRows.map((row: Record<string, unknown>) => {
    const s = row.scholars as unknown as RawScholarRel | null;
    if (!s) {
      return {
        id: String(row.id),
        scholar_id: String(row.scholar_id),
        full_name: 'Unknown Scholar',
        slug: '',
        confessions: [],
        key_publications: [],
        availability_formats: [],
        created_at: String(row.created_at)
      };
    }

    // Determine primary discipline & tradition
    const primaryDisc =
      s.scholar_disciplines?.find((d) => d.is_primary)?.disciplines?.name ||
      s.scholar_disciplines?.[0]?.disciplines?.name ||
      null;

    const primaryTrad =
      s.scholar_traditions?.find((t) => t.is_primary)?.traditions?.name ||
      s.scholar_traditions?.[0]?.traditions?.name ||
      null;

    // Confessions formatted as "Name (Adherence)"
    const confessions = (s.scholar_confessions || [])
      .filter((c) => Boolean(c.confessional_standards?.name))
      .map((c) => `${c.confessional_standards!.name} [${c.adherence_level}]`);

    // Terminal degree
    const terminalCred =
      s.credentials?.find((c) => c.is_terminal) ||
      s.credentials?.find((c) => c.degree.toLowerCase().includes('ph.d.') || c.degree.toLowerCase().includes('d.phil')) ||
      s.credentials?.[0];

    // Key publications (up to 3)
    const key_publications = (s.publications || [])
      .slice(0, 3)
      .map((p) => p.citation_text || `${p.title}${p.year ? ` (${p.year})` : ''}`);

    const avail = s.availability_profiles?.[0];
    const availability_formats = Array.isArray(avail?.formats) ? avail!.formats : [];

    return {
      id: String(row.id),
      scholar_id: String(row.scholar_id),
      full_name: s.full_name,
      slug: s.slug,
      title: s.title,
      current_institution: s.current_institution,
      primary_discipline: primaryDisc,
      primary_tradition: primaryTrad,
      confessions,
      terminal_degree: terminalCred?.degree || null,
      terminal_degree_institution: terminalCred?.institution_name || null,
      graduation_year: terminalCred?.year_awarded || null,
      key_publications,
      availability_formats,
      relocation_preference: avail?.relocation_preference || null,
      notes: row.notes ? String(row.notes) : null,
      created_at: String(row.created_at)
    };
  });

  return {
    institution_id: institutionId,
    institution_name: institutionName,
    exported_at: new Date().toISOString(),
    total_candidates: candidates.length,
    candidates
  };
}
