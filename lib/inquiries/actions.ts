import { createAdminClient } from '@/lib/supabase/server';
import { CreateInquiryInput, InquiryStatus, Institution } from '@/lib/domain/types';
import { checkInquiryRateLimit, recordInquirySent } from '@/lib/inquiries/rate-limiter';
import {
  notifyScholarOfNewInquiry,
  notifyInstitutionOfInquiryResponse,
} from '@/lib/notifications/email-service';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates email format.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Submits a new structured institutional inquiry.
 */
export async function sendInquiry(
  input: CreateInquiryInput,
  senderAccountId?: string
): Promise<ActionResult<{ inquiryId: string }>> {
  const supabase = createAdminClient();

  // 1. Validate fields
  if (!input.institution_id || !input.scholar_id) {
    return { success: false, error: 'Institution ID and Scholar ID are required.' };
  }

  if (!input.message || input.message.trim().length < 20) {
    return { success: false, error: 'Inquiry message must be at least 20 characters.' };
  }

  if (input.message.length > 5000) {
    return { success: false, error: 'Inquiry message must not exceed 5000 characters.' };
  }

  if (!input.contact_email || !isValidEmail(input.contact_email)) {
    return { success: false, error: 'A valid institutional contact email is required.' };
  }

  // 2. Rate limit verification (ADR 0008)
  const rateLimit = checkInquiryRateLimit(input.institution_id);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Inquiry rate limit exceeded. Verified institutions can send up to 10 inquiries per hour.',
    };
  }

  // 3. Verify Institution Approval Status
  const { data: institution, error: instError } = await supabase
    .from('institutions')
    .select('id, name, status, contact_email')
    .eq('id', input.institution_id)
    .single();

  if (instError || !institution) {
    return { success: false, error: 'Institution not found.' };
  }

  if (institution.status !== 'approved') {
    return {
      success: false,
      error: 'Only verified and approved institutions may initiate outreach to scholars.',
    };
  }

  // 4. Verify Scholar Profile
  const { data: scholar, error: scholarError } = await supabase
    .from('scholars')
    .select('id, full_name, profile_status, account_id, accounts(email)')
    .eq('id', input.scholar_id)
    .single();

  if (scholarError || !scholar) {
    return { success: false, error: 'Scholar not found.' };
  }

  if (scholar.profile_status !== 'approved') {
    return { success: false, error: 'Scholars in draft or review cannot receive public inquiries.' };
  }

  // 5. Determine Sender Account ID
  let resolvedSenderAccountId = senderAccountId;
  if (!resolvedSenderAccountId) {
    // Lookup the institution's primary contact account
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('account_id')
      .eq('institution_id', input.institution_id)
      .limit(1)
      .maybeSingle();

    resolvedSenderAccountId = instUser?.account_id;
  }

  if (!resolvedSenderAccountId) {
    // Fallback: look for scholar account or first account
    const { data: firstAccount } = await supabase
      .from('accounts')
      .select('id')
      .limit(1)
      .single();
    resolvedSenderAccountId = firstAccount?.id;
  }

  if (!resolvedSenderAccountId) {
    return { success: false, error: 'Could not resolve sender account.' };
  }

  // 6. Insert Inquiry
  const { data: newInquiry, error: insertError } = await supabase
    .from('inquiries')
    .insert({
      institution_id: input.institution_id,
      scholar_id: input.scholar_id,
      course_id: input.course_id || null,
      sender_account_id: resolvedSenderAccountId,
      opportunity_type: input.opportunity_type,
      proposed_term: input.proposed_term || null,
      delivery_mode: input.delivery_mode || null,
      message: input.message.trim(),
      contact_email: input.contact_email.trim(),
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !newInquiry) {
    console.error('Error inserting inquiry:', insertError);
    return { success: false, error: 'Unable to dispatch inquiry at this time. Please try again later.' };
  }

  // Record rate limit consumption
  recordInquirySent(input.institution_id);

  // 7. Dispatch Notification
  const scholarEmail = (scholar.accounts as { email?: string } | null)?.email || 'scholar@faithfullscholars.org';
  await notifyScholarOfNewInquiry({
    scholarEmail,
    scholarName: scholar.full_name,
    institutionName: institution.name,
    opportunityType: input.opportunity_type,
    messagePreview: input.message,
    inquiryId: newInquiry.id,
  });

  return {
    success: true,
    data: { inquiryId: newInquiry.id },
  };
}

/**
 * Updates an inquiry's status (Accept, Decline, Read, Archive).
 */
export async function respondToInquiry(
  inquiryId: string,
  status: InquiryStatus,
  responseNotes?: string | null
): Promise<ActionResult> {
  const supabase = createAdminClient();

  // 1. Fetch inquiry with scholar and institution data
  const { data: inquiry, error: fetchError } = await supabase
    .from('inquiries')
    .select(`
      id,
      status,
      contact_email,
      institution_id,
      scholar_id,
      institutions!inquiries_institution_id_fkey(name),
      scholars!inquiries_scholar_id_fkey(full_name)
    `)
    .eq('id', inquiryId)
    .single();

  if (fetchError || !inquiry) {
    return { success: false, error: 'Inquiry not found.' };
  }

  // 2. Update status
  const { error: updateError } = await supabase
    .from('inquiries')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inquiryId);

  if (updateError) {
    console.error('Error updating inquiry status:', updateError);
    return { success: false, error: 'Failed to update inquiry status.' };
  }

  // 3. Dispatch notification if responded (accepted / declined)
  if (status === 'accepted' || status === 'declined') {
    const institutionName = (inquiry.institutions as { name?: string } | null)?.name || 'Academic Institution';
    const scholarName = (inquiry.scholars as { full_name?: string } | null)?.full_name || 'The Scholar';

    await notifyInstitutionOfInquiryResponse({
      institutionEmail: inquiry.contact_email,
      institutionName,
      scholarName,
      status,
      responseNotes,
      inquiryId,
    });
  }

  return { success: true };
}

/**
 * Toggles a scholar on an institution's shortlist.
 */
export async function toggleSaveScholar(
  institutionId: string,
  scholarId: string,
  notes?: string | null
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = createAdminClient();

  // Check if exists
  const { data: existing } = await supabase
    .from('saved_scholars')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('scholar_id', scholarId)
    .maybeSingle();

  if (existing) {
    const { error: deleteError } = await supabase
      .from('saved_scholars')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      console.error('Error removing scholar from shortlist:', deleteError);
      return { success: false, error: 'Failed to remove scholar from shortlist.' };
    }
    return { success: true, data: { saved: false } };
  }

  // Insert
  const { error: insertError } = await supabase
    .from('saved_scholars')
    .insert({
      institution_id: institutionId,
      scholar_id: scholarId,
      notes: notes || null,
    });

  if (insertError) {
    console.error('Error adding scholar to shortlist:', insertError);
    return { success: false, error: 'Failed to add scholar to shortlist.' };
  }

  return { success: true, data: { saved: true } };
}

/**
 * Toggles a course bookmark for an institution.
 */
export async function toggleSaveCourse(
  institutionId: string,
  courseId: string,
  notes?: string | null
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('saved_courses')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existing) {
    const { error: deleteError } = await supabase
      .from('saved_courses')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      console.error('Error removing course from saved list:', deleteError);
      return { success: false, error: 'Failed to remove course from saved list.' };
    }
    return { success: true, data: { saved: false } };
  }

  const { error: insertError } = await supabase
    .from('saved_courses')
    .insert({
      institution_id: institutionId,
      course_id: courseId,
      notes: notes || null,
    });

  if (insertError) {
    console.error('Error saving course:', insertError);
    return { success: false, error: 'Failed to save course.' };
  }

  return { success: true, data: { saved: true } };
}

/**
 * Updates institutional profile settings.
 */
export async function updateInstitutionProfile(
  institutionId: string,
  updates: Partial<Institution>
): Promise<ActionResult> {
  const supabase = createAdminClient();

  const allowedUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name.trim();
  if (updates.website !== undefined) allowedUpdates.website = updates.website?.trim() || null;
  if (updates.location !== undefined) allowedUpdates.location = updates.location?.trim() || null;
  if (updates.contact_email !== undefined) allowedUpdates.contact_email = updates.contact_email.trim();
  if (updates.institution_type !== undefined) allowedUpdates.institution_type = updates.institution_type;

  allowedUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('institutions')
    .update(allowedUpdates)
    .eq('id', institutionId);

  if (error) {
    console.error('Error updating institution profile:', error);
    return { success: false, error: 'Failed to update institutional profile.' };
  }

  return { success: true };
}
