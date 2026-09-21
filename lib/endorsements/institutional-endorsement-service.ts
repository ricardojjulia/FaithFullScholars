import { createClient } from '@/lib/supabase/server';

export type InstitutionalRelationshipType =
  | 'Current Faculty'
  | 'Former Faculty'
  | 'Visiting Scholar'
  | 'Adjunct Instructor'
  | 'Research Fellow'
  | 'Distinguished Lecturer';

export interface InstitutionEndorsement {
  id: string;
  institution_id: string;
  scholar_id: string;
  relationship_type: InstitutionalRelationshipType;
  department_or_field: string;
  endorsement_text: string;
  is_credential_verified: boolean;
  status: 'active' | 'revoked';
  created_at: string;
  updated_at: string;
  institution?: {
    id: string;
    name: string;
    slug: string;
    website: string | null;
    institution_type: string | null;
    location: string | null;
  };
  scholar?: {
    id: string;
    full_name: string;
    slug: string;
    title_or_position: string | null;
  };
}

export async function getInstitutionalEndorsementsForScholar(
  scholarId: string
): Promise<InstitutionEndorsement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('institution_endorsements')
    .select(`
      *,
      institution:institutions(id, name, slug, website, institution_type, location)
    `)
    .eq('scholar_id', scholarId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as InstitutionEndorsement[];
}

export async function getEndorsementsByInstitution(
  institutionId: string
): Promise<InstitutionEndorsement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('institution_endorsements')
    .select(`
      *,
      scholar:scholars(id, full_name, slug, title)
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as Array<InstitutionEndorsement & { scholar?: { id: string; full_name: string; slug: string; title: string | null } }>).map((item) => ({
    ...item,
    scholar: item.scholar
      ? {
          id: item.scholar.id,
          full_name: item.scholar.full_name,
          slug: item.scholar.slug,
          title: item.scholar.title,
          title_or_position: item.scholar.title,
        }
      : undefined,
  })) as InstitutionEndorsement[];
}
