import { createClient } from '@/lib/supabase/server';

export type EndorsementRelationship =
  | 'Doctoral Supervisor'
  | 'Department Colleague'
  | 'Research Collaborator'
  | 'Co-Author'
  | 'Faculty Peer';

export interface EndorserProfile {
  id: string;
  slug: string;
  fullName: string;
  title?: string | null;
  currentInstitution?: string | null;
  institutionalRole?: string | null;
  profilePhotoPath?: string | null;
}

export interface ScholarEndorsement {
  id: string;
  endorserScholarId: string;
  recipientScholarId: string;
  relationship: EndorsementRelationship | string;
  subjectArea: string;
  endorsementText: string;
  status: 'pending' | 'approved' | 'declined' | 'hidden';
  createdAt: string;
  updatedAt: string;
  endorser?: EndorserProfile;
}

export interface SubmitEndorsementInput {
  recipientScholarId: string;
  relationship: EndorsementRelationship | string;
  subjectArea: string;
  endorsementText: string;
}

/**
 * Fetch approved endorsements for a given scholar to display on their public profile.
 */
export async function getApprovedEndorsements(recipientScholarId: string): Promise<ScholarEndorsement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scholar_endorsements')
    .select(`
      id,
      endorser_scholar_id,
      recipient_scholar_id,
      relationship,
      subject_area,
      endorsement_text,
      status,
      created_at,
      updated_at,
      endorser:scholars!scholar_endorsements_endorser_scholar_id_fkey (
        id,
        slug,
        full_name,
        title,
        current_institution,
        institutional_role,
        profile_photo_path
      )
    `)
    .eq('recipient_scholar_id', recipientScholarId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  type EndorsementQueryRow = {
    id: string;
    endorser_scholar_id: string;
    recipient_scholar_id: string;
    relationship: string;
    subject_area: string;
    endorsement_text: string;
    status: 'pending' | 'approved' | 'declined' | 'hidden';
    created_at: string;
    updated_at: string;
    endorser: {
      id: string;
      slug: string;
      full_name: string;
      title: string | null;
      current_institution: string | null;
      institutional_role: string | null;
      profile_photo_path: string | null;
    } | null;
  };

  return ((data || []) as unknown as EndorsementQueryRow[]).map((row) => ({
    id: row.id,
    endorserScholarId: row.endorser_scholar_id,
    recipientScholarId: row.recipient_scholar_id,
    relationship: row.relationship,
    subjectArea: row.subject_area,
    endorsementText: row.endorsement_text,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endorser: row.endorser
      ? {
          id: row.endorser.id,
          slug: row.endorser.slug,
          fullName: row.endorser.full_name,
          title: row.endorser.title,
          currentInstitution: row.endorser.current_institution,
          institutionalRole: row.endorser.institutional_role,
          profilePhotoPath: row.endorser.profile_photo_path,
        }
      : undefined,
  }));
}

/**
 * Submit a peer endorsement from an authenticated scholar.
 */
export async function submitPeerEndorsement(
  endorserScholarId: string,
  input: SubmitEndorsementInput
): Promise<{ endorsement?: ScholarEndorsement; error?: string }> {
  if (endorserScholarId === input.recipientScholarId) {
    return { error: 'Scholars cannot endorse themselves.' };
  }

  if (!input.subjectArea.trim() || !input.endorsementText.trim()) {
    return { error: 'Subject area and endorsement text are required.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scholar_endorsements')
    .insert({
      endorser_scholar_id: endorserScholarId,
      recipient_scholar_id: input.recipientScholarId,
      relationship: input.relationship,
      subject_area: input.subjectArea.trim(),
      endorsement_text: input.endorsementText.trim(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to submit peer endorsement:', error);
    return { error: 'Failed to record colleague endorsement. Please verify the scholar and try again.' };
  }

  return {
    endorsement: {
      id: data.id,
      endorserScholarId: data.endorser_scholar_id,
      recipientScholarId: data.recipient_scholar_id,
      relationship: data.relationship,
      subjectArea: data.subject_area,
      endorsementText: data.endorsement_text,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}
