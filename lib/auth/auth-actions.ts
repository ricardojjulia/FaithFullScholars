'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyCaptchaToken } from './captcha';
import {
  AuthActionResult,
  ScholarSignupInput,
  InstitutionSignupInput,
} from './types';
import { redirect } from 'next/navigation';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Removes a half-created signup so a failed registration never leaves an orphaned
 * login (which would block a retry with "email already registered") or tell the
 * user it succeeded. Rows referencing the auth user cascade on delete.
 */
async function rollBackSignup(
  adminDb: ReturnType<typeof createAdminClient>,
  userId: string,
  institutionId?: string
): Promise<void> {
  if (institutionId) {
    const { error } = await adminDb.from('institutions').delete().eq('id', institutionId);
    if (error) console.error('Signup rollback: failed to remove institution:', error);
  }
  const { error } = await adminDb.auth.admin.deleteUser(userId);
  if (error) console.error('Signup rollback: failed to remove auth user:', error);
}

export async function loginWithPassword(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { success: false, error: error?.message || 'Invalid email or password.' };
  }

  // Determine user role and appropriate workspace redirect
  const userId = data.user.id;

  // Check if admin
  const { data: adminAccount } = await supabase
    .from('accounts')
    .select('role')
    .eq('id', userId)
    .single();

  if (adminAccount?.role === 'admin') {
    redirect('/admin/reviews');
  }

  // Check if institution user
  const { data: instUser } = await supabase
    .from('institution_users')
    .select('institution_id')
    .eq('account_id', userId)
    .maybeSingle();

  if (instUser) {
    redirect('/institution');
  }

  // Otherwise default to scholar dashboard
  redirect('/dashboard');
}

export async function signupScholar(input: ScholarSignupInput): Promise<AuthActionResult> {
  const { email, password, fullName, preferredTitle, captchaToken } = input;

  if (!email || !password || !fullName) {
    return { success: false, error: 'Name, email, and password are required.' };
  }
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  // Verify CAPTCHA challenge
  const captchaResult = await verifyCaptchaToken(captchaToken);
  if (!captchaResult.success) {
    return { success: false, error: captchaResult.error || 'CAPTCHA verification failed.' };
  }

  const supabase = await createClient();

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'scholar',
      },
    },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'Unable to register account.' };
  }

  const userId = authData.user.id;
  const adminDb = createAdminClient();

  // Insert (never upsert): an existing accounts row must not have its role rewritten.
  const { error: accountError } = await adminDb.from('accounts').insert({
    id: userId,
    email,
    role: 'scholar',
  });

  if (accountError) {
    console.error('Scholar signup: failed to create account:', accountError);
    await rollBackSignup(adminDb, userId);
    return { success: false, error: 'Unable to register account. Please try again later.' };
  }

  // Create initial draft scholar profile record
  const slug = `${slugify(fullName) || 'scholar'}-${userId.slice(0, 4)}`;

  const { error: scholarError } = await adminDb.from('scholars').insert({
    account_id: userId,
    full_name: fullName,
    title: preferredTitle || 'Professor',
    slug,
    profile_status: 'draft',
    current_institution: 'Independent Scholar',
  });

  if (scholarError) {
    console.error('Scholar signup: failed to create scholar profile:', scholarError);
    await rollBackSignup(adminDb, userId);
    return { success: false, error: 'Unable to register account. Please try again later.' };
  }

  return { success: true, redirectUrl: '/dashboard/onboarding' };
}

export async function signupInstitution(input: InstitutionSignupInput): Promise<AuthActionResult> {
  const { email, password, fullName, institutionName, captchaToken } = input;

  if (!email || !password || !fullName || !institutionName) {
    return { success: false, error: 'Full name, institutional email, institution name, and password are required.' };
  }
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  // Verify CAPTCHA challenge
  const captchaResult = await verifyCaptchaToken(captchaToken);
  if (!captchaResult.success) {
    return { success: false, error: captchaResult.error || 'CAPTCHA verification failed.' };
  }

  // Self-signup may only CREATE a new, pending institution. It must never join an
  // existing one: matching by name previously let anyone become a member (or
  // owner, via the free-text role title) of an already-approved institution.
  // Joining an existing institution requires an invitation from its owner.
  // Checked before auth.signUp so a rejected signup leaves no orphaned login.
  const instSlug = slugify(institutionName);
  if (!instSlug) {
    return { success: false, error: 'Please enter a valid institution name.' };
  }

  const { data: existingInstitution } = await createAdminClient()
    .from('institutions')
    .select('id')
    .eq('slug', instSlug)
    .maybeSingle();

  if (existingInstitution) {
    return {
      success: false,
      error:
        // No invitation flow exists yet (Council Review 12, C-2): don't promise one.
        'An account for this institution already exists. Adding colleagues to an existing institution is not available yet — please contact the FaithFull Scholars team.',
    };
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'institution_user',
        institution_name: institutionName,
      },
    },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'Unable to register institution account.' };
  }

  const userId = authData.user.id;
  const adminDb = createAdminClient();

  // Insert (never upsert): an existing accounts row must not have its role rewritten.
  const { error: accountError } = await adminDb.from('accounts').insert({
    id: userId,
    email,
    role: 'institution_user',
  });

  if (accountError) {
    console.error('Institution signup: failed to create account:', accountError);
    await rollBackSignup(adminDb, userId);
    return { success: false, error: 'Unable to register institution. Please try again later.' };
  }

  const { data: institution, error: institutionError } = await adminDb
    .from('institutions')
    .insert({
      name: institutionName,
      slug: instSlug,
      status: 'pending',
      institution_type: 'other',
      contact_email: email,
    })
    .select('id')
    .single();

  if (institutionError || !institution) {
    // Includes losing a same-slug race to a concurrent signup (slug is UNIQUE).
    console.error('Institution signup: failed to create institution:', institutionError);
    await rollBackSignup(adminDb, userId);
    return { success: false, error: 'Unable to register institution. Please try again later.' };
  }

  // The creator owns the new (pending, admin-unverified) institution. `roleTitle` is a
  // job title for display, never a membership role.
  const { error: membershipError } = await adminDb.from('institution_users').insert({
    institution_id: institution.id,
    account_id: userId,
    role: 'owner',
  });

  if (membershipError) {
    console.error('Institution signup: failed to link owner:', membershipError);
    await rollBackSignup(adminDb, userId, institution.id);
    return { success: false, error: 'Unable to register institution. Please try again later.' };
  }

  // Initialize default basic subscription
  await adminDb.from('institution_subscriptions').upsert({
    institution_id: institution.id,
    tier: 'basic',
    seats_limit: 1,
    monthly_inquiry_limit: 5,
  });

  return { success: true, redirectUrl: '/institution' };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
