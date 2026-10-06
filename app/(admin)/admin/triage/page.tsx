import React from 'react';
import { requireStaffPage } from '@/lib/auth/guards';
import { fetchTriageRecords } from '@/lib/feedback/store';
import { PilotFeedbackRecord } from '@/lib/feedback/types';
import { TriageWorkspace } from '@/components/feedback/triage-workspace';

export const dynamic = 'force-dynamic';

export default async function AdminTriagePage() {
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  await requireStaffPage();

  // Load initial feedback queue
  let initialRecords: PilotFeedbackRecord[] = [];
  try {
    initialRecords = await fetchTriageRecords({ status: 'open' });
  } catch (err) {
    console.error('Failed to load initial triage records:', err);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <TriageWorkspace initialRecords={initialRecords} />
      </div>
    </div>
  );
}
