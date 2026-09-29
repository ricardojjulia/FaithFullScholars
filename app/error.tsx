'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected client exceptions
    console.error('Unhandled platform error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm">
        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/60 rounded-2xl flex items-center justify-center mx-auto text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-rose-700 dark:text-rose-400 font-bold">
            Unexpected Error Encountered
          </span>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            Something Went Wrong
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            An unexpected error occurred while rendering this page. Our telemetry system has logged the diagnostic incident.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-400">
              Error Incident Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
