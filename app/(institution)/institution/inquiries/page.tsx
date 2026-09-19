'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { InquiryStatus, OpportunityType, DeliveryMode } from '@/lib/domain/types';

interface OutboxInquiryItem {
  id: string;
  scholar_id: string;
  scholar_name: string;
  scholar_slug: string;
  scholar_avatar?: string | null;
  opportunity_type: OpportunityType;
  proposed_term?: string | null;
  delivery_mode?: DeliveryMode | null;
  message: string;
  contact_email: string;
  status: InquiryStatus;
  created_at: string;
  course_title?: string | null;
}

const DEFAULT_OUTBOX: OutboxInquiryItem[] = [
  {
    id: 'outbox-1',
    scholar_id: 'f1000000-0000-0000-0000-000000000001',
    scholar_name: 'Dr. Calvin Edwards',
    scholar_slug: 'calvin-edwards',
    opportunity_type: 'adjunct_teaching',
    proposed_term: 'Fall 2027',
    delivery_mode: 'in_person_modular',
    message:
      'We are expanding our modular Th.M. offerings and would like to formally explore your availability to lead a 1-week intensive seminar on Reformed Covenant Theology.',
    contact_email: 'academic.dean@wts.edu',
    status: 'pending',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    course_title: 'Reformed Covenant Theology & Post-Reformation Scholasticism',
  },
  {
    id: 'outbox-2',
    scholar_id: 'f1000000-0000-0000-0000-000000000002',
    scholar_name: 'Dr. Sarah Edwards',
    scholar_slug: 'sarah-edwards',
    opportunity_type: 'guest_lecturing',
    proposed_term: 'Spring 2028',
    delivery_mode: 'in_person_semester',
    message:
      'Our faculty would be honored to host you for our annual Kantzer Lecture Series on Pauline Justification in Recent Hermeneutical Debates.',
    contact_email: 'academic.dean@wts.edu',
    status: 'accepted',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: 'outbox-3',
    scholar_id: 'f1000000-0000-0000-0000-000000000003',
    scholar_name: 'Dr. Marcus Vance',
    scholar_slug: 'marcus-vance',
    opportunity_type: 'doctoral_supervision',
    proposed_term: 'Academic Year 2027–2028',
    delivery_mode: 'online_sync',
    message:
      'We have an incoming Th.M. candidate working on Early Church Christology and would value your external service on their thesis committee.',
    contact_email: 'academic.dean@wts.edu',
    status: 'pending',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
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

export default function InstitutionInquiriesPage() {
  const [inquiries] = useState<OutboxInquiryItem[]>(DEFAULT_OUTBOX);
  const [activeTab, setActiveTab] = useState<InquiryStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = inquiries.filter((inq) => {
    if (activeTab !== 'all' && inq.status !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inq.scholar_name.toLowerCase().includes(q) ||
        inq.message.toLowerCase().includes(q) ||
        (inq.course_title && inq.course_title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = inquiries.filter((i) => i.status === 'pending').length;
  const acceptedCount = inquiries.filter((i) => i.status === 'accepted').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Institutional Outreach & Inquiries
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track structured opportunity requests sent to prospective faculty members and monitor responses.
          </p>
        </div>

        <Link
          href="/scholars"
          className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          + New Faculty Outreach
        </Link>
      </div>

      {/* Filter Toolbar */}
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
              {tab === 'accepted' && acceptedCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px]">
                  {acceptedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by scholar or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Inquiries Outbox List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <span className="text-4xl">📤</span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
            No Outgoing Inquiries
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Discover qualified professors in the Scholar Directory and send structured teaching or speaking requests.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((inq) => {
            const isPending = inq.status === 'pending';
            const isAccepted = inq.status === 'accepted';
            const isDeclined = inq.status === 'declined';

            return (
              <div
                key={inq.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-300 overflow-hidden">
                      {inq.scholar_name.charAt(0)}
                    </div>
                    <div>
                      <Link
                        href={`/scholars/${inq.scholar_slug}`}
                        className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition"
                      >
                        {inq.scholar_name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        Outreach initiated {new Date(inq.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

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

                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium">
                    🎯 {OPPORTUNITY_LABELS[inq.opportunity_type] || inq.opportunity_type}
                  </span>
                  {inq.proposed_term && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      🗓️ {inq.proposed_term}
                    </span>
                  )}
                  {inq.delivery_mode && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      📡 {inq.delivery_mode.replace('_', ' ')}
                    </span>
                  )}
                  {inq.course_title && (
                    <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                      📖 {inq.course_title}
                    </span>
                  )}
                </div>

                <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {inq.message}
                </div>

                {isAccepted && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold">✓ Scholar Accepted: </span>
                      <span>The scholar has agreed to connect regarding this opportunity.</span>
                    </div>
                    <Link
                      href={`/scholars/${inq.scholar_slug}`}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      View Profile
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
