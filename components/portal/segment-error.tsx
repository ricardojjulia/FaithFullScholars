'use client';

import React from 'react';
import { DataErrorPanel } from '@/components/portal/data-error-panel';

/**
 * Error boundary body for the portal segments. A page guard throws
 * SessionLookupError when the session lookup itself failed (a database blip);
 * that must read as "temporary problem, retry", never as "no profile" or a 404.
 * No error detail is rendered.
 */
export function PortalSegmentError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-3 max-w-2xl">
      <DataErrorPanel what="this page" />
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
      >
        Try again
      </button>
    </div>
  );
}
