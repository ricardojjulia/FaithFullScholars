'use client';

import { CheckCircle2, FileEdit, Hourglass, MessageSquare, XCircle, Loader2 } from 'lucide-react';
import type { RevisionStatus } from '@/lib/domain/types';

interface RevisionStatusBannerProps {
  /** Status of the scholar's current revision, or null when there is none. */
  status: RevisionStatus | null;
  adminNotes?: string | null;
  /** True once the scholar's profile is live (shows a subtle "Published" note when there is no open revision). */
  isPublished?: boolean;
  /** True when moderators have hidden the profile from public discovery. */
  isHidden?: boolean;
  isBusy?: boolean;
  onWithdraw?: () => void;
  onStartNewDraft?: () => void;
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';

export function RevisionStatusBanner({
  status,
  adminNotes = null,
  isPublished = false,
  isHidden = false,
  isBusy = false,
  onWithdraw,
  onStartNewDraft
}: RevisionStatusBannerProps) {
  let tone = 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200';
  let Icon = FileEdit;
  let title: string | null = null;
  let detail: string | null = null;
  let notesLabel: string | null = null;
  let action: React.ReactNode = null;

  switch (status) {
    case 'draft':
      title = 'Draft — not yet submitted';
      detail = 'Your changes are saved privately. Submit them for review when you are ready.';
      break;
    case 'submitted':
      tone = 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-200';
      Icon = Hourglass;
      title = 'Awaiting review';
      detail = 'This revision is locked while an admin reviews it. Withdraw it to make further edits.';
      action = onWithdraw ? (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={isBusy}
          className={`px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 ${focusRing}`}
        >
          {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
          <span>Withdraw</span>
        </button>
      ) : null;
      break;
    case 'changes_requested':
      tone = 'bg-amber-50 border-amber-300 text-amber-950 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200';
      Icon = MessageSquare;
      title = 'Changes requested';
      detail = 'A reviewer asked for changes. Edit your draft and submit it again.';
      notesLabel = 'Reviewer feedback';
      break;
    case 'rejected':
      tone = 'bg-rose-50 border-rose-300 text-rose-950 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200';
      Icon = XCircle;
      title = 'Revision rejected';
      detail = 'This revision was not approved. Your published profile is unchanged. Your next save starts a new draft.';
      notesLabel = 'Reason';
      action = onStartNewDraft ? (
        <button
          type="button"
          onClick={onStartNewDraft}
          disabled={isBusy}
          className={`px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 ${focusRing}`}
        >
          Start a new draft
        </button>
      ) : null;
      break;
    case 'approved':
      tone = 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300';
      Icon = CheckCircle2;
      title = 'Approved — your latest revision is published';
      detail = isHidden
        ? 'Your latest revision is approved, but your profile is currently hidden by moderators.'
        : 'Your profile is live. Edits are staged as a new draft until approved.';
      break;
    default:
      if (isPublished) {
        tone = 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300';
        Icon = CheckCircle2;
        title = 'Published';
        detail = 'Your profile is live. Edits are staged as a new draft until approved.';
      }
  }

  // The live region stays mounted so status changes are announced.
  return (
    <div role="status" aria-live="polite" data-testid="revision-status-banner">
      {title && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${tone}`}>
          <div className="flex items-start gap-2.5">
            <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-xs font-bold">{title}</p>
              {detail && <p className="text-[11px] opacity-90">{detail}</p>}
              {notesLabel && adminNotes && (
                <p className="text-[11px]">
                  <span className="font-semibold">{notesLabel}: </span>
                  <span className="whitespace-pre-wrap">{adminNotes}</span>
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </div>
  );
}
