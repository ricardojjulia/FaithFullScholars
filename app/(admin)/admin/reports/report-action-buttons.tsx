'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportStatus } from '@/lib/domain/types';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function ReportActionButtons({
  reportId,
  currentStatus,
}: {
  reportId: string;
  currentStatus: ReportStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleStatus(status: 'investigating' | 'resolved' | 'dismissed') {
    setLoading(status);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Action failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update report status.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {currentStatus === 'pending' && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleStatus('investigating')}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading === 'investigating' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          <span>Investigate</span>
        </button>
      )}

      {currentStatus !== 'resolved' && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleStatus('resolved')}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
        >
          {loading === 'resolved' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          <span>Resolve</span>
        </button>
      )}

      {currentStatus !== 'dismissed' && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleStatus('dismissed')}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading === 'dismissed' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          <span>Dismiss</span>
        </button>
      )}
    </div>
  );
}
