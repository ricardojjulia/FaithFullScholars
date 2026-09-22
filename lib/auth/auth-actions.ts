'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyCaptchaToken } from './captcha';
import {
  AuthActionResult,
  ScholarSignupInput,
  InstitutionSignupInput,
} from './types';
import { redirect } from 'next/navigation';

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

  // Upsert account record
  await adminDb.from('accounts').upsert({
    id: userId,
    email,
    role: 'scholar',
  });

  // Create initial draft scholar profile record
  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + userId.slice(0, 4);

  await adminDb.from('scholars').upsert({
    account_id: userId,
    full_name: fullName,
    preferred_title: preferredTitle || 'Professor',
    slug,
    profile_status: 'draft',
    primary_institution: 'Independent Scholar',
  });

  return { success: true, redirectUrl: '/dashboard/onboarding' };
}

export async function signupInstitution(input: InstitutionSignupInput): Promise<AuthActionResult> {
  const { email, password, fullName, institutionName, roleTitle, captchaToken } = input;

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

  // Upsert account record
  await adminDb.from('accounts').upsert({
    id: userId,
    email,
    role: 'institution_user',
  });

  // Find or create institution
  const instSlug = institutionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  let { data: institution } = await adminDb
    .from('institutions')
    .select('id')
    .eq('slug', instSlug)
    .maybeSingle();

  if (!institution) {
    const { data: newInst } = await adminDb
      .from('institutions')
      .insert({
        name: institutionName,
        slug: instSlug,
        status: 'pending',
        type: 'theological_seminary',
      })
      .select()
      .single();
    institution = newInst;
  }

  if (institution) {
    // Link user to institution
    await adminDb.from('institution_users').upsert({
      institution_id: institution.id,
      account_id: userId,
      role: roleTitle || 'Administrator',
    });

    // Initialize default basic subscription
    await adminDb.from('institution_subscriptions').upsert({
      institution_id: institution.id,
      tier: 'basic',
      seats_limit: 1,
      monthly_inquiry_limit: 5,
    });
  }

  return { success: true, redirectUrl: '/institution' };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
