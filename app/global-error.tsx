'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Unhandled root layout error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/60 rounded-2xl flex items-center justify-center mx-auto text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-rose-700 dark:text-rose-400 font-bold">
              Root Platform Error
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Application Error
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              A critical error occurred in the application shell. Please refresh the page to restart the session.
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-slate-400">
                Digest: {error.digest}
              </p>
            )}
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => reset()}
              className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restart Application</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
