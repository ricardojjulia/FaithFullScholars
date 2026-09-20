'use client';

import React, { useState } from 'react';
import { Mail, Building2, Target, Calendar, Radio, BookOpen } from 'lucide-react';
import { InquiryStatus, OpportunityType, DeliveryMode } from '@/lib/domain/types';
import { useTranslation } from '@/lib/i18n/i18n-context';

export interface InboxInquiryItem {
  id: string;
  institution_id: string;
  institution_name: string;
  institution_location?: string | null;
  institution_type: string;
  opportunity_type: OpportunityType;
  proposed_term?: string | null;
  delivery_mode?: DeliveryMode | null;
  message: string;
  contact_email: string;
  status: InquiryStatus;
  created_at: string;
  course_title?: string | null;
}

const DEFAULT_INQUIRIES: InboxInquiryItem[] = [
  {
    id: 'inq-sample-1',
    institution_id: 'f2000000-0000-0000-0000-000000000001',
    institution_name: 'Westminster Theological Seminary',
    institution_location: 'Glenside, PA',
    institution_type: 'seminary',
    opportunity_type: 'adjunct_teaching',
    proposed_term: 'Fall 2027',
    delivery_mode: 'in_person_modular',
    message:
      'We are expanding our modular Th.M. offerings and would like to formally explore your availability to lead a 1-week intensive seminar on Reformed Covenant Theology and Federal Vision historical critiques.',
    contact_email: 'academic.dean@wts.edu',
    status: 'pending',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    course_title: 'Reformed Covenant Theology & Post-Reformation Scholasticism',
  },
  {
    id: 'inq-sample-2',
    institution_id: 'f2000000-0000-0000-0000-000000000002',
    institution_name: 'Trinity Evangelical Divinity School',
    institution_location: 'Deerfield, IL',
    institution_type: 'seminary',
    opportunity_type: 'guest_lecturing',
    proposed_term: 'Spring 2028',
    delivery_mode: 'in_person_semester',
    message:
      'Our department of New Testament would be honored to host you for our annual Kantzer Lecture Series on Pauline Justification in Recent Hermeneutical Debates.',
    contact_email: 'nt.department@tiu.edu',
    status: 'accepted',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'inq-sample-3',
    institution_id: 'f2000000-0000-0000-0000-000000000003',
    institution_name: 'Southern Baptist Theological Seminary',
    institution_location: 'Louisville, KY',
    institution_type: 'seminary',
    opportunity_type: 'doctoral_supervision',
    proposed_term: 'Academic Year 2027–2028',
    delivery_mode: 'online_sync',
    message:
      'We have an incoming Ph.D. candidate working on Seventeenth-Century Particular Baptist Ecclesiology and would value your external service on their dissertation committee.',
    contact_email: 'phd.office@sbts.edu',
    status: 'pending',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

const OPPORTUNITY_LABELS: Record<string, string> = {
  adjunct_teaching: 'Adjunct Teaching',
  online_instruction: 'Online Course',
  guest_lecturing: 'Guest Lecture',
  intensives_modular: 'Modular Intensive',
  curriculum_consulting: 'Curriculum Consulting',
  doctoral_supervision: 'Doctoral Supervision',
  conference_speaking: 'Conference Speaking',
};

export function ScholarInquiryInbox({ initialInquiries = DEFAULT_INQUIRIES }: { initialInquiries?: InboxInquiryItem[] }) {
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState<InboxInquiryItem[]>(initialInquiries);
  const [activeTab, setActiveTab] = useState<InquiryStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<InboxInquiryItem | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'decline' | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredInquiries = inquiries.filter((inq) => {
    if (activeTab !== 'all' && inq.status !== activeTab) return false;
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

  const pendingCount = inquiries.filter((i) => i.status === 'pending').length;
  const acceptedCount = inquiries.filter((i) => i.status === 'accepted').length;

  const handleStatusUpdate = async (status: InquiryStatus) => {
    if (!selectedInquiry) return;
    setSubmitting(true);

    try {
      // Optimistic update
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === selectedInquiry.id ? { ...item, status } : item
        )
      );

      // Call API if not a local mock id
      if (!selectedInquiry.id.startsWith('inq-sample-')) {
        await fetch(`/api/inquiries/${selectedInquiry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            response_notes: responseNotes.trim() || null,
          }),
        });
      }

      setActionType(null);
      setSelectedInquiry(null);
      setResponseNotes('');
    } catch (err) {
      console.error('Failed to update inquiry status:', err);
    } finally {
      setSubmitting(false);
    }
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
            {t('inquiry.stat_pending') || 'Pending Review'}
          </span>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">{pendingCount}</p>
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
        <div className="flex flex-wrap gap-1">
          {(['all', 'pending', 'accepted', 'declined'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder={t('inquiry.search_placeholder') || 'Filter by seminary or topic...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Inquiry List */}
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
            const isPending = inq.status === 'pending';
            const isAccepted = inq.status === 'accepted';
            const isDeclined = inq.status === 'declined';

            return (
              <div
                key={inq.id}
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
                        {inq.institution_location || 'Accredited Seminary'} • Received{' '}
                        {new Date(inq.created_at).toLocaleDateString()}
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
                      {inq.status.toUpperCase()}
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
                      <span>{inq.delivery_mode.replace('_', ' ')}</span>
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
                {isAccepted && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold">Contact Dean: </span>
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
                {isPending && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedInquiry(inq);
                        setActionType('decline');
                      }}
                      className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg transition"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => {
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

      {/* Decision Modal */}
      {selectedInquiry && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {actionType === 'accept'
                ? `Accept Inquiry from ${selectedInquiry.institution_name}`
                : `Decline Inquiry from ${selectedInquiry.institution_name}`}
            </h3>

            {actionType === 'accept' ? (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Accepting this opportunity will inform the institutional contact ({selectedInquiry.contact_email})
                and establish a direct email communication channel.
              </p>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Declining will send a polite notification to the institution letting them know of your current
                unavailability.
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                {actionType === 'accept' ? 'Note to Dean (Optional)' : 'Reason / Note (Optional)'}
              </label>
              <textarea
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

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedInquiry(null);
                  setActionType(null);
                }}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleStatusUpdate(actionType === 'accept' ? 'accepted' : 'declined')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition ${
                  actionType === 'accept'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Updating...' : actionType === 'accept' ? 'Confirm Acceptance' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
