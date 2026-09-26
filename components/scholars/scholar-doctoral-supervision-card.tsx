'use client';

import { useState } from 'react';
import {
  GraduationCap,
  Award,
  Video,
  MapPin,
  Calendar,
  CheckCircle2,
  BookOpen,
  DollarSign,
  Users,
} from 'lucide-react';
import { StructuredInquiryModal } from '@/components/inquiries/structured-inquiry-modal';
import { useTranslation } from '@/lib/i18n/i18n-context';

export interface TerminalDegreeInfo {
  degree: string;
  field_of_study: string;
  institution_name: string;
  year_awarded?: number | null;
  is_terminal: boolean;
}

export interface ScholarDoctoralSupervisionCardProps {
  scholarId: string;
  scholarName: string;
  primaryInstitution?: string | null;
  avatarUrl?: string | null;
  terminalDegrees?: TerminalDegreeInfo[];
  disciplines?: string[];
  initialOpenModal?: boolean;
}

export function ScholarDoctoralSupervisionCard({
  scholarId,
  scholarName,
  primaryInstitution,
  avatarUrl,
  terminalDegrees = [],
  disciplines = [],
  initialOpenModal = false,
}: ScholarDoctoralSupervisionCardProps) {
  const { t } = useTranslation();
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(initialOpenModal);

  const primaryTerminalDegree = terminalDegrees.find((d) => d.is_terminal) || terminalDegrees[0];

  return (
    <section className="card-crisp p-6 sm:p-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center border border-purple-200/80 dark:border-purple-800/60 shrink-0">
            <GraduationCap className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">
                {t('doctoral.title')}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {t('doctoral.ats_badge')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('doctoral.subtitle')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsInquiryModalOpen(true)}
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white transition-colors shadow-xs flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{t('doctoral.request_reader')}</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Terminal Degree & Accreditation Status */}
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{t('doctoral.terminal_qualification')}</span>
          </div>

          {primaryTerminalDegree ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {primaryTerminalDegree.degree} in {primaryTerminalDegree.field_of_study}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {primaryTerminalDegree.institution_name}
                {primaryTerminalDegree.year_awarded ? ` (${primaryTerminalDegree.year_awarded})` : ''}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Terminal doctorate on record & verified for doctoral committee appointment.
            </p>
          )}

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Eligible for external Ph.D., Th.M., and D.Min. dissertation defense committees.</span>
          </div>
        </div>

        {/* Defense & Committee Capacities */}
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{t('doctoral.annual_capacity')}</span>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {t('doctoral.annual_capacity_desc')}
          </p>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{t('doctoral.honorarium_guidance')}</span>
          </div>
        </div>
      </div>

      {/* Supervisory Disciplines & Examination Formats */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {disciplines.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              {t('doctoral.supervisory_fields')}:
            </span>
            {disciplines.map((d) => (
              <span
                key={d}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200/60 dark:border-slate-700"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-1">
            <Video className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('doctoral.virtual_defense')}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-purple-500" />
            <span>{t('doctoral.on_campus_defense')}</span>
          </div>
        </div>
      </div>

      {/* Embedded Inquiry Modal */}
      {isInquiryModalOpen && (
        <StructuredInquiryModal
          isOpen={isInquiryModalOpen}
          onClose={() => setIsInquiryModalOpen(false)}
          scholar={{
            id: scholarId,
            fullName: scholarName,
            primaryInstitution: primaryInstitution,
            avatarUrl: avatarUrl,
          }}
          defaultOpportunityType="doctoral_supervision"
        />
      )}
    </section>
  );
}
