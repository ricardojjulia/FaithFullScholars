'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, AlertCircle, Loader2, CheckCircle2, Briefcase } from 'lucide-react';
import { OpportunityType } from '@/lib/postings/postings-service';

export function NewPostingForm({
  disciplines,
  traditions,
}: {
  disciplines: { id: string; name: string }[];
  traditions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [opportunityType, setOpportunityType] = useState<OpportunityType>('adjunct');
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id || '');
  const [traditionId, setTraditionId] = useState(traditions[0]?.id || '');
  const [term, setTerm] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('online_synchronous');
  const [requiredDegree, setRequiredDegree] = useState('Ph.D. or Th.D. in Subject Discipline');
  const [description, setDescription] = useState('');
  const [confessionalRequirements, setConfessionalRequirements] = useState('');
  const [compensationNotes, setCompensationNotes] = useState('');
  const [deadline, setDeadline] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !term.trim() || !description.trim()) {
      setError('Please fill out all required fields (title, term, description).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          opportunityType,
          disciplineId: disciplineId || null,
          traditionId: traditionId || null,
          term: term.trim(),
          deliveryMode,
          requiredDegree: requiredDegree.trim(),
          description: description.trim(),
          confessionalRequirements: confessionalRequirements.trim() || null,
          compensationNotes: compensationNotes.trim() || null,
          deadline: deadline || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create posting.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/institution/postings');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
          Academic Opportunity Published!
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Your teaching call is now live in the Public Academic Opportunities directory and discoverable by qualified faculty.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Basic Position Details */}
      <div className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
        <h2 className="text-base font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Position Information</span>
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Position Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Adjunct Professor of Systematic Theology, Visiting Lecturer in Greek"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Opportunity Type *
              </label>
              <select
                value={opportunityType}
                onChange={(e) => setOpportunityType(e.target.value as OpportunityType)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="adjunct">Adjunct Teaching</option>
                <option value="modular_intensive">Modular Intensive</option>
                <option value="full_time_tenure_track">Full-Time / Tenure Track</option>
                <option value="visiting_fellow">Visiting Fellow</option>
                <option value="sabbatical_cover">Sabbatical Replacement</option>
                <option value="guest_lecturer">Guest Lecturer</option>
                <option value="doctoral_supervision">Doctoral Supervision</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Academic Term *
              </label>
              <input
                type="text"
                placeholder="e.g. Spring 2027, Summer Modular 2027"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Theological Discipline
              </label>
              <select
                value={disciplineId}
                onChange={(e) => setDisciplineId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {disciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tradition Affinity
              </label>
              <select
                value={traditionId}
                onChange={(e) => setTraditionId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {traditions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Detailed Scope & Responsibilities *
            </label>
            <textarea
              rows={5}
              placeholder="Describe the course syllabus requirements, lecture format, student load, and academic oversight..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
              required
            />
          </div>
        </div>
      </div>

      {/* Qualifications & Confessional Alignment */}
      <div className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
          Accreditation & Confessional Requirements
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Required Terminal Degree
            </label>
            <input
              type="text"
              placeholder="e.g. Ph.D. or Th.D. in Historical Theology from accredited institution"
              value={requiredDegree}
              onChange={(e) => setRequiredDegree(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Institutional Confessional Alignment Standard
            </label>
            <input
              type="text"
              placeholder="e.g. Full ex animo subscription to Westminster Standards or 1689 London Baptist Confession"
              value={confessionalRequirements}
              onChange={(e) => setConfessionalRequirements(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Compensation / Stipend Notes
              </label>
              <input
                type="text"
                placeholder="e.g. $4,500/course section or $5,000 modular honorarium + travel"
                value={compensationNotes}
                onChange={(e) => setCompensationNotes(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Application Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing Call...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Publish Academic Opportunity</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
