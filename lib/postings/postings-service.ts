import { createClient } from '@/lib/supabase/server';

export type OpportunityType =
  | 'adjunct'
  | 'modular_intensive'
  | 'full_time_tenure_track'
  | 'visiting_fellow'
  | 'sabbatical_cover'
  | 'guest_lecturer'
  | 'doctoral_supervision';

export const OPPORTUNITY_TYPES: OpportunityType[] = [
  'adjunct',
  'modular_intensive',
  'full_time_tenure_track',
  'visiting_fellow',
  'sabbatical_cover',
  'guest_lecturer',
  'doctoral_supervision',
];

export interface PostingInput {
  title?: string;
  opportunity_type?: string;
  required_degree?: string;
  term?: string;
  description?: string;
  discipline_id?: string | null;
  tradition_id?: string | null;
  delivery_mode?: string;
  confessional_requirements?: string | null;
  compensation_notes?: string | null;
  deadline?: string | null;
}

export function validatePostingInput(input: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
    return { valid: false, error: 'Title is required' };
  }
  if (!input.opportunity_type || typeof input.opportunity_type !== 'string' || !OPPORTUNITY_TYPES.includes(input.opportunity_type as OpportunityType)) {
    return { valid: false, error: 'Opportunity type is required' };
  }
  if (!input.required_degree || typeof input.required_degree !== 'string' || !input.required_degree.trim()) {
    return { valid: false, error: 'Required degree is required' };
  }
  if (!input.term || typeof input.term !== 'string' || !input.term.trim()) {
    return { valid: false, error: 'Academic term is required' };
  }
  if (!input.description || typeof input.description !== 'string' || !input.description.trim()) {
    return { valid: false, error: 'Description is required' };
  }
  return { valid: true };
}

export interface InstitutionPosting {
  id: string;
  institution_id: string;
  title: string;
  slug: string;
  opportunity_type: OpportunityType;
  discipline_id: string | null;
  tradition_id: string | null;
  required_degree: string;
  delivery_mode: string;
  term: string;
  description: string;
  confessional_requirements: string | null;
  compensation_notes: string | null;
  deadline: string | null;
  status: 'draft' | 'published' | 'filled' | 'archived';
  created_at: string;
  updated_at: string;
  institution?: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state_or_region: string | null;
    website: string | null;
    institution_type: string | null;
    location: string | null;
  };
  discipline?: {
    id: string;
    name: string;
    slug: string;
  };
  tradition?: {
    id: string;
    name: string;
    slug: string;
  };
}

export function formatOpportunityType(type: OpportunityType): string {
  switch (type) {
    case 'adjunct':
      return 'Adjunct Teaching';
    case 'modular_intensive':
      return 'Modular Intensive';
    case 'full_time_tenure_track':
      return 'Full-Time / Tenure Track';
    case 'visiting_fellow':
      return 'Visiting Fellow';
    case 'sabbatical_cover':
      return 'Sabbatical Replacement';
    case 'guest_lecturer':
      return 'Guest Lecturer';
    case 'doctoral_supervision':
      return 'Doctoral Supervision';
    default:
      return type;
  }
}

export async function getAllPublishedPostings(filters?: {
  disciplineSlug?: string;
  traditionSlug?: string;
  opportunityType?: string;
}): Promise<InstitutionPosting[]> {
  const supabase = await createClient();

  let query = supabase
    .from('institution_postings')
    .select(`
      *,
      institution:institutions(id, name, slug, website, institution_type, location),
      discipline:disciplines(id, name, slug),
      tradition:traditions(id, name, slug)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (filters?.opportunityType) {
    query = query.eq('opportunity_type', filters.opportunityType);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  let results = data as InstitutionPosting[];

  if (filters?.disciplineSlug) {
    results = results.filter((p) => p.discipline?.slug === filters.disciplineSlug);
  }
  if (filters?.traditionSlug) {
    results = results.filter((p) => p.tradition?.slug === filters.traditionSlug);
  }

  return results;
}

export async function getPostingBySlug(slug: string): Promise<InstitutionPosting | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('institution_postings')
    .select(`
      *,
      institution:institutions(id, name, slug, website, institution_type, location),
      discipline:disciplines(id, name, slug),
      tradition:traditions(id, name, slug)
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as InstitutionPosting;
}

export async function getPostingsByInstitution(institutionId: string): Promise<InstitutionPosting[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('institution_postings')
    .select(`
      *,
      discipline:disciplines(id, name, slug),
      tradition:traditions(id, name, slug)
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as InstitutionPosting[];
}
