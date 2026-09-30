import { createClient } from '@/lib/supabase/server';
import {
  CourseLicensingAgreement,
  CreateLicensingRequestInput,
  UpdateLicensingAgreementInput,
} from './types';

export async function getInstitutionLicensingAgreements(
  institutionId: string
): Promise<CourseLicensingAgreement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('course_licensing_agreements')
    .select(`
      *,
      course:courses (
        id,
        title,
        slug,
        level,
        description
      ),
      scholar:scholars (
        id,
        full_name,
        title,
        current_institution
      ),
      consortium:consortiums (
        id,
        name,
        slug
      )
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching institution course licensing agreements:', error);
    return [];
  }

  return (data || []) as CourseLicensingAgreement[];
}

export async function getScholarLicensingAgreements(
  scholarId: string
): Promise<CourseLicensingAgreement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('course_licensing_agreements')
    .select(`
      *,
      course:courses (
        id,
        title,
        slug,
        level,
        description
      ),
      institution:institutions (
        id,
        name,
        location,
        accreditation_body,
        accreditation_status
      ),
      consortium:consortiums (
        id,
        name,
        slug
      )
    `)
    .eq('scholar_id', scholarId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scholar course licensing agreements:', error);
    return [];
  }

  return (data || []) as CourseLicensingAgreement[];
}

export async function getLicensingAgreementById(
  agreementId: string
): Promise<CourseLicensingAgreement | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('course_licensing_agreements')
    .select(`
      *,
      course:courses (
        id,
        title,
        slug,
        level,
        description
      ),
      scholar:scholars (
        id,
        full_name,
        title,
        current_institution
      ),
      institution:institutions (
        id,
        name,
        location,
        accreditation_body,
        accreditation_status
      ),
      consortium:consortiums (
        id,
        name,
        slug
      )
    `)
    .eq('id', agreementId)
    .single();

  if (error) {
    console.error('Error fetching licensing agreement by id:', error);
    return null;
  }

  return data as CourseLicensingAgreement;
}

export async function requestCourseLicense(
  input: CreateLicensingRequestInput
): Promise<{ success: boolean; agreement?: CourseLicensingAgreement; error?: string }> {
  const supabase = await createClient();

  if (!input.course_id || !input.scholar_id || !input.institution_id) {
    return { success: false, error: 'Course, scholar, and institution identifiers are required.' };
  }

  const { data, error } = await supabase
    .from('course_licensing_agreements')
    .insert({
      course_id: input.course_id,
      scholar_id: input.scholar_id,
      institution_id: input.institution_id,
      consortium_id: input.consortium_id || null,
      license_type: input.license_type,
      term_duration: input.term_duration,
      royalty_amount: input.royalty_amount || 0.00,
      permitted_students_count: input.permitted_students_count || null,
      custom_terms: input.custom_terms || null,
      status: 'requested',
      signed_by_institution_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating course licensing request:', error);
    return { success: false, error: 'Failed to create course licensing request.' };
  }

  return { success: true, agreement: data as CourseLicensingAgreement };
}

export async function updateLicensingAgreement(
  id: string,
  input: UpdateLicensingAgreementInput
): Promise<{ success: boolean; agreement?: CourseLicensingAgreement; error?: string }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.license_type) updateData.license_type = input.license_type;
  if (input.term_duration) updateData.term_duration = input.term_duration;
  if (input.royalty_amount !== undefined) updateData.royalty_amount = input.royalty_amount;
  if (input.permitted_students_count !== undefined) updateData.permitted_students_count = input.permitted_students_count;
  if (input.custom_terms !== undefined) updateData.custom_terms = input.custom_terms;
  if (input.status) updateData.status = input.status;

  const { data, error } = await supabase
    .from('course_licensing_agreements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating licensing agreement:', error);
    return { success: false, error: 'Failed to update licensing agreement.' };
  }

  return { success: true, agreement: data as CourseLicensingAgreement };
}

export async function signLicensingAgreement(
  id: string,
  signerRole: 'scholar' | 'institution'
): Promise<{ success: boolean; agreement?: CourseLicensingAgreement; error?: string }> {
  const supabase = await createClient();
  const existing = await getLicensingAgreementById(id);

  if (!existing) {
    return { success: false, error: 'Agreement not found.' };
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    updated_at: now,
  };

  if (signerRole === 'scholar') {
    updateData.signed_by_scholar_at = now;
    // If institution already signed or requested it, activate the agreement
    if (existing.signed_by_institution_at || existing.status === 'requested') {
      updateData.status = 'active';
    }
  } else {
    updateData.signed_by_institution_at = now;
    if (existing.signed_by_scholar_at) {
      updateData.status = 'active';
    }
  }

  const { data, error } = await supabase
    .from('course_licensing_agreements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error signing licensing agreement:', error);
    return { success: false, error: 'Failed to sign licensing agreement.' };
  }

  return { success: true, agreement: data as CourseLicensingAgreement };
}
