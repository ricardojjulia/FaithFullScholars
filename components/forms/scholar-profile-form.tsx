'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { RevisionSnapshotData } from '@/lib/domain/types';
import { ConfessionalStandardsSelector } from './confessional-standards-selector';
import { DoctrinalStatementForm } from './doctrinal-statement-form';
import { inspectDraftDiff } from '@/lib/profiles/revision-actions';

interface ScholarProfileFormProps {
  initialDraft: RevisionSnapshotData;
  publishedSnapshot?: RevisionSnapshotData | null;
  onSaveDraft: (draft: RevisionSnapshotData) => Promise<{ success: boolean; error?: string }>;
  onSubmitForReview?: (draft: RevisionSnapshotData) => Promise<{ success: boolean; error?: string }>;
}

const AVAILABLE_DISCIPLINES = [
  'Old Testament & Hebrew Scriptures',
  'New Testament & Early Christianity',
  'Systematic Theology',
  'Historical Theology & Church History',
  'Pastoral & Practical Theology',
  'Biblical Languages',
  'Christian Ethics & Moral Theology',
  'Philosophical Theology & Apologetics',
  'Missions & Intercultural Studies'
];

export function ScholarProfileForm({
  initialDraft,
  publishedSnapshot = null,
  onSaveDraft,
  onSubmitForReview
}: ScholarProfileFormProps) {
  const [formData, setFormData] = useState<RevisionSnapshotData>(initialDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Compute live diff against published snapshot
  const diff = inspectDraftDiff(publishedSnapshot, formData);

  function updateField<K extends keyof RevisionSnapshotData>(key: K, value: RevisionSnapshotData[K]) {
    setFormData((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function toggleDiscipline(disc: string) {
    const current = formData.disciplines || [];
    if (current.includes(disc)) {
      updateField(
        'disciplines',
        current.filter((d) => d !== disc)
      );
    } else {
      updateField('disciplines', [...current, disc]);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await onSaveDraft(formData);
      if (res.success) {
        setSaveMessage({ type: 'success', text: 'Draft revision saved securely. Public profile remains unchanged.' });
      } else {
        setSaveMessage({ type: 'error', text: res.error || 'Failed to save draft revision.' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'An unexpected error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitReview() {
    if (!onSubmitForReview) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await onSubmitForReview(formData);
      if (res.success) {
        setSaveMessage({ type: 'success', text: 'Revision submitted for admin review successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: res.error || 'Failed to submit revision for review.' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to submit revision.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Revision Diff Header Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Draft Revision Workspace</span>
              {diff.hasChanges ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold">
                  {diff.totalChanges} pending change{diff.totalChanges === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                  In sync with live snapshot
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Changes stay in staging until submitted and approved. Your live public profile is untouched.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          {onSubmitForReview && (
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={isSaving || !diff.hasChanges}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              Submit for Review
            </button>
          )}
        </div>
      </div>

      {saveMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium ${
            saveMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Section 1: Academic Identity */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-4">
        <h3 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Academic Identity & Affiliation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Legal & Professional Name *
            </label>
            <input
              type="text"
              required
              value={formData.full_name || ''}
              onChange={(e) => updateField('full_name', e.target.value)}
              placeholder="e.g. Dr. Meredith C. Kline, Ph.D."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Professional Headline / Academic Title
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Professor of Old Testament"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Institution
            </label>
            <input
              type="text"
              value={formData.current_institution || ''}
              onChange={(e) => updateField('current_institution', e.target.value)}
              placeholder="e.g. Westminster Theological Seminary"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Institutional Role
            </label>
            <input
              type="text"
              value={formData.institutional_role || ''}
              onChange={(e) => updateField('institutional_role', e.target.value)}
              placeholder="e.g. Full Professor, Associate Professor, Adjunct"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="e.g. Philadelphia, PA, USA"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={formData.timezone || 'America/New_York'}
              onChange={(e) => updateField('timezone', e.target.value)}
              placeholder="e.g. America/New_York"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Academic Biography & Research Summary
          </label>
          <textarea
            rows={4}
            value={formData.biography || ''}
            onChange={(e) => updateField('biography', e.target.value)}
            placeholder="Share your academic journey, specialized focus areas, and teaching philosophy..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Section 2: Theological Disciplines */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-3">
        <h3 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Theological Disciplines & Specialties
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select all theological disciplines that represent your research and teaching portfolio.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {AVAILABLE_DISCIPLINES.map((disc) => {
            const active = (formData.disciplines || []).includes(disc);
            return (
              <button
                key={disc}
                type="button"
                onClick={() => toggleDiscipline(disc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {active ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{disc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Confessional Standards & Historic Creeds */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <ConfessionalStandardsSelector
          value={formData.confessions || []}
          onChange={(val) => updateField('confessions', val)}
        />
      </div>

      {/* Section 4: Personal Doctrinal Statement */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <DoctrinalStatementForm
          value={formData.doctrinal_statement_text || ''}
          onChange={(val) => updateField('doctrinal_statement_text', val)}
        />
      </div>
    </form>
  );
}
