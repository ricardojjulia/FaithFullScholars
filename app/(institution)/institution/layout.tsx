import React from 'react';
import { InstitutionNav } from '@/components/institution/institution-nav';
import { AccessRestricted } from '@/components/shell/access-restricted';
import { getSessionContext } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();

  if (!session || session.institutionIds.length === 0) {
    return (
      <AccessRestricted
        title="Institution Portal"
        message={
          session
            ? 'Your account is not linked to an institution.'
            : 'Please sign in with an institution account to use the portal.'
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <InstitutionNav />
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
