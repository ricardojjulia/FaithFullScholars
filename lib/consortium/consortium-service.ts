/**
 * ==============================================================================
 * FaithFull Scholars — Seminary Consortia & Multi-Campus System Service
 * (ADR 0012)
 *
 * Implements consortium lifecycle management, multi-campus academic affiliations,
 * and cross-institutional faculty collaboration boundaries.
 * ==============================================================================
 */

import { createClient } from '@/lib/supabase/server';
import {
  Consortium,
  ConsortiumMember,
  CreateConsortiumInput,
  AddConsortiumMemberInput,
} from './types';

/**
 * Generate a clean URL-friendly slug from consortium name
 */
export function generateConsortiumSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Retrieve all consortia where the specified institution is either the lead institution
 * or an active member.
 */
export async function getInstitutionConsortiums(
  institutionId: string
): Promise<Consortium[]> {
  const supabase = await createClient();

  // Find all consortium IDs where institution is an active/pending member
  const { data: memberRows, error: memberErr } = await supabase
    .from('consortium_members')
    .select('consortium_id')
    .eq('institution_id', institutionId)
    .in('status', ['active', 'pending']);

  if (memberErr) {
    console.error('Failed to query consortium memberships:', memberErr);
  }

  const consortiumIds = new Set<string>(
    (memberRows || []).map((r) => r.consortium_id)
  );

  // Also query consortia where institution is the lead institution
  const { data: leadRows, error: leadErr } = await supabase
    .from('consortiums')
    .select('id')
    .eq('lead_institution_id', institutionId);

  if (leadErr) {
    console.error('Failed to query lead consortia:', leadErr);
  }

  (leadRows || []).forEach((r) => consortiumIds.add(r.id));

  if (consortiumIds.size === 0) {
    return [];
  }

  // Fetch full consortium objects
  const { data: consortia, error: fetchErr } = await supabase
    .from('consortiums')
    .select(`
      id,
      name,
      slug,
      description,
      website,
      lead_institution_id,
      created_at,
      updated_at,
      lead_institution:institutions!lead_institution_id(id, name, slug, location, website),
      members:consortium_members(
        id,
        consortium_id,
        institution_id,
        role,
        status,
        joined_at,
        institution:institutions!institution_id(id, name, slug, location, website)
      )
    `)
    .in('id', Array.from(consortiumIds))
    .order('created_at', { ascending: false });

  if (fetchErr) {
    console.error('Failed to fetch consortia details:', fetchErr);
    return [];
  }

  return (consortia || []) as unknown as Consortium[];
}

/**
 * Retrieve a single consortium by slug with all members and institution profiles
 */
export async function getConsortiumBySlug(
  slug: string
): Promise<Consortium | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('consortiums')
    .select(`
      id,
      name,
      slug,
      description,
      website,
      lead_institution_id,
      created_at,
      updated_at,
      lead_institution:institutions!lead_institution_id(id, name, slug, location, website),
      members:consortium_members(
        id,
        consortium_id,
        institution_id,
        role,
        status,
        joined_at,
        institution:institutions!institution_id(id, name, slug, location, website)
      )
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    return null;
  }

  return data as unknown as Consortium;
}

/**
 * Create a new seminary consortium or multi-campus system account
 */
export async function createConsortium(
  leadInstitutionId: string,
  input: CreateConsortiumInput
): Promise<{ success: boolean; consortium?: Consortium; error?: string }> {
  const supabase = await createClient();

  const name = input.name?.trim();
  if (!name || name.length < 3) {
    return { success: false, error: 'Consortium name must be at least 3 characters long.' };
  }

  const slug = input.slug?.trim() || generateConsortiumSlug(name);
  if (!slug) {
    return { success: false, error: 'A valid slug could not be generated from the consortium name.' };
  }

  // Insert consortium row
  const { data: consortium, error: insertErr } = await supabase
    .from('consortiums')
    .insert({
      name,
      slug,
      description: input.description?.trim() || null,
      website: input.website?.trim() || null,
      lead_institution_id: leadInstitutionId,
    })
    .select('*')
    .single();

  if (insertErr || !consortium) {
    console.error('Failed to create consortium record:', insertErr);
    return {
      success: false,
      error: 'Failed to create consortium record.',
    };
  }

  // Register lead institution as primary 'lead' member (atomic guarantee)
  const { error: memberErr } = await supabase
    .from('consortium_members')
    .insert({
      consortium_id: consortium.id,
      institution_id: leadInstitutionId,
      role: 'lead',
      status: 'active',
    });

  if (memberErr) {
    console.error('Failed to register lead institution as member, rolling back:', memberErr);
    await supabase.from('consortiums').delete().eq('id', consortium.id);
    return {
      success: false,
      error: 'Failed to register lead institution membership.',
    };
  }

  return { success: true, consortium: consortium as Consortium };
}

/**
 * Add an institution as a member or affiliate of a consortium.
 * Caller must be the lead institution or system administrator.
 */
export async function addConsortiumMember(
  callerInstitutionId: string,
  input: AddConsortiumMemberInput,
  isAdmin: boolean = false
): Promise<{ success: boolean; member?: ConsortiumMember; error?: string }> {
  const supabase = await createClient();

  const allowedRoles = ['lead', 'member', 'affiliate'];
  const role = input.role || 'member';
  if (!allowedRoles.includes(role)) {
    return { success: false, error: 'Invalid consortium membership role.' };
  }

  // Verify caller is authorized
  if (!isAdmin) {
    const { data: consortium, error: consErr } = await supabase
      .from('consortiums')
      .select('lead_institution_id')
      .eq('id', input.consortiumId)
      .single();

    if (consErr || !consortium || consortium.lead_institution_id !== callerInstitutionId) {
      return {
        success: false,
        error: 'Only the consortium lead institution may invite or add member campuses.',
      };
    }
  }

  // Upsert member
  const { data: member, error: memberErr } = await supabase
    .from('consortium_members')
    .upsert(
      {
        consortium_id: input.consortiumId,
        institution_id: input.institutionId,
        role,
        // Invitations start pending (ADR 0023): the database refuses to list another
        // institution as active on the lead's say-so. There is no self-service
        // acceptance flow yet; platform staff confirm memberships.
        status: 'pending',
        joined_at: new Date().toISOString(),
      },
      // Never overwrite an existing membership (re-inviting must not demote an
      // active member to pending or reset joined_at).
      { onConflict: 'consortium_id,institution_id', ignoreDuplicates: true }
    )
    .select('*')
    .maybeSingle();

  // Already a member: return the existing row unchanged.
  const result =
    member ??
    (memberErr
      ? null
      : (
          await supabase
            .from('consortium_members')
            .select('*')
            .eq('consortium_id', input.consortiumId)
            .eq('institution_id', input.institutionId)
            .maybeSingle()
        ).data);

  if (memberErr || !result) {
    console.error('Failed to add consortium member:', memberErr);
    return {
      success: false,
      error: 'Failed to add consortium member.',
    };
  }

  return { success: true, member: result as ConsortiumMember };
}

/**
 * Remove an institution member from a consortium
 */
export async function removeConsortiumMember(
  callerInstitutionId: string,
  consortiumId: string,
  targetInstitutionId: string,
  isAdmin: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  if (!isAdmin) {
    const { data: consortium, error: consErr } = await supabase
      .from('consortiums')
      .select('lead_institution_id')
      .eq('id', consortiumId)
      .single();

    if (consErr || !consortium || consortium.lead_institution_id !== callerInstitutionId) {
      return {
        success: false,
        error: 'Only the consortium lead institution may remove member campuses.',
      };
    }

    if (targetInstitutionId === callerInstitutionId) {
      return {
        success: false,
        error: 'The lead institution cannot be removed from its own consortium.',
      };
    }
  }

  const { error: delErr } = await supabase
    .from('consortium_members')
    .delete()
    .eq('consortium_id', consortiumId)
    .eq('institution_id', targetInstitutionId);

  if (delErr) {
    console.error('Failed to remove consortium member:', delErr);
    return { success: false, error: 'Failed to remove consortium member.' };
  }

  return { success: true };
}
