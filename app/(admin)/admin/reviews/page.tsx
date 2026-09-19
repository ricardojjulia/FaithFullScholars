import React from 'react';
import Link from 'next/link';
import { fetchPendingRevisions } from '@/lib/admin/queries';
import { RevisionStatus } from '@/lib/domain/types';
import { ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentFilter = (searchParams.status as RevisionStatus | 'all') || 'all';

  const revisions = await fetchPendingRevisions(currentFilter);

  const TABS: Array<{ label: string; value: RevisionStatus | 'all' }> = [
    { label: 'All Revisions', value: 'all' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Changes Requested', value: 'changes_requested' },
    { label: 'Approved', value: 'approved' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Profile Revision Review Queue</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Moderate scholar profile submissions and stage revision diffs prior to public publication (ADR 0003 & ADR 0005).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {revisions.length} Revision{revisions.length === 1 ? '' : 's'} Listed
          </span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = currentFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/admin/reviews?status=${tab.value}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Review Queue Table / List */}
      {revisions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-3xl block mb-2">🎉</span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Queue is clear
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            No profile revisions match the selected status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {revisions.map((rev) => (
            <div
              key={rev.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {rev.scholar_name}
                  </span>
                  <span className="text-xs text-slate-500">
                    (Rev #{rev.revision_number})
                  </span>
                  <StatusBadge status={rev.status} />
                  {rev.has_published_baseline ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Has Active Baseline
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                      Initial Onboarding
                    </span>
                  )}
                </div>

                {rev.change_summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                    {rev.change_summary}
                  </p>
                )}

                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-3">
                  <span>
                    Submitted: {rev.submitted_at ? new Date(rev.submitted_at).toLocaleDateString() : 'Draft stage'}
                  </span>
                  {rev.reviewed_at && (
                    <span>
                      Last Reviewed: {new Date(rev.reviewed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {rev.scholar_slug && (
                  <Link
                    href={`/scholars/${rev.scholar_slug}`}
                    target="_blank"
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="View public live profile"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}

                <Link
                  href={`/admin/reviews/${rev.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  <span>Inspect Diff & Review</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RevisionStatus }) {
  const styles: Record<RevisionStatus, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    submitted: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
    changes_requested: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    superseded: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  };

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
