'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReviewAction, ProfileReview } from '@/lib/domain/types';
import { CheckCircle2, MessageSquare, XCircle, EyeOff, Loader2 } from 'lucide-react';

interface ReviewActionPanelProps {
  revisionId: string;
  scholarId: string;
  currentStatus: string;
  auditHistory: ProfileReview[];
}

const ACTION_LABELS: Record<ReviewAction, string> = {
  approve: 'Approval',
  request_changes: 'Change request',
  reject: 'Rejection',
  hide: 'Hide',
};

export function ReviewActionPanel({
  revisionId,
  currentStatus,
  auditHistory,
}: ReviewActionPanelProps) {
  const router = useRouter();
  const isSubmitted = currentStatus === 'submitted';
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [loadingAction, setLoadingAction] = useState<ReviewAction | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Once a decision is recorded the panel stays locked until the redirect.
  const [decided, setDecided] = useState(false);
  const busy = loadingAction !== null || decided;

  async function handleAction(action: ReviewAction) {
    if ((action === 'request_changes' || action === 'reject') && !feedbackNotes.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Add feedback notes so the scholar knows what to change or why it was rejected.' });
      return;
    }
    setLoadingAction(action);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/admin/reviews/${revisionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedbackNotes }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 404) {
        throw new Error('This revision no longer exists. Return to the review queue.');
      }
      if (res.status === 409) {
        throw new Error('Only submitted revisions can be reviewed. This one may have been withdrawn or already decided; refresh to see its current status.');
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process action');
      }

      setDecided(true);
      setFeedbackMessage({
        type: 'success',
        text: `${ACTION_LABELS[action]} recorded. Returning to the review queue...`,
      });

      router.refresh();
      setTimeout(() => {
        router.push('/admin/reviews');
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
          <span>Editorial Decision</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            Status: {currentStatus}
          </span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review decisions immediately enforce publication rules and record an immutable audit trail entry.
        </p>
      </div>

      {feedbackMessage && (
        <div
          role={feedbackMessage.type === 'error' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl text-xs font-medium ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {isSubmitted ? (
        <>
      {/* Editorial Notes */}
      <div className="space-y-2">
        <label htmlFor="review-feedback-notes" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Editorial / Revision Feedback Notes
        </label>
        <textarea
          id="review-feedback-notes"
          rows={3}
          maxLength={2000}
          value={feedbackNotes}
          onChange={(e) => setFeedbackNotes(e.target.value)}
          placeholder="e.g. Approved. Confirmed Ph.D. degree at Cambridge. Doctrinal statement conforms to institutional baseline..."
          className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
          Notes are stored in the audit log and shown to the scholar. Required when requesting changes or rejecting.
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleAction('approve')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
        >
          {loadingAction === 'approve' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span>Approve & Publish Live</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => handleAction('request_changes')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
        >
          {loadingAction === 'request_changes' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
          )}
          <span>Request Changes</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => handleAction('reject')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loadingAction === 'reject' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden="true" />
          )}
          <span>Reject Submission</span>
        </button>
      </div>
        </>
      ) : (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          This revision is <span className="font-semibold capitalize">{currentStatus.replace('_', ' ')}</span> and cannot be reviewed. Only submitted revisions can be approved, sent back, or rejected.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleAction('hide')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loadingAction === 'hide' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          )}
          <span>Hide from Public Listing</span>
        </button>
      </div>

      {/* Audit Log Trail */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Audit Log History ({auditHistory.length})
        </span>

        {auditHistory.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No prior review decisions recorded.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {auditHistory.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold capitalize text-slate-900 dark:text-white">
                    {item.action.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                {item.feedback_notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    &ldquo;{item.feedback_notes}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
