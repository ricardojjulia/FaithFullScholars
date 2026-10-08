import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireInstitutionMember } from '@/lib/auth/guards';
import {
  fetchInstitutionProfileForEdit,
  PortalQueryError,
  type InstitutionEditableProfile,
} from '@/lib/inquiries/queries';
import { InstitutionProfileForm } from '@/components/institution/institution-profile-form';
import { DataErrorPanel } from '@/components/portal/data-error-panel';

export const metadata: Metadata = {
  title: 'Institution Profile | Institution Portal',
  description: 'Manage your institution’s identity and contact details.',
};

export const dynamic = 'force-dynamic';

export default async function InstitutionProfilePage() {
  const supabase = await createClient();
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  // The institution is resolved from the session, never from the request.
  const { institutionId } = await requireInstitutionMember(supabase);

  let profile: InstitutionEditableProfile | null = null;
  let loadFailed = false;
  try {
    profile = await fetchInstitutionProfileForEdit(supabase, institutionId);
  } catch (err) {
    console.error('Institution profile failed to load (code):', err instanceof PortalQueryError ? err.code : 'unknown');
    loadFailed = true;
  }

  if (loadFailed || !profile) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Institution Profile &amp; Verification</h1>
        <DataErrorPanel what="your institution profile" />
      </div>
    );
  }

  return <InstitutionProfileForm profile={profile} />;
}
