import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';
import { CreateInquiryInput, InquiryStatus, Institution } from '@/lib/domain/types';
import {
  notifyScholarOfNewInquiry,
  notifyInstitutionOfInquiryResponse,
} from '@/lib/notifications/email-service';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** HTTP status the API layer should use for a failure (default 400). */
  status?: number;
  /** Seconds until a rate-limited caller may retry (sent as Retry-After). */
  retryAfterSeconds?: number;
}

/** SQLSTATE raised by the database inquiry-rate guard (ADR 0026). */
export const INQUIRY_RATE_LIMIT_SQLSTATE = 'FS429';
export const INQUIRY_RATE_LIMIT_MESSAGE =
  'Your institution has reached its limit of 10 inquiries per hour. The limit is shared by everyone at your institution; please try again later.';

/**
 * Seconds until the oldest counted inquiry leaves the one-hour window (that is
 * when the next slot opens). Read with the caller's own client, so RLS applies:
 * members can see their institution's inquiries. Advisory only; any failure
 * falls back to the full window.
 */
async function inquiryRetryAfterSeconds(supabase: SupabaseClient, institutionId: string): Promise<number> {
  const WINDOW_MS = 3600 * 1000;
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select('created_at')
      .eq('institution_id', institutionId)
      .gt('created_at', new Date(Date.now() - WINDOW_MS).toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    const oldest = data?.created_at ? new Date(data.created_at).getTime() : NaN;
    if (!error && Number.isFinite(oldest)) {
      return Math.min(3600, Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000)));
    }
  } catch {
    // fall through to the conservative default
  }
  return 3600;
}

/**
 * Validates email format.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const INQUIRY_STATUSES: readonly InquiryStatus[] = ['pending', 'read', 'accepted', 'declined', 'archived'];

/**
 * Submits a new structured institutional inquiry.
 *
 * `supabase` must be the caller's user-scoped client so RLS enforces that the
 * sender belongs to `input.institution_id`; `senderAccountId` must come from the
 * verified session, never from the request body.
 */
export async function sendInquiry(
  supabase: SupabaseClient,
  input: CreateInquiryInput,
  senderAccountId: string
): Promise<ActionResult<{ inquiryId: string }>> {
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

  // 2. The hourly inquiry cap (10 per institution) is enforced by the database
  //    guard on INSERT (ADR 0026), so it also covers direct API writes.

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
    .select('id, full_name, profile_status, account_id')
    .eq('id', input.scholar_id)
    .single();

  if (scholarError || !scholar) {
    return { success: false, error: 'Scholar not found.' };
  }

  if (scholar.profile_status !== 'approved') {
    return { success: false, error: 'Scholars in draft or review cannot receive public inquiries.' };
  }

  if (!senderAccountId) {
    return { success: false, error: 'Authentication required.' };
  }

  // 6. Insert Inquiry
  const { data: newInquiry, error: insertError } = await supabase
    .from('inquiries')
    .insert({
      institution_id: input.institution_id,
      scholar_id: input.scholar_id,
      course_id: input.course_id || null,
      sender_account_id: senderAccountId,
      opportunity_type: input.opportunity_type,
      proposed_term: input.proposed_term || null,
      delivery_mode: input.delivery_mode || null,
      message: input.message.trim(),
      contact_email: input.contact_email.trim(),
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError?.code === INQUIRY_RATE_LIMIT_SQLSTATE) {
    return {
      success: false,
      error: INQUIRY_RATE_LIMIT_MESSAGE,
      status: 429,
      retryAfterSeconds: await inquiryRetryAfterSeconds(supabase, input.institution_id),
    };
  }

  if (insertError || !newInquiry) {
    console.error('Error inserting inquiry (code):', insertError?.code ?? 'no-data');
    return { success: false, error: 'Unable to dispatch inquiry at this time. Please try again later.' };
  }

  // 7. Dispatch Notification. The scholar's private email is read server-side with
  // the service role (RLS correctly hides it from institutions) and never returned.
  const { data: scholarAccount } = await createAdminClient()
    .from('accounts')
    .select('email')
    .eq('id', scholar.account_id)
    .maybeSingle();

  if (!scholarAccount?.email) {
    console.error('Inquiry stored but scholar email is missing; notification skipped');
    return { success: true, data: { inquiryId: newInquiry.id } };
  }

  await notifyScholarOfNewInquiry({
    scholarEmail: scholarAccount.email,
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
 *
 * RLS limits visibility/updates to the inquiry's participants. Accepting or
 * declining is additionally reserved to the recipient scholar
 * (`actingScholarId`, resolved from the verified session).
 */
export async function respondToInquiry(
  supabase: SupabaseClient,
  inquiryId: string,
  status: InquiryStatus,
  responseNotes: string | null | undefined,
  actingScholarId: string | null
): Promise<ActionResult> {
  if (!INQUIRY_STATUSES.includes(status)) {
    return { success: false, error: 'Invalid inquiry status.' };
  }

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

  if ((status === 'accepted' || status === 'declined') && inquiry.scholar_id !== actingScholarId) {
    return { success: false, error: 'Only the recipient scholar can accept or decline an inquiry.' };
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
    console.error('Error updating inquiry status (code):', updateError.code);
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
  supabase: SupabaseClient,
  institutionId: string,
  scholarId: string,
  notes?: string | null
): Promise<ActionResult<{ saved: boolean }>> {

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
      console.error('Error removing scholar from shortlist (code):', deleteError.code);
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
    console.error('Error adding scholar to shortlist (code):', insertError.code);
    return { success: false, error: 'Failed to add scholar to shortlist.' };
  }

  return { success: true, data: { saved: true } };
}

/**
 * Toggles a course bookmark for an institution.
 */
export async function toggleSaveCourse(
  supabase: SupabaseClient,
  institutionId: string,
  courseId: string,
  notes?: string | null
): Promise<ActionResult<{ saved: boolean }>> {

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
      console.error('Error removing course from saved list (code):', deleteError.code);
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
    console.error('Error saving course (code):', insertError.code);
    return { success: false, error: 'Failed to save course.' };
  }

  return { success: true, data: { saved: true } };
}

/**
 * Updates institutional profile settings.
 */
export async function updateInstitutionProfile(
  supabase: SupabaseClient,
  institutionId: string,
  updates: Partial<Institution>
): Promise<ActionResult> {

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
    console.error('Error updating institution profile (code):', error.code);
    return { success: false, error: 'Failed to update institutional profile.' };
  }

  return { success: true };
}
