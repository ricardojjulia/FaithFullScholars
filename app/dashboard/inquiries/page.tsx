import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireSignedIn } from '@/lib/auth/guards';
import { fetchScholarInquiriesOrThrow, PortalQueryError } from '@/lib/inquiries/queries';
import { toInboxItems } from '@/lib/inquiries/mappers';
import { ScholarInquiryInbox } from '@/components/inquiries/scholar-inquiry-inbox';
import { DataErrorPanel } from '@/components/portal/data-error-panel';

export const metadata: Metadata = {
  title: 'Institutional Inquiries | Scholar Workspace',
  description: 'Manage incoming teaching, lecturing, and academic outreach opportunities from accredited theological seminaries and colleges.',
};

export const dynamic = 'force-dynamic';

export default async function ScholarInquiriesPage() {
  const supabase = await createClient();
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  const session = await requireSignedIn(supabase);

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Institutional Opportunities & Outreach
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
        Review and respond to structured academic inquiries from seminaries, Bible colleges, and ministry programs.
      </p>
    </div>
  );

  // Inquiries belong to a scholar profile; a signed-in user without one has none.
  if (!session.scholarId) {
    return (
      <div className="space-y-6">
        {header}
        <div
          data-testid="inquiries-onboarding-prompt"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-3"
        >
          <p className="text-sm text-slate-700 dark:text-slate-300">
            You don&rsquo;t have a scholar profile yet, so there are no inquiries to show. Create your profile to
            appear in the directory and receive structured inquiries from institutions.
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

  let items: ReturnType<typeof toInboxItems> | null = null;
  try {
    items = toInboxItems(await fetchScholarInquiriesOrThrow(supabase, session.scholarId));
  } catch (err) {
    console.error('Scholar inbox failed to load (code):', err instanceof PortalQueryError ? err.code : 'unknown');
  }

  return (
    <div className="space-y-6">
      {header}
      {items ? <ScholarInquiryInbox initialInquiries={items} /> : <DataErrorPanel what="your inquiries" />}
    </div>
  );
}
