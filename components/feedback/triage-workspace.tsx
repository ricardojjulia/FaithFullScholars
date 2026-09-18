'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Bug,
  Lightbulb,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Flame,
  ChevronRight,
  X,
  Code2,
  ShieldAlert,
} from 'lucide-react';
import {
  PilotFeedbackRecord,
  FeedbackCategory,
  TriageAction,
  FEEDBACK_CATEGORIES,
  TRIAGE_ACTIONS,
} from '@/lib/feedback/types';

interface TriageWorkspaceProps {
  initialRecords: PilotFeedbackRecord[];
}

const ACTION_LABELS: Record<TriageAction, string> = {
  FIXED_IN_CODE: 'Fixed in Code',
  NO_ACTION_NEEDED: 'No Action Needed',
  ACKNOWLEDGED: 'Acknowledged',
  IMPLEMENTED: 'Implemented',
  RECEIVED_AND_CLOSED: 'Received & Closed',
};

export function TriageWorkspace({ initialRecords }: TriageWorkspaceProps) {
  const [records, setRecords] = useState<PilotFeedbackRecord[]>(initialRecords);
  const [statusTab, setStatusTab] = useState<'open' | 'done' | 'all'>('open');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  // Filter records locally for responsive filtering
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Tab filter
      if (statusTab === 'open' && rec.processed) return false;
      if (statusTab === 'done' && !rec.processed) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && rec.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noteMatch = (rec.note || '').toLowerCase().includes(q);
        const errorMatch = (rec.error_message || '').toLowerCase().includes(q);
        const routeMatch = rec.route.toLowerCase().includes(q);
        const emailMatch = (rec.user_email || '').toLowerCase().includes(q);
        const roleMatch = (rec.user_role || '').toLowerCase().includes(q);

        if (!noteMatch && !errorMatch && !routeMatch && !emailMatch && !roleMatch) {
          return false;
        }
      }

      return true;
    });
  }, [records, statusTab, categoryFilter, searchQuery]);

  // Optimistic mutation helper
  const handleUpdateRecord = async (
    recordId: string,
    updates: { processed?: boolean; action?: TriageAction | null }
  ) => {
    const previousRecords = [...records];
    setActionError(null);
    setIsUpdating(true);

    // 1. Optimistic local update
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          ...(typeof updates.processed === 'boolean'
            ? { processed: updates.processed }
            : {}),
          ...(updates.action !== undefined ? { action: updates.action } : {}),
          updated_at: new Date().toISOString(),
        };
      })
    );

    // 2. Server mutation
    try {
      const res = await fetch(`/api/admin/triage/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Server rejected triage update');
      }

      const { record: serverRecord } = await res.json();
      // Re-align with server record
      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? serverRecord : r))
      );
    } catch (err) {
      // 3. Rollback on failure
      setRecords(previousRecords);
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to update record. Changes rolled back.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const getCategoryBadge = (category: FeedbackCategory) => {
    switch (category) {
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertCircle className="h-3 w-3" />
            <span>Error</span>
          </span>
        );
      case 'BUG':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <Bug className="h-3 w-3" />
            <span>Bug</span>
          </span>
        );
      case 'UNEXPECTED_RESULT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <ShieldAlert className="h-3 w-3" />
            <span>Unexpected</span>
          </span>
        );
      case 'IMPROVEMENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
            <Lightbulb className="h-3 w-3" />
            <span>Improvement</span>
          </span>
        );
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const remSecs = seconds % 60;
    return `${mins}m ${remSecs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Pilot Feedback & Error Triage
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Staff workspace for deduplicated crash reports, pilot bug filings, and workflow feedback.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setStatusTab('open')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              statusTab === 'open'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Open Queue (
            {records.filter((r) => !r.processed).length}
            )
          </button>
          <button
            onClick={() => setStatusTab('done')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              statusTab === 'done'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Processed (
            {records.filter((r) => r.processed).length}
            )
          </button>
          <button
            onClick={() => setStatusTab('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              statusTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            All ({records.length})
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by route, note, error message, or user..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="ALL">All Categories</option>
            {FEEDBACK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Alert if mutation failed */}
      {actionError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="rounded p-1 hover:bg-rose-100 dark:hover:bg-rose-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Feedback List & Detail Drawer Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main List */}
        <div className={`space-y-3 ${selectedRecord ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          {filteredRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No feedback items found
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {statusTab === 'open'
                  ? 'All items have been processed or no submissions match your filter.'
                  : 'No records match your selected criteria.'}
              </p>
            </div>
          ) : (
            filteredRecords.map((item) => {
              const isSelected = item.id === selectedRecordId;
              const displayText =
                item.category === 'ERROR'
                  ? item.error_message || 'Unhandled error'
                  : item.note || 'No description provided';

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedRecordId(item.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getCategoryBadge(item.category)}
                      <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300">
                        {item.route}
                      </span>
                      {item.hit_count > 1 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                          <Flame className="h-3 w-3 text-orange-500" />
                          <span>{item.hit_count} hits</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs text-slate-700 dark:text-slate-300">
                    {displayText}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400">
                      {item.user_email ? (
                        <span>
                          {item.user_email} ({item.user_role})
                        </span>
                      ) : (
                        <span className="italic">Anonymous user</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.action && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {ACTION_LABELS[item.action]}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateRecord(item.id, {
                            processed: !item.processed,
                          });
                        }}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all ${
                          item.processed
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item.processed ? 'Processed ✓' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Drawer (Column on right for large screens) */}
        {selectedRecord && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {getCategoryBadge(selectedRecord.category)}
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Detail View
                </span>
              </div>
              <button
                onClick={() => setSelectedRecordId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Context Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Route</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {selectedRecord.route}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Hit Count</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {selectedRecord.hit_count} submission(s)
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Session Duration</span>
                <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {formatDuration(selectedRecord.session_duration_seconds)}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Reported By</span>
                <span className="text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {selectedRecord.user_email || 'Anonymous'}
                </span>
              </div>
            </div>

            {/* Note / Error Message Body */}
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                {selectedRecord.category === 'ERROR' ? 'Error Message' : 'User Note'}
              </span>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 whitespace-pre-wrap font-sans">
                {selectedRecord.category === 'ERROR'
                  ? selectedRecord.error_message || 'No error message captured'
                  : selectedRecord.note || 'No text provided'}
              </div>
            </div>

            {/* Route Breadcrumbs Trail */}
            {selectedRecord.breadcrumbs && selectedRecord.breadcrumbs.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Route Breadcrumbs (last transitions)
                </span>
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 space-y-1">
                  {selectedRecord.breadcrumbs.map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <span className="text-slate-400">{i + 1}.</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Triage Actions Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Triage Decisions
              </span>

              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  Action Taken
                </label>
                <select
                  disabled={isUpdating}
                  value={selectedRecord.action || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleUpdateRecord(selectedRecord.id, {
                      action: val ? (val as TriageAction) : null,
                    });
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="">No action assigned</option>
                  {TRIAGE_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {ACTION_LABELS[action]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Queue Status
                </span>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() =>
                    handleUpdateRecord(selectedRecord.id, {
                      processed: !selectedRecord.processed,
                    })
                  }
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedRecord.processed
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
                  }`}
                >
                  {selectedRecord.processed ? 'Processed (Close Item)' : 'Mark as Processed'}
                </button>
              </div>
            </div>

            {/* Collapsed Raw JSON inspection */}
            <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>{showRawJson ? 'Hide Raw JSON' : 'Inspect Raw JSON'}</span>
              </button>

              {showRawJson && (
                <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[10px] text-slate-200">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
