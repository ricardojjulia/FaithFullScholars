import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireSignedIn } from '@/lib/auth/guards';
import { PortalQueryError } from '@/lib/inquiries/queries';
import { fetchMyApplicationsOrThrow, type MyApplication } from '@/lib/postings/my-applications';
import { MyApplicationsList } from '@/components/scholar/my-applications-list';
import { DataErrorPanel } from '@/components/portal/data-error-panel';

export const metadata: Metadata = {
  title: 'My applications | Scholar Workspace',
  description: 'Track the faculty positions you have applied for and withdraw an application.',
};

export const dynamic = 'force-dynamic';

export default async function ScholarApplicationsPage() {
  const supabase = await createClient();
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  const session = await requireSignedIn(supabase);

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My applications</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
        Track the faculty positions you have applied for. You can withdraw an application until it is declined.
      </p>
    </div>
  );

  // Applications belong to a scholar profile; a signed-in user without one has none.
  if (!session.scholarId) {
    return (
      <div className="space-y-6">
        {header}
        <div
          data-testid="applications-onboarding-prompt"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-3"
        >
          <p className="text-sm text-slate-700 dark:text-slate-300">
            You don&rsquo;t have a scholar profile yet, so you have no applications. Create your profile to apply for
            faculty positions.
          </p>
          <Link
            href="/dashboard/onboarding"
            className="inline-flex px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            Start your profile
          </Link>
        </div>
      </div>
    );
  }

  let applications: MyApplication[] | null = null;
  try {
    applications = await fetchMyApplicationsOrThrow(supabase, session.scholarId);
  } catch (err) {
    console.error('My applications failed to load (code):', err instanceof PortalQueryError ? err.code : 'unknown');
  }

  return (
    <div className="space-y-6">
      {header}
      {applications ? <MyApplicationsList applications={applications} /> : <DataErrorPanel what="your applications" />}
    </div>
  );
}
