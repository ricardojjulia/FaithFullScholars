'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ShieldAlert, Loader2 } from 'lucide-react';

export function InstitutionActionButtons({
  institutionId,
  currentStatus,
}: {
  institutionId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleDecision(decision: 'approved' | 'rejected' | 'suspended') {
    setLoading(decision);
    try {
      const res = await fetch(`/api/admin/institutions/${institutionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error('Action failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update institution status.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {currentStatus !== 'approved' && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleDecision('approved')}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
        >
          {loading === 'approved' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span>Verify & Approve</span>
        </button>
      )}

      {currentStatus !== 'rejected' && currentStatus !== 'suspended' && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleDecision('rejected')}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading === 'rejected' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          <span>Reject</span>
        </button>
      )}

      {currentStatus === 'approved' && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleDecision('suspended')}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading === 'suspended' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5" />
          )}
          <span>Suspend</span>
        </button>
      )}
    </div>
  );
}
