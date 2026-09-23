import { createClient } from '@/lib/supabase/server';
import {
  InstitutionContract,
  CreateContractInput,
  ContractStatus,
} from './types';

export async function getInstitutionContracts(
  institutionId: string
): Promise<InstitutionContract[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('institution_contracts')
    .select(`
      *,
      scholar:scholars (
        id,
        full_name,
        current_title,
        primary_institution
      ),
      milestones:contract_milestones (*)
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching institution contracts:', error);
    return [];
  }

  return (data || []) as InstitutionContract[];
}

export async function getScholarContracts(
  scholarId: string
): Promise<InstitutionContract[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('institution_contracts')
    .select(`
      *,
      institution:institutions (
        id,
        name,
        city,
        state_province
      ),
      milestones:contract_milestones (*)
    `)
    .eq('scholar_id', scholarId)
    .neq('status', 'draft') // Scholars only see contracts once officially offered
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scholar contracts:', error);
    return [];
  }

  return (data || []) as InstitutionContract[];
}

export async function getContractById(
  contractId: string
): Promise<InstitutionContract | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('institution_contracts')
    .select(`
      *,
      institution:institutions (
        id,
        name,
        city,
        state_province
      ),
      scholar:scholars (
        id,
        full_name,
        current_title,
        primary_institution
      ),
      milestones:contract_milestones (*)
    `)
    .eq('id', contractId)
    .single();

  if (error) {
    console.error('Error fetching contract by id:', error);
    return null;
  }

  return data as InstitutionContract;
}

export async function createContract(
  input: CreateContractInput,
  creatorAccountId?: string
): Promise<{ success: boolean; contract?: InstitutionContract; error?: string }> {
  const supabase = await createClient();

  if (!input.title || !input.scope_of_work || !input.start_date) {
    return { success: false, error: 'Title, scope of work, and start date are required.' };
  }

  const { data: contract, error } = await supabase
    .from('institution_contracts')
    .insert({
      institution_id: input.institution_id,
      scholar_id: input.scholar_id,
      inquiry_id: input.inquiry_id || null,
      opportunity_type: input.opportunity_type,
      title: input.title,
      scope_of_work: input.scope_of_work,
      start_date: input.start_date,
      end_date: input.end_date || null,
      total_compensation_amount: input.total_compensation_amount || 0,
      currency: input.currency || 'USD',
      payment_terms: input.payment_terms || null,
      status: 'offered', // Direct offer or draft
      institution_notes: input.institution_notes || null,
      created_by: creatorAccountId || null,
    })
    .select()
    .single();

  if (error || !contract) {
    return { success: false, error: error?.message || 'Failed to create contract.' };
  }

  // Insert milestones if provided
  if (input.milestones && input.milestones.length > 0) {
    const milestoneRows = input.milestones.map((m, idx) => ({
      contract_id: contract.id,
      title: m.title,
      description: m.description || null,
      due_date: m.due_date || null,
      compensation_amount: m.compensation_amount || 0,
      status: 'pending',
      display_order: m.display_order ?? idx,
    }));

    await supabase.from('contract_milestones').insert(milestoneRows);
  }

  return { success: true, contract: contract as InstitutionContract };
}

export async function updateContractStatus(
  contractId: string,
  newStatus: ContractStatus,
  notes?: { institution_notes?: string; scholar_notes?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (notes?.institution_notes !== undefined) {
    updatePayload.institution_notes = notes.institution_notes;
  }
  if (notes?.scholar_notes !== undefined) {
    updatePayload.scholar_notes = notes.scholar_notes;
  }

  const { error } = await supabase
    .from('institution_contracts')
    .update(updatePayload)
    .eq('id', contractId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateMilestoneStatus(
  milestoneId: string,
  status: 'pending' | 'submitted' | 'verified' | 'paid'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'verified' || status === 'paid') {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('contract_milestones')
    .update(updatePayload)
    .eq('id', milestoneId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
