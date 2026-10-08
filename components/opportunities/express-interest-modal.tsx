'use client';

import { useRef, useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Loader2, Briefcase, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useDialogFocus } from '@/components/portal/use-dialog-focus';

export const MAX_COVER_NOTE_LENGTH = 4000;
const MIN_COVER_NOTE_LENGTH = 5;

interface ExpressInterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once the application is accepted, so the page can refresh its server data. */
  onApplied: () => void;
  postingId: string;
  postingTitle: string;
  institutionName: string;
}

/** Mounts the dialog only while open, so its focus handling runs once per open. */
export function ExpressInterestModal({ isOpen, ...rest }: ExpressInterestModalProps) {
  if (!isOpen) return null;
  return <ExpressInterestDialog {...rest} />;
}

function ExpressInterestDialog({
  onClose,
  onApplied,
  postingId,
  postingTitle,
  institutionName,
}: Omit<ExpressInterestModalProps, 'isOpen'>) {
  const { t } = useTranslation();
  const [coverNote, setCoverNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Focus moves in, is trapped, Escape closes, and focus returns to the opener.
  useDialogFocus(dialogRef, onClose, '#express-interest-note');

  /** Friendly, honest message for each outcome the API reports. */
  function messageFor(res: Response): string {
    switch (res.status) {
      case 401:
        return t('common_app.error_signed_out');
      case 403:
        return t('common_app.error_not_eligible');
      case 404:
        return t('common_app.error_not_open');
      case 409:
        return t('common_app.error_duplicate');
      case 429: {
        const seconds = Number(res.headers.get('Retry-After'));
        const minutes = Math.max(1, Math.ceil((Number.isFinite(seconds) && seconds > 0 ? seconds : 3600) / 60));
        return t('common_app.error_rate', { minutes });
      }
      case 400:
        return t('common_app.error_note_required');
      default:
        return t('common_app.error_generic');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (coverNote.trim().length < MIN_COVER_NOTE_LENGTH) {
      setError(t('common_app.error_note_required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/postings/${postingId}/express-interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverNote: coverNote.trim() }),
      });

      if (!res.ok) {
        setError(messageFor(res));
        return;
      }

      setSuccess(true);
      onApplied();
    } catch {
      setError(t('common_app.error_generic'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal={true}
        aria-labelledby="express-interest-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={t('common_app.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 id="express-interest-title" className="text-base font-display font-bold text-slate-900 dark:text-white">
              {t('common_app.modal_title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {postingTitle} · {institutionName}
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3" role="status">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t('common_app.success_title')}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {t('common_app.success_body', { institution: institutionName })}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              {t('common_app.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 space-y-1.5">
              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{t('common_app.modal_title')}</span>
              </div>
              <p>{t('common_app.modal_intro', { institution: institutionName })}</p>
              <p>{t('common_app.dossier_includes')}</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{t('common_app.disclosure')}</p>
              <p>{t('common_app.retention')}</p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="express-interest-note" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('common_app.note_label')}
              </label>
              <textarea
                id="express-interest-note"
                rows={5}
                maxLength={MAX_COVER_NOTE_LENGTH}
                placeholder={t('common_app.note_placeholder')}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                aria-describedby="express-interest-counter"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                required
              />
              <p id="express-interest-counter" className="mt-1 text-right text-[11px] text-slate-500">
                {t('common_app.note_counter', { count: coverNote.length })}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                {t('common_app.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('common_app.sending')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('common_app.send')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
