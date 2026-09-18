'use client';

import React, { Component, ReactNode } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, Home, CheckCircle2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
  reported: boolean;
}

export class FeedbackErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
      reported: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unhandled rendering error occurred.',
      reported: false,
    };
  }

  componentDidCatch(error: Error) {
    const isEnabled = process.env.NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED === 'true';
    if (!isEnabled) return;

    // Report error automatically without blocking UI or re-throwing
    this.reportErrorSilently(error);
  }

  private async reportErrorSilently(error: Error) {
    try {
      let sessionId = '00000000-0000-4000-8000-000000000000';
      let sessionDurationSeconds: number | null = null;

      try {
        const storedId = sessionStorage.getItem('faithfull_pilot_session_id');
        if (storedId) sessionId = storedId;

        const storedStart = sessionStorage.getItem('faithfull_pilot_session_start');
        if (storedStart) {
          const startMs = parseInt(storedStart, 10);
          if (!isNaN(startMs)) {
            sessionDurationSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
          }
        }
      } catch {
        // sessionStorage restricted
      }

      // Extract only safe error message — never include stack traces, tokens, or headers
      const safeMessage = error.message
        ? error.message.slice(0, 1000)
        : 'Unhandled render error';

      const payload = {
        sessionId,
        route: typeof window !== 'undefined' ? window.location.pathname : '/',
        category: 'ERROR',
        errorMessage: safeMessage,
        breadcrumbs: [typeof window !== 'undefined' ? window.location.pathname : '/'],
        appVersion: '0.1.0',
        sessionDurationSeconds,
      };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.setState({ reported: true });
      }
    } catch {
      // Swallowing reporting failures: reporting must NEVER cause a secondary crash
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-4">
              <AlertOctagon className="h-6 w-6" />
            </div>

            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Something went wrong
            </h1>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              An unexpected error occurred while displaying this page.
            </p>

            {this.state.reported && (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Error details were automatically reported to our team.</span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reload Page</span>
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return Home</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
