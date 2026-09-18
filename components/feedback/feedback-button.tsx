'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, X, Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useFeedbackSession } from './feedback-provider';
import { FeedbackCategory, FEEDBACK_CATEGORIES } from '@/lib/feedback/types';

const CATEGORY_LABELS: Record<FeedbackCategory, { title: string; desc: string }> = {
  BUG: { title: 'Bug', desc: 'Something is broken or not behaving properly' },
  ERROR: { title: 'Error', desc: 'A crash, failure, or blocking error screen' },
  UNEXPECTED_RESULT: { title: 'Unexpected Result', desc: 'The system gave confusing or counterintuitive data' },
  IMPROVEMENT: { title: 'Improvement', desc: 'An idea or workflow refinement' },
};

const MAX_NOTE_LENGTH = 2000;

export function FeedbackButton() {
  const { sessionId, breadcrumbs, sessionDurationSeconds, isEnabled } = useFeedbackSession();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('BUG');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Esc key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Inert when gate is disabled
  if (!isEnabled) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        sessionId,
        route: pathname || window.location.pathname || '/',
        category,
        note: note.trim() || undefined,
        breadcrumbs,
        appVersion: '0.1.0',
        sessionDurationSeconds,
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setStatusMessage({
        type: 'success',
        text: 'Thank you! Your feedback has been sent to our engineering team.',
      });
      setNote('');

      // Auto-close after brief delay
      setTimeout(() => {
        setIsOpen(false);
        setStatusMessage(null);
        triggerRef.current?.focus();
      }, 2000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        aria-label="Open pilot feedback form"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 hover:shadow-indigo-600/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span>Feedback</span>
        <span className="rounded-full bg-indigo-500/50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
          Pilot
        </span>
      </button>

      {/* Accessible Modal Dialog */}
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2
                  id="feedback-dialog-title"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Send Pilot Feedback
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Route: <code className="font-mono text-indigo-600 dark:text-indigo-400">{pathname || '/'}</code>
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close dialog"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Feedback Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all ${
                        category === cat
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold">{CATEGORY_LABELS[cat].title}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {CATEGORY_LABELS[cat].desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Details */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="feedback-note" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    What happened? <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {note.length} / {MAX_NOTE_LENGTH}
                  </span>
                </div>
                <textarea
                  id="feedback-note"
                  rows={4}
                  maxLength={MAX_NOTE_LENGTH}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe what you were trying to do, what went wrong, or your suggestion..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* Status / Alert */}
              {statusMessage && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !sessionId}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
