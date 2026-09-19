'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface ShortlistButtonProps {
  scholarId: string;
  scholarName: string;
  initialSaved?: boolean;
  institutionId?: string;
  variant?: 'button' | 'icon';
}

export function ShortlistButton({
  scholarId,
  scholarName,
  initialSaved = false,
  institutionId = 'f2000000-0000-0000-0000-000000000001',
  variant = 'button',
}: ShortlistButtonProps) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      const res = await fetch('/api/institution/saved-scholars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId, scholarId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(data.saved);
      }
    } catch (err) {
      console.error('Error toggling shortlist:', err);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        title={saved ? `Remove ${scholarName} from shortlist` : `Shortlist ${scholarName}`}
        aria-label={saved ? 'Remove from shortlist' : 'Shortlist candidate'}
        className={`p-2 rounded-full border transition ${
          saved
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
            : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <span className="text-base">{saved ? '★' : '☆'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg font-medium text-sm transition border ${
        saved
          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
      }`}
    >
      <span className="text-base leading-none">{saved ? '★' : '☆'}</span>
      <span>
        {saved
          ? t('institution.shortlisted') || 'Shortlisted'
          : t('institution.shortlist') || 'Shortlist'}
      </span>
    </button>
  );
}
