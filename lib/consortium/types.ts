/**
 * ==============================================================================
 * FaithFull Scholars — Seminary Consortia & Multi-Campus System Domain Types
 * (ADR 0012)
 * ==============================================================================
 */

export type ConsortiumRole = 'lead' | 'member' | 'affiliate';
export type ConsortiumMemberStatus = 'active' | 'pending' | 'inactive';

export interface ConsortiumInstitutionSummary {
  id: string;
  name: string;
  slug?: string;
  location?: string | null;
  website?: string | null;
}

export interface ConsortiumMember {
  id: string;
  consortium_id: string;
  institution_id: string;
  role: ConsortiumRole;
  status: ConsortiumMemberStatus;
  joined_at: string;
  institution?: ConsortiumInstitutionSummary;
}

export interface Consortium {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  lead_institution_id: string;
  created_at: string;
  updated_at: string;
  lead_institution?: ConsortiumInstitutionSummary;
  members?: ConsortiumMember[];
}

export interface CreateConsortiumInput {
  name: string;
  slug?: string;
  description?: string;
  website?: string;
}

export interface AddConsortiumMemberInput {
  consortiumId: string;
  institutionId: string;
  role?: ConsortiumRole;
}
