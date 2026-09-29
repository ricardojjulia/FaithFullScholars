'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  ShieldCheck,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ScrollText,
  UserCheck,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ATSComplianceReport, exportAccreditationCsv } from '@/lib/accreditation/ats-matrix-generator';

interface ATSComplianceMatrixTableProps {
  report: ATSComplianceReport;
}

export function ATSComplianceMatrixTable({ report }: ATSComplianceMatrixTableProps) {
  const { t } = useTranslation();
  const { summary, records } = report;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = exportAccreditationCsv(report);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `ats-faculty-matrix-${report.institution_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${
        new Date().toISOString().split('T')[0]
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 print:space-y-6 print:m-0 print:p-0">
      {/* Top Action Header — Hidden on Print */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/institution/saved"
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('accreditation.back_to_shortlist')}</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-full text-xs font-semibold text-amber-800 dark:text-amber-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('accreditation.accreditation_badge')}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleDownloadCsv}
            disabled={records.length === 0}
            className="flex-1 sm:flex-initial px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('accreditation.download_csv')}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('accreditation.print_dossier')}</span>
          </button>
        </div>
      </div>

      {/* Formal Header (Executive Academic Styling) */}
      <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-700 dark:text-indigo-400 font-bold block mb-1">
              FaithFull Scholars • Institutional Accreditation Self-Study
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
              {t('accreditation.matrix_title')}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {report.institution_name} • {t('accreditation.matrix_subtitle')}
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 font-mono">
            <div>Audit Date: {report.generated_at.split('T')[0]}</div>
            <div className="text-[10px] text-slate-400">ATS Standard 3 / ABHE Standard 11</div>
          </div>
        </div>
      </div>

      {/* KPI Compliance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {/* Total Faculty */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{t('accreditation.total_faculty')}</span>
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            {summary.total_faculty}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Current Roster Pool</p>
        </div>

        {/* Terminal Doctorate Ratio */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{t('accreditation.terminal_degree_ratio')}</span>
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-slate-900 dark:text-white">
              {summary.terminal_degree_percentage}%
            </span>
            <span className="text-xs text-slate-500">
              ({summary.terminal_degree_count}/{summary.total_faculty})
            </span>
          </div>
          <div className="mt-2">
            {summary.ats_standard_3_compliant ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                {t('accreditation.standard_met')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3 h-3" />
                {t('accreditation.standard_deficit')}
              </span>
            )}
          </div>
        </div>

        {/* Scholarly Works */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{t('accreditation.scholarly_works')}</span>
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            {summary.total_publications}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Verified Publications & Texts</p>
        </div>

        {/* Confessional Ratio */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{t('accreditation.confessional_ratio')}</span>
            <ScrollText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-slate-900 dark:text-white">
              {summary.confessional_affirmation_percentage}%
            </span>
            <span className="text-xs text-slate-500">
              ({summary.confessional_affirmation_count}/{summary.total_faculty})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Historic Confessions Affirmed</p>
        </div>
      </div>

      {/* Credentials Matrix Table */}
      {records.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('accreditation.empty_title')}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {t('accreditation.empty_desc')}
          </p>
          <Link
            href="/scholars"
            className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            {t('accreditation.discover_scholars')}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <table
            className="w-full text-left text-xs"
            aria-label={t('accreditation.matrix_title')}
          >
            <caption className="sr-only">
              {t('accreditation.matrix_title')} — {t('accreditation.matrix_subtitle')}
            </caption>
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th scope="col" className="py-3.5 px-4">{t('accreditation.faculty_member')}</th>
                <th scope="col" className="py-3.5 px-4">{t('accreditation.credentials')}</th>
                <th scope="col" className="py-3.5 px-4">{t('accreditation.discipline')}</th>
                <th scope="col" className="py-3.5 px-4 text-center">{t('accreditation.publications')}</th>
                <th scope="col" className="py-3.5 px-4">{t('accreditation.confessional_affirmation')}</th>
                <th scope="col" className="py-3.5 px-4 text-center">{t('accreditation.compliance_status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.map((r) => (
                <tr
                  key={r.scholar_id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  {/* Faculty Member */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Link
                        href={`/scholars/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 group"
                      >
                        <span>{r.full_name}</span>
                        <span className="sr-only">(opens in a new tab)</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition print:hidden" aria-hidden="true" />
                      </Link>
                    </div>
                    {r.title && (
                      <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                        {r.title}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-normal block">
                      {r.current_institution}
                    </span>
                  </td>

                  {/* Highest Degree */}
                  <td className="py-3.5 px-4">
                    {r.highest_degree ? (
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.highest_degree}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {r.degree_institution || 'Accredited Institution'}
                          {r.graduation_year ? ` (${r.graduation_year})` : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unspecified</span>
                    )}
                  </td>

                  {/* Primary Teaching Discipline */}
                  <td className="py-3.5 px-4">
                    {r.primary_discipline ? (
                      <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[11px]">
                        {r.primary_discipline}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">General Theological Studies</span>
                    )}
                  </td>

                  {/* Publications */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-full text-xs">
                      {r.publications_count}
                    </span>
                  </td>

                  {/* Confessional Affirmation */}
                  <td className="py-3.5 px-4">
                    {r.confessions.length > 0 ? (
                      <div className="space-y-1">
                        {r.confessions.slice(0, 2).map((conf, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] font-medium text-slate-700 dark:text-slate-300"
                          >
                            • {conf}
                          </div>
                        ))}
                        {r.confessions.length > 2 && (
                          <div className="text-[10px] text-slate-400">
                            +{r.confessions.length - 2} more affirmed
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        Evangelical / Independent
                      </span>
                    )}
                  </td>

                  {/* Compliance Status */}
                  <td className="py-3.5 px-4 text-center">
                    {r.is_terminal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded-full text-[10px] border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Terminal (Std 3)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-full text-[10px]">
                        <span>Master’s / Adjunct</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ATS Standard 3 Regulatory Note */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] text-slate-500 leading-relaxed print:text-[9px]">
        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
          ATS Commission on Accrediting Standard 3.1 & ABHE Standard 11.2 Compliance Guidance:
        </span>
        Instructional faculty in master-level degree programs must possess an earned research or ministerial doctorate (Ph.D., Th.D., D.Min., etc.) in the discipline or substantial equivalent professional qualifications. Institutions must maintain an aggregate terminal doctorate ratio of at least 50% across degree program faculties. This documentation is formatted for inclusion in institutional self-study dossiers and decennial committee review binders.
      </div>
    </div>
  );
}
