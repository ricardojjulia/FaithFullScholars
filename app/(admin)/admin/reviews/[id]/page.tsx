import React from 'react';
import { requireStaffPage } from '@/lib/auth/guards';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchRevisionWithBaseline, fetchReviewAuditHistory } from '@/lib/admin/queries';
import { RevisionDiffViewer } from '@/components/admin/revision-diff-viewer';
import { ReviewActionPanel } from '@/components/admin/review-action-panel';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReviewDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  await requireStaffPage();

  const params = await props.params;
  const detail = await fetchRevisionWithBaseline(params.id);

  if (!detail) {
    notFound();
  }

  const auditHistory = await fetchReviewAuditHistory(detail.scholar.id);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/admin/reviews"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Revision Queue</span>
        </Link>

        {detail.scholar.slug && (
          <Link
            href={`/scholars/${detail.scholar.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span>Inspect Live Canonical Profile</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Main Review Workspace: Side-by-Side Diff + Action Decision Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Visual Diff Inspector */}
        <div className="xl:col-span-2 space-y-6">
          <RevisionDiffViewer
            publishedSnapshot={detail.baselineSnapshot}
            submittedSnapshot={detail.submittedSnapshot}
            diff={detail.diff}
          />
        </div>

        {/* Right 1 Column: Sticky Decision Action Panel & Audit Log */}
        <div className="xl:col-span-1 sticky top-8">
          <ReviewActionPanel
            revisionId={detail.revision.id}
            scholarId={detail.scholar.id}
            currentStatus={detail.revision.status}
            auditHistory={auditHistory}
          />
        </div>
      </div>
    </div>
  );
}
