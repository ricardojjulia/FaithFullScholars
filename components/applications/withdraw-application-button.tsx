'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Undo2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface WithdrawApplicationButtonProps {
  applicationId: string;
  postingTitle: string;
}

/**
 * The applicant withdraws their own application, after an explicit confirmation
 * (withdrawing is final: the database refuses reopening and reapplying). Failures
 * are announced with role="alert"; success refreshes the server data.
 */
export function WithdrawApplicationButton({ applicationId, postingTitle }: WithdrawApplicationButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/withdraw`, { method: 'POST' });
      if (!res.ok) {
        setError(t('common_app.withdraw_failed'));
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError(t('common_app.withdraw_failed'));
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('common_app.withdraw')}</span>
        </button>
        {error && (
          <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={t('common_app.withdraw')}
      className="space-y-3 p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30"
    >
      <p className="text-xs text-slate-800 dark:text-slate-200">{t('common_app.withdraw_confirm', { posting: postingTitle })}</p>
      {error && (
        <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={withdraw}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : null}
          <span>{busy ? t('common_app.withdrawing') : t('common_app.withdraw_confirm_yes')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={busy}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          {t('common_app.withdraw_confirm_no')}
        </button>
      </div>
    </div>
  );
}
