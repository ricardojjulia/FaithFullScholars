'use client';

import { useState } from 'react';
import { FullPublicScholarProfile } from '@/lib/domain/queries';
import { StructuredInquiryModal } from '@/lib/../components/inquiries/structured-inquiry-modal';
import { ShortlistButton } from '@/lib/../components/inquiries/shortlist-button';

interface ScholarProfileHeroProps {
  scholar: FullPublicScholarProfile;
}

export function ScholarProfileHero({ scholar }: ScholarProfileHeroProps) {
  const [copied, setCopied] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  const initials = scholar.full_name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  function handleShare() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs mb-6">
      {/* 1. Academic Cover Banner Container */}
      <div className="relative h-44 sm:h-56 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
        {/* Decorative architectural grid / parchment accent */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-white/90 backdrop-blur-md border border-white/20">
            Theological Higher Ed
          </span>
        </div>
      </div>

      {/* 2. Anchor Profile Header with Overlapping Avatar */}
      <div className="px-6 sm:px-10 pb-8 pt-0 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-6">
          <div className="flex items-end gap-5">
            {/* 120px Circular Overlapping Avatar */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-indigo-950 text-amber-300 font-display font-bold text-3xl sm:text-4xl flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg shrink-0 tracking-tight">
              {initials}
              {scholar.availability?.is_available_for_hire && (
                <span
                  title="Open to Adjunct & Modular Teaching"
                  className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse"
                />
              )}
            </div>

            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {scholar.full_name}
                </h1>
                {scholar.verification_status === 'verified' && (
                  <span
                    title="Platform Verified Theological Faculty"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900"
                  >
                    ✓ Verified Faculty
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {scholar.title || scholar.institutional_role || 'Theological Scholar'}
              </p>
            </div>
          </div>

          {/* Availability Status Badge */}
          {scholar.availability?.is_available_for_hire && (
            <div className="self-start sm:self-auto shrink-0">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Available for Adjunct / Modular Teaching
              </span>
            </div>
          )}
        </div>

        {/* 3. Institutional Affiliation & Location Headline */}
        <div className="space-y-2 mb-6">
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 dark:text-slate-400">
            {scholar.current_institution && (
              <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <span>🏛️</span>
                <span>{scholar.current_institution}</span>
                {scholar.institutional_role && (
                  <span className="font-normal text-slate-500">({scholar.institutional_role})</span>
                )}
              </span>
            )}

            {scholar.location && (
              <span className="flex items-center gap-1 text-slate-500">
                <span>📍</span>
                <span>{scholar.location}</span>
                {scholar.timezone && <span>({scholar.timezone})</span>}
              </span>
            )}

            <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-medium">
              <span>📜</span>
              <span>{scholar.confessions.length} Confessional Affirmation{scholar.confessions.length === 1 ? '' : 's'}</span>
            </span>
          </div>
        </div>

        {/* 4. LinkedIn-Style Primary Action Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowInquiryModal(true)}
            className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>✉️</span>
            <span>Send Institutional Inquiry</span>
          </button>

          <ShortlistButton
            scholarId={scholar.id}
            scholarName={scholar.full_name}
          />

          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔗</span>
            <span>{copied ? 'Link Copied!' : 'Share Profile'}</span>
          </button>
        </div>
      </div>

      {/* Structured Opportunity Inquiry Modal */}
      <StructuredInquiryModal
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
        scholar={{
          id: scholar.id,
          fullName: scholar.full_name,
          primaryInstitution: scholar.current_institution,
          avatarUrl: scholar.profile_photo_path,
        }}
      />
    </div>
  );
}
