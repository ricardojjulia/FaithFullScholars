import { PublicNav } from '@/components/shell/public-nav';
import { ScholarDashboardNav } from '@/components/scholar/scholar-dashboard-nav';
import { requireSignedIn } from '@/lib/auth/guards';
import { SessionLookupError } from '@/lib/auth/session';
import { DataErrorPanel } from '@/components/portal/data-error-panel';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // UX redirect for signed-out visitors. Not a security boundary on its own:
  // pages that load data must call a guard themselves (see lib/auth/guards.ts).
  let lookupFailed = false;
  try {
    await requireSignedIn();
  } catch (err) {
    // redirect()/notFound() also throw; only a failed session lookup is handled here.
    if (!(err instanceof SessionLookupError)) throw err;
    lookupFailed = true;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Universal Top Application Bar */}
      <div className="print:hidden">
        <PublicNav />
        <ScholarDashboardNav />
      </div>

      <main className="flex-1 py-8 px-4 sm:px-6 print:p-0 print:m-0">
        <div className="max-w-7xl mx-auto print:max-w-none print:w-full">{lookupFailed ? <DataErrorPanel what="your workspace" /> : children}</div>
      </main>
    </div>
  );
}
