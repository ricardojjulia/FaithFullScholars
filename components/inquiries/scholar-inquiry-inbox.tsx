'use client';

import React, { useRef, useState } from 'react';
import { Mail, Building2, Target, Calendar, Radio, BookOpen } from 'lucide-react';
import type { InquiryStatus } from '@/lib/domain/types';
import {
  INQUIRY_TABS,
  OPPORTUNITY_LABELS,
  countForTab,
  inquiryStatusLabel,
  isAwaiting,
  matchesInquiryTab,
  type InquiryTab,
} from '@/lib/inquiries/labels';
import type { InboxInquiryItem } from '@/lib/inquiries/mappers';
import {
  applyOptimisticStatus,
  sendInquiryDecision,
  settleDecision,
  snapshotOf,
} from '@/lib/inquiries/inbox-state';
import { Tabs, tabPanelProps } from '@/components/portal/tabs';
import { useDialogFocus } from '@/components/portal/use-dialog-focus';
import { useTranslation } from '@/lib/i18n/i18n-context';

export type { InboxInquiryItem };

function DecisionDialog({
  inquiry,
  actionType,
  responseNotes,
  setResponseNotes,
  submitting,
  actionError,
  onCancel,
  onConfirm,
}: {
  inquiry: InboxInquiryItem;
  actionType: 'accept' | 'decline';
  responseNotes: string;
  setResponseNotes: (value: string) => void;
  submitting: boolean;
  actionError: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, onCancel, 'textarea');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-decision-title"
        aria-describedby="inquiry-decision-desc"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      >
        <h3 id="inquiry-decision-title" className="text-lg font-bold text-slate-900 dark:text-white">
          {actionType === 'accept'
            ? `Accept Inquiry from ${inquiry.institution_name}`
            : `Decline Inquiry from ${inquiry.institution_name}`}
        </h3>

        <p id="inquiry-decision-desc" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {actionType === 'accept'
            ? 'Accepting this opportunity will inform the institution and establish a direct email channel. The institution’s contact email is shown to you after you accept.'
            : 'Declining will send a polite notification to the institution letting them know of your current unavailability.'}
        </p>

        <div>
          <label
            htmlFor="inquiry-decision-notes"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {actionType === 'accept' ? 'Note to Dean (Optional)' : 'Reason / Note (Optional)'}
          </label>
          <textarea
            id="inquiry-decision-notes"
            rows={3}
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            placeholder={
              actionType === 'accept'
                ? 'e.g. I look forward to connecting and discussing course scheduling.'
                : 'e.g. Thank you for the invitation, but I am at full teaching capacity this academic term.'
            }
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {actionError && (
          <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            {actionError}
          </p>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition ${
              actionType === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting ? 'Updating...' : actionType === 'accept' ? 'Confirm Acceptance' : 'Confirm Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScholarInquiryInbox({ initialInquiries }: { initialInquiries: InboxInquiryItem[] }) {
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState<InboxInquiryItem[]>(initialInquiries);
  const [activeTab, setActiveTab] = useState<InquiryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<InboxInquiryItem | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'decline' | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredInquiries = inquiries.filter((inq) => {
    if (!matchesInquiryTab(inq.status, activeTab)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inq.institution_name.toLowerCase().includes(q) ||
        inq.message.toLowerCase().includes(q) ||
        (inq.course_title && inq.course_title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const awaitingCount = countForTab(inquiries, 'awaiting');
  const acceptedCount = countForTab(inquiries, 'accepted');

  const closeDialog = () => {
    setSelectedInquiry(null);
    setActionType(null);
    setActionError(null);
  };

  const handleStatusUpdate = async (status: InquiryStatus) => {
    if (!selectedInquiry) return;
    const target = selectedInquiry;
    const previous = snapshotOf(target);
    setSubmitting(true);
    setActionError(null);

    // Optimistic update, rolled back if the server does not confirm it.
    setInquiries((prev) => applyOptimisticStatus(prev, target.id, status));

    const result = await sendInquiryDecision(fetch, target.id, status, responseNotes.trim() || null);
    setInquiries((prev) => settleDecision(prev, target.id, status, previous, result));

    if (result.ok) {
      setActionType(null);
      setSelectedInquiry(null);
      setResponseNotes('');
    } else {
      setActionError('We could not update this inquiry. Nothing was changed; please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t('inquiry.stat_total') || 'Total Outreach Received'}
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{inquiries.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {t('inquiry.stat_awaiting') || 'Awaiting response'}
          </span>
          <p data-testid="inbox-awaiting-count" className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">{awaitingCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {t('inquiry.stat_accepted') || 'Accepted Opportunities'}
          </span>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{acceptedCount}</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        <Tabs
          idPrefix="inbox"
          label="Filter inquiries by status"
          active={activeTab}
          onChange={setActiveTab}
          tabs={INQUIRY_TABS.map((tab) => ({
            id: tab.id,
            content: (
              <>
                {tab.label}
                {tab.id === 'awaiting' && awaitingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px]">
                    {awaitingCount}
                  </span>
                )}
              </>
            ),
          }))}
        />

        <div className="w-full sm:w-64">
          <input
            type="text"
            aria-label="Filter inquiries by institution or topic"
            placeholder={t('inquiry.search_placeholder') || 'Filter by seminary or topic...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Inquiry List */}
      <div {...tabPanelProps('inbox', activeTab)}>
      {filteredInquiries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {t('inquiry.empty_title') || 'No Inquiries Found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {t('inquiry.empty_desc') ||
              'When accredited theological institutions send teaching or speaking inquiries, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inq) => {
            const isPending = isAwaiting(inq.status);
            const canRespond = isAwaiting(inq.status);
            const isAccepted = inq.status === 'accepted';
            const isDeclined = inq.status === 'declined';

            return (
              <div
                key={inq.id}
                data-testid="inquiry-card"
                data-status={inq.status}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {inq.institution_name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {inq.institution_available
                          ? inq.institution_location
                            ? `${inq.institution_location} • `
                            : ''
                          : 'Details unavailable • '}
                        Received {new Date(inq.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : isAccepted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : isDeclined
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {inquiryStatusLabel(inq.status)}
                    </span>
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium inline-flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{OPPORTUNITY_LABELS[inq.opportunity_type] || inq.opportunity_type}</span>
                  </span>
                  {inq.proposed_term && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{inq.proposed_term}</span>
                    </span>
                  )}
                  {inq.delivery_mode && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{inq.delivery_mode.replaceAll('_', ' ')}</span>
                    </span>
                  )}
                  {inq.course_title && (
                    <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 inline-flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>{inq.course_title}</span>
                    </span>
                  )}
                </div>

                {/* Message Excerpt */}
                <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {inq.message}
                </div>

                {/* Direct Contact Info (Visible if Accepted) */}
                {isAccepted && inq.contact_email && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold">Institution contact: </span>
                      <a href={`mailto:${inq.contact_email}`} className="underline font-semibold">
                        {inq.contact_email}
                      </a>
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Direct contact channel established
                    </span>
                  </div>
                )}

                {/* Actions */}
                {canRespond && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setActionError(null);
                        setSelectedInquiry(inq);
                        setActionType('decline');
                      }}
                      className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg transition"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => {
                        setActionError(null);
                        setSelectedInquiry(inq);
                        setActionType('accept');
                      }}
                      className="px-4 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                    >
                      Accept Opportunity
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      </div>

      {/* Decision Modal */}
      {selectedInquiry && actionType && (
        <DecisionDialog
          inquiry={selectedInquiry}
          actionType={actionType}
          responseNotes={responseNotes}
          setResponseNotes={setResponseNotes}
          submitting={submitting}
          actionError={actionError}
          onCancel={closeDialog}
          onConfirm={() => handleStatusUpdate(actionType === 'accept' ? 'accepted' : 'declined')}
        />
      )}
    </div>
  );
}
