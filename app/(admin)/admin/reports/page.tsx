import React from 'react';
import Link from 'next/link';
import { fetchContentReports } from '@/lib/admin/queries';
import { ReportStatus } from '@/lib/domain/types';
import { Flag } from 'lucide-react';
import { ReportActionButtons } from './report-action-buttons';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentFilter = (searchParams.status as ReportStatus | 'all') || 'all';

  const reports = await fetchContentReports(currentFilter);

  const TABS: Array<{ label: string; value: ReportStatus | 'all' }> = [
    { label: 'All Reports', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Investigating', value: 'investigating' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Dismissed', value: 'dismissed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Flag className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            <span>Reported Content & Trust Moderation</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Investigate community flags concerning doctrinal misrepresentation, copyright infringement, or inappropriate content.
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {reports.length} Report{reports.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = currentFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/admin/reports?status=${tab.value}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-3xl block mb-2">🛡️</span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No active reports
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Community moderation flags will appear here for administrative investigation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Target: {rep.target_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {rep.target_id.slice(0, 8)}...
                  </span>
                  <ReportStatusBadge status={rep.status} />
                </div>

                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Reason: &ldquo;{rep.reason}&rdquo;
                </p>

                {rep.admin_notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Moderator Note: {rep.admin_notes}
                  </p>
                )}

                <div className="text-[10px] text-slate-400">
                  Reported: {new Date(rep.created_at).toLocaleString()}
                </div>
              </div>

              <ReportActionButtons reportId={rep.id} currentStatus={rep.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    pending: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300',
    investigating: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    dismissed: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}
