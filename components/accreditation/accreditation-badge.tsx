'use client';

import React from 'react';
import { AccreditationBody, AccreditationStatus } from '@/lib/licensing/types';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface AccreditationBadgeProps {
  body?: AccreditationBody | string | null;
  status?: AccreditationStatus | string | null;
  showDetails?: boolean;
  className?: string;
}

export function AccreditationBadge({
  body,
  status,
  showDetails = true,
  className = '',
}: AccreditationBadgeProps) {
  const { t } = useTranslation();

  if (!body || body === 'none' || !status || status === 'none') {
    return null;
  }

  const isATS = body === 'ATS';
  const isABHE = body === 'ABHE';

  const badgeBg = isATS
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : isABHE
    ? 'bg-blue-50 text-blue-800 border-blue-200'
    : 'bg-indigo-50 text-indigo-800 border-indigo-200';

  const dotColor = isATS ? 'bg-emerald-500' : isABHE ? 'bg-blue-500' : 'bg-indigo-500';

  const statusLabel =
    status === 'accredited'
      ? t('accreditation.accredited')
      : status === 'candidate'
      ? t('accreditation.candidate')
      : status === 'applicant'
      ? t('accreditation.applicant')
      : status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeBg} ${className}`}
      title={`${body} (${statusLabel})`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
      <span>{body} {showDetails ? statusLabel : ''}</span>
      <svg
        className="w-3.5 h-3.5 ml-0.5 text-current opacity-80"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
