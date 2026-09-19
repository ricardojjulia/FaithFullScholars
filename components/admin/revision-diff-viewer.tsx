'use client';

import React from 'react';
import { RevisionSnapshotData } from '@/lib/domain/types';
import { ProfileRevisionDiff } from '@/lib/domain/diff';
import { formatAdherenceLevel } from '@/lib/domain/taxonomies';

interface RevisionDiffViewerProps {
  publishedSnapshot: RevisionSnapshotData | null;
  submittedSnapshot: RevisionSnapshotData;
  diff: ProfileRevisionDiff;
}

export function RevisionDiffViewer({
  publishedSnapshot,
  submittedSnapshot,
  diff,
}: RevisionDiffViewerProps) {
  const isInitialSubmission = !publishedSnapshot;

  return (
    <div className="space-y-6">
      {/* Diff Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0">
            ⚖️
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Revision Staging Diff Inspector (ADR 0005)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isInitialSubmission
                ? 'Initial profile registration — reviewing entire submission for first-time publication.'
                : `Comparing submitted draft changes against active published baseline (${diff.totalChanges} field change${diff.totalChanges === 1 ? '' : 's'} detected).`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {diff.hasChanges ? (
            <span className="px-3 py-1 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-semibold">
              ● {diff.totalChanges} Pending Change{diff.totalChanges === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-semibold">
              ✓ Unaltered Snapshot
            </span>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Published Baseline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Current Published Baseline
            </h3>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {isInitialSubmission ? 'None (Pre-publication)' : 'Active Live Snapshot'}
            </span>
          </div>

          {isInitialSubmission ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-2xl block mb-2">🌱</span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Profile Submission
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                This scholar does not yet have an approved published profile. Approval will publish this draft live.
              </p>
            </div>
          ) : (
            <SnapshotCardDisplay snapshot={publishedSnapshot} isBaseline />
          )}
        </div>

        {/* Right Column: Submitted Revision */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Submitted Revision Draft
            </h3>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              Proposed Live Replacement
            </span>
          </div>

          <SnapshotCardDisplay snapshot={submittedSnapshot} isBaseline={false} />
        </div>
      </div>
    </div>
  );
}

function SnapshotCardDisplay({
  snapshot,
  isBaseline,
}: {
  snapshot: RevisionSnapshotData;
  isBaseline: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 space-y-5 ${
        isBaseline
          ? 'bg-slate-50/70 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'
          : 'bg-white border-indigo-200 dark:bg-slate-900 dark:border-indigo-950 shadow-xs'
      }`}
    >
      {/* Identity Card */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          Academic Identity
        </span>
        <div className="text-sm font-bold text-slate-900 dark:text-white">
          {snapshot.full_name}
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-300">
          {snapshot.title || 'No Title'} • {snapshot.current_institution || 'Independent Scholar'}
        </div>
        {snapshot.location && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            📍 {snapshot.location} {snapshot.timezone ? `(${snapshot.timezone})` : ''}
          </div>
        )}
      </div>

      {/* Biography */}
      <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          Biography
        </span>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {snapshot.biography || 'No biography provided.'}
        </p>
      </div>

      {/* Doctrinal Statement */}
      <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
          Personal Doctrinal Statement
        </span>
        <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed border border-slate-200/50 dark:border-slate-700/50">
          {snapshot.doctrinal_statement_text || 'No personal doctrinal statement submitted.'}
        </div>
      </div>

      {/* Historic Confessions */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          Affirmed Confessional Standards
        </span>
        {snapshot.confessions && snapshot.confessions.length > 0 ? (
          <div className="space-y-2">
            {snapshot.confessions.map((c, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
              >
                <div className="font-semibold text-slate-900 dark:text-white">
                  {c.confessional_standard_name || c.confessional_standard_id}
                </div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                  Subscription: {formatAdherenceLevel(c.adherence_level)}
                </div>
                {c.exception_notes && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                    Notes/Exceptions: {c.exception_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No confessional standards affirmed.</p>
        )}
      </div>

      {/* Disciplines & Traditions */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          Disciplines & Traditions
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(snapshot.disciplines || []).map((d) => (
            <span
              key={d}
              className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium"
            >
              {d}
            </span>
          ))}
          {(snapshot.traditions || []).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
            >
              {t}
            </span>
          ))}
          {(!snapshot.disciplines || snapshot.disciplines.length === 0) &&
            (!snapshot.traditions || snapshot.traditions.length === 0) && (
              <span className="text-xs text-slate-500 italic">None specified</span>
            )}
        </div>
      </div>

      {/* Credentials */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          Academic Credentials
        </span>
        {snapshot.credentials && snapshot.credentials.length > 0 ? (
          <div className="space-y-1.5">
            {snapshot.credentials.map((cred, i) => (
              <div key={i} className="text-xs text-slate-800 dark:text-slate-200">
                <span className="font-semibold">{cred.degree}</span> {cred.field_of_study ? `in ${cred.field_of_study}` : ''} • {cred.institution_name} {cred.year_awarded ? `(${cred.year_awarded})` : ''} {cred.is_terminal ? '🎓 [Terminal]' : ''}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No credentials listed.</p>
        )}
      </div>

      {/* Publications */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          Selected Publications
        </span>
        {snapshot.publications && snapshot.publications.length > 0 ? (
          <div className="space-y-1.5">
            {snapshot.publications.map((pub, i) => (
              <div key={i} className="text-xs text-slate-800 dark:text-slate-200">
                <span className="font-semibold">{pub.title}</span> {pub.year ? `(${pub.year})` : ''} • <span className="capitalize text-slate-500">{pub.publication_type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No publications listed.</p>
        )}
      </div>
    </div>
  );
}
