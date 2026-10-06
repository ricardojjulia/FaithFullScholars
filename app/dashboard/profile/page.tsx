'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ScholarProfileForm } from '@/components/forms/scholar-profile-form';
import { RevisionStatusBanner } from '@/components/dashboard/revision-status-banner';
import {
  RevisionState,
  describeFailure,
  fetchRevisionState,
  saveRevision,
  submitRevision,
  withdrawRevision
} from '@/components/dashboard/revision-client';
import { RevisionSnapshotData } from '@/lib/domain/types';
import { buildDraftSnapshot } from '@/lib/profiles/revision-actions';

const OPEN_STATUSES = ['draft', 'submitted', 'changes_requested'];

export default function ProfileEditorPage() {
  const router = useRouter();
  const [state, setState] = useState<RevisionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumped whenever server state replaces the editor contents, remounting the form.
  const [formKey, setFormKey] = useState(0);

  const refresh = useCallback(async (): Promise<boolean> => {
    const res = await fetchRevisionState();
    if (!res.ok) {
      if (res.status === 401) {
        router.push('/login');
        return false;
      }
      setLoadError(
        res.status === 404 ? 'No scholar profile was found for this account.' : describeFailure(res)
      );
      return false;
    }
    setLoadError(null);
    setState(res.data);
    setFormKey((k) => k + 1);
    return true;
  }, [router]);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span>Loading your profile draft...</span>
      </div>
    );
  }

  if (!state) {
    return (
      <div role="alert" className="p-4 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs space-y-2">
        <p>{loadError ?? 'Unable to load your profile.'}</p>
        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            await refresh();
            setLoading(false);
          }}
          className="px-3 py-1.5 bg-rose-700 text-white rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  const { revision, baseline } = state;
  const status = revision?.status ?? null;
  const openRevisionId = revision && OPEN_STATUSES.includes(revision.status) ? revision.id : undefined;
  const initialDraft: RevisionSnapshotData = buildDraftSnapshot(
    baseline.snapshot,
    revision?.snapshot_data ?? {}
  );
  const readOnly = status === 'submitted';
  const isPublished = state.scholar.profile_status === 'approved';

  /** Saves the editor contents. Returns the revision id to act on, or an error. */
  async function persist(updated: RevisionSnapshotData): Promise<{ id: string } | { error: string }> {
    const res = await saveRevision(updated, openRevisionId);
    if (res.ok) {
      setState((prev) => (prev ? { ...prev, revision: res.data.revision } : prev));
      return { id: res.data.revision.id };
    }
    if (res.status === 409) {
      await refresh();
    }
    return { error: describeFailure(res) };
  }

  async function handleSaveDraft(updated: RevisionSnapshotData) {
    setNotice(null);
    const saved = await persist(updated);
    return 'error' in saved ? { success: false, error: saved.error } : { success: true };
  }

  async function handleSubmitReview(updated: RevisionSnapshotData) {
    setNotice(null);
    const saved = await persist(updated);
    if ('error' in saved) return { success: false, error: saved.error };
    const res = await submitRevision(saved.id);
    if (!res.ok) {
      if (res.status === 409) await refresh();
      return { success: false, error: describeFailure(res) };
    }
    await refresh();
    return { success: true };
  }

  async function handleWithdraw() {
    setNotice(null);
    setBusy(true);
    const res = await withdrawRevision(revision?.id);
    if (!res.ok) setNotice(describeFailure(res));
    await refresh();
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
            Profile & Doctrinal Revision Editor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Edit your public academic profile. In accordance with ADR 0005, changes stage to a new draft revision and will not alter your live listing until reviewed.
          </p>
        </div>
      </div>

      <RevisionStatusBanner
        status={status}
        adminNotes={revision?.admin_notes ?? null}
        isPublished={isPublished}
        isHidden={state?.scholar.profile_status === 'hidden'}
        isBusy={busy}
        onWithdraw={handleWithdraw}
        onStartNewDraft={() => {
          // The next save omits revisionId (rejected is not open) and creates a fresh draft.
          setNotice('Edit the profile and save to start a new draft.');
        }}
      />

      {notice && (
        <div role="alert" className="p-3.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
          {notice}
        </div>
      )}

      <ScholarProfileForm
        key={formKey}
        initialDraft={initialDraft}
        publishedSnapshot={baseline.snapshot}
        readOnly={readOnly}
        onSaveDraft={handleSaveDraft}
        onSubmitForReview={handleSubmitReview}
      />
    </div>
  );
}
