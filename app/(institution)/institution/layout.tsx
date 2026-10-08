import React from 'react';
import { PublicNav } from '@/components/shell/public-nav';
import { InstitutionNav } from '@/components/institution/institution-nav';
import { DataErrorPanel } from '@/components/portal/data-error-panel';
import { requireInstitutionMember } from '@/lib/auth/guards';
import { SessionLookupError } from '@/lib/auth/session';
import { fetchInstitutionStatus } from '@/lib/inquiries/queries';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function InstitutionLayout({ children }: { children: React.ReactNode }) {
  // UX redirect for signed-out visitors. Not a security boundary on its own:
  // pages that load data must call a guard themselves (see lib/auth/guards.ts).
  const supabase = await createClient();
  let member: Awaited<ReturnType<typeof requireInstitutionMember>> | null = null;
  try {
    member = await requireInstitutionMember(supabase);
  } catch (err) {
    // redirect()/notFound() also throw; only a failed session lookup is handled here.
    if (!(err instanceof SessionLookupError)) throw err;
  }

  // The nav badge reflects the real institutions.status, read with the user's own client.
  const status = member ? await fetchInstitutionStatus(supabase, member.institutionId) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="print:hidden">
        <PublicNav />
        {member && <InstitutionNav showConferences={member.session.role === 'admin'} verificationStatus={status} />}
      </div>
      <main className="flex-1 py-8 px-4 sm:px-6 print:p-0 print:m-0">
        <div className="max-w-7xl mx-auto print:max-w-none print:w-full">
          {member ? children : <DataErrorPanel what="your institution portal" />}
        </div>
      </main>
    </div>
  );
}
