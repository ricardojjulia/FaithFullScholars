'use client';

import { useState } from 'react';
import { X, ShieldCheck, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { InstitutionalRelationshipType } from '@/lib/endorsements/institutional-endorsement-service';

interface IssueEndorsementModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholars: { id: string; full_name: string; title_or_position: string | null }[];
  onSubmitted?: () => void;
}

const RELATIONSHIP_TYPES: InstitutionalRelationshipType[] = [
  'Current Faculty',
  'Former Faculty',
  'Visiting Scholar',
  'Adjunct Instructor',
  'Research Fellow',
  'Distinguished Lecturer',
];

export function IssueEndorsementModal({
  isOpen,
  onClose,
  scholars,
  onSubmitted,
}: IssueEndorsementModalProps) {
  const [scholarId, setScholarId] = useState(scholars[0]?.id || '');
  const [relationshipType, setRelationshipType] = useState<InstitutionalRelationshipType>('Former Faculty');
  const [departmentOrField, setDepartmentOrField] = useState('');
  const [endorsementText, setEndorsementText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!scholarId || !departmentOrField.trim() || !endorsementText.trim()) {
      setError('Please fill in all fields (scholar, field/department, and endorsement statement).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/institution/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarId,
          relationshipType,
          departmentOrField: departmentOrField.trim(),
          endorsementText: endorsementText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue endorsement.');
      }

      setSuccess(true);
      if (onSubmitted) onSubmitted();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
              Issue Official Institutional Endorsement
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Certify faculty appointment and commend academic excellence
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Institutional Endorsement Issued!
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              The verified endorsement badge and commendation are now published on the scholar&apos;s public dossier.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Scholar to Endorse *
              </label>
              <select
                value={scholarId}
                onChange={(e) => setScholarId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                required
              >
                {scholars.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} {s.title_or_position ? `(${s.title_or_position})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Institutional Appointment Type *
                </label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value as InstitutionalRelationshipType)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {RELATIONSHIP_TYPES.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department / Subject Area *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Historical Theology"
                  value={departmentOrField}
                  onChange={(e) => setDepartmentOrField(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Institutional Commendation Statement *
              </label>
              <textarea
                rows={4}
                placeholder="State the scholar's teaching excellence, confessional fidelity, and service to the institution..."
                value={endorsementText}
                onChange={(e) => setEndorsementText(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Issuing Seal...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Institutional Endorsement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
