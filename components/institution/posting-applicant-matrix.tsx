'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  ShieldCheck,
  Briefcase,
  Download,
  Printer,
  Search,
  ExternalLink,
  FileText,
  X,
  Lock,
} from 'lucide-react';
import type { PostingApplicantReport, ApplicantDossier } from '@/lib/postings/applicant-service';
import { buildApplicantsCsv } from '@/lib/postings/applicants-csv';
import {
  APPLICATION_STATUSES,
  contactReleased,
  nextMemberStatuses,
  type ApplicationStatus,
} from '@/lib/postings/application-status';
import { ApplicationStatusBadge } from '@/components/applications/application-status-badge';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface PostingApplicantMatrixProps {
  report: PostingApplicantReport;
}

const MAX_NOTE_LENGTH = 4000;

export function PostingApplicantMatrix({ report }: PostingApplicantMatrixProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [terminalOnly, setTerminalOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantDossier[]>(report.applicants);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const selectedApplicant = applicants.find((a) => a.applicationId === selectedId) ?? null;

  const filteredApplicants = applicants.filter((a) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      a.scholarName.toLowerCase().includes(term) ||
      (a.currentInstitution && a.currentInstitution.toLowerCase().includes(term)) ||
      (a.highestDegree && a.highestDegree.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesTerminal = !terminalOnly || a.isTerminalDoctorate;

    return matchesSearch && matchesStatus && matchesTerminal;
  });

  const handleDownloadCsv = () => {
    const csvContent = buildApplicantsCsv(filteredApplicants);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `applicants-${report.postingSlug}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Moves an application one valid step. The database guard is the enforcer: if it
  // refuses (the status changed under us, or the move is not allowed) we say so.
  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
    setUpdatingId(applicationId);
    setStatusError(null);
    try {
      const res = await fetch(`/api/institution/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setStatusError(t('common_app.matrix_update_failed'));
        return;
      }
      const data = (await res.json()) as { status?: ApplicationStatus; statusChangedAt?: string };
      setApplicants((prev) =>
        prev.map((a) =>
          a.applicationId === applicationId
            ? { ...a, status: data.status ?? newStatus, statusChangedAt: data.statusChangedAt ?? a.statusChangedAt }
            : a
        )
      );
    } catch {
      setStatusError(t('common_app.matrix_update_failed'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNoteSaved = (applicationId: string, note: string) => {
    setApplicants((prev) => prev.map((a) => (a.applicationId === applicationId ? { ...a, note } : a)));
  };

  const getAlignmentBadge = (level: string, score: number) => {
    if (level === 'full' || score >= 90) {
      return {
        label: 'Full Match',
        classes: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      };
    }
    if (level === 'substantial' || score >= 70) {
      return {
        label: 'Substantial',
        classes: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
      };
    }
    if (level === 'ecumenical' || score >= 50) {
      return {
        label: 'Ecumenical',
        classes: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
      };
    }
    return {
      label: 'Distinctive',
      classes: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              ADR 0020 Candidate Clearinghouse
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Term: {report.term}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">{report.postingTitle}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Search Committee Applicant Comparison Matrix · Required: {report.requiredDegree}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Applicants</div>
            <div className="text-xl font-display font-bold text-slate-900 dark:text-white" data-testid="total-applicants">
              {applicants.length}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Terminal Doctorates</div>
            <div className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{report.terminalDoctoratesCount}</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ({report.terminalDoctoratesRatio}%)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Confessional Alignment</div>
            <div className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{report.fullConfessionalMatchCount}</span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                ({report.totalApplicants > 0 ? Math.round((report.fullConfessionalMatchCount / report.totalApplicants) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Position Type</div>
            <div className="text-sm font-display font-bold text-slate-900 dark:text-white capitalize">
              {report.opportunityType.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter candidates by name, institution, or degree..."
            aria-label="Filter candidates by name, institution, or degree"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by application status"
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t('common_app.matrix_filter_all')}</option>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`common_app.status_${status}`)}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={terminalOnly}
              onChange={(e) => setTerminalOnly(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span>ATS Doctorates Only</span>
          </label>
        </div>
      </div>

      {statusError && (
        <div
          role="alert"
          data-testid="status-error"
          className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 print:hidden"
        >
          {statusError}
        </div>
      )}

      {/* Applicant Comparison Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {filteredApplicants.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500">
              {applicants.length === 0
                ? t('common_app.matrix_empty')
                : 'No candidate applications match the selected criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs" aria-label="Applicant Matrix">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold">
                <tr>
                  <th scope="col" className="py-3.5 px-4">Candidate</th>
                  <th scope="col" className="py-3.5 px-4">Terminal Degree (ATS Standard 3)</th>
                  <th scope="col" className="py-3.5 px-4">Confessional Fit</th>
                  <th scope="col" className="py-3.5 px-4">Applied</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredApplicants.map((a) => {
                  const alignment = getAlignmentBadge(a.alignmentLevel, a.alignmentScorePercent);
                  const isUpdating = updatingId === a.applicationId;
                  const moves = nextMemberStatuses(a.status);

                  return (
                    <tr
                      key={a.applicationId}
                      data-testid="applicant-row"
                      data-application-id={a.applicationId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Link
                            href={`/scholars/${a.scholarSlug}`}
                            target="_blank"
                            className="hover:text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <span>{a.scholarName}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 inline print:hidden" />
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {a.title ? `${a.title} · ` : ''}
                          {a.currentInstitution || 'Independent Scholar'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {a.highestDegree || 'Not Specified'}
                          </span>
                          {a.isTerminalDoctorate ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                              ATS Qualified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                              Master&apos;s / Other
                            </span>
                          )}
                        </div>
                        {a.degreeInstitution && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{a.degreeInstitution}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${alignment.classes}`}>
                            {alignment.label} ({a.alignmentScorePercent}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {a.confessions.length > 0 ? a.confessions.join(', ') : 'Statement of Faith'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">{a.appliedAt.slice(0, 10)}</td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <ApplicationStatusBadge status={a.status} />
                          <div className="flex flex-wrap items-center gap-1.5 print:hidden" role="group" aria-label={`${t('common_app.matrix_move_to')} – ${a.scholarName}`}>
                            {moves.length === 0 ? (
                              <span className="text-[10px] text-slate-400">{t('common_app.matrix_no_moves')}</span>
                            ) : (
                              moves.map((next) => (
                                <button
                                  key={next}
                                  type="button"
                                  data-testid={`move-${next}`}
                                  disabled={isUpdating}
                                  onClick={() => handleStatusChange(a.applicationId, next)}
                                  className="px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-lg transition"
                                >
                                  {isUpdating ? t('common_app.matrix_updating') : t(`common_app.matrix_move_${next}`)}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right print:hidden">
                        <button
                          onClick={() => setSelectedId(a.applicationId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Dossier</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Candidate Dossier Modal (the dossier as it was sealed when the scholar applied) */}
      {selectedApplicant && (
        <DossierModal
          // Remount per applicant so the note and contact state never leak between candidates.
          key={selectedApplicant.applicationId}
          applicant={selectedApplicant}
          onClose={() => setSelectedId(null)}
          onNoteSaved={handleNoteSaved}
        />
      )}
    </div>
  );
}

function DossierModal({
  applicant,
  onClose,
  onNoteSaved,
}: {
  applicant: ApplicantDossier;
  onClose: () => void;
  onNoteSaved: (applicationId: string, note: string) => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState(applicant.note);
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [contact, setContact] = useState<string | null>(null);
  const [contactError, setContactError] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const d = applicant.dossier;

  async function saveNote() {
    setNoteState('saving');
    try {
      const res = await fetch(`/api/institution/applications/${applicant.applicationId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: note }),
      });
      if (!res.ok) {
        setNoteState('error');
        return;
      }
      onNoteSaved(applicant.applicationId, note);
      setNoteState('saved');
    } catch {
      setNoteState('error');
    }
  }

  async function revealContact() {
    setContactLoading(true);
    setContactError(false);
    try {
      const res = await fetch(`/api/institution/applications/${applicant.applicationId}/contact`, { cache: 'no-store' });
      if (!res.ok) {
        setContactError(true);
        return;
      }
      const data = (await res.json()) as { email?: string };
      if (typeof data.email === 'string' && data.email) {
        setContact(data.email);
      } else {
        setContactError(true);
      }
    } catch {
      setContactError(true);
    } finally {
      setContactLoading(false);
    }
  }

  const sectionTitle = 'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400';

  return (
    <div
      role="dialog"
      aria-modal={true}
      aria-labelledby="dossier-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto space-y-6">
        <button
          onClick={onClose}
          aria-label="Close candidate dossier"
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              Common App Candidate Dossier
            </span>
            {applicant.isTerminalDoctorate && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                ATS Terminal Doctorate
              </span>
            )}
            <ApplicationStatusBadge status={applicant.status} />
          </div>
          <h2 id="dossier-modal-title" className="text-xl font-display font-bold text-slate-900 dark:text-white">
            {applicant.scholarName}
          </h2>
          <p className="text-xs text-slate-500">
            {applicant.title ? `${applicant.title} · ` : ''}
            {applicant.currentInstitution || 'Independent Scholar'}
          </p>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400" data-testid="dossier-frozen-note">
            {t('common_app.dossier_frozen', { date: (d.sealedAt ?? applicant.appliedAt).slice(0, 10) })}
          </p>
        </div>

        {/* Academic Credentials */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          <h3 className={sectionTitle}>{t('common_app.dossier_credentials')}</h3>
          {d.credentials.length === 0 ? (
            <p className="text-xs text-slate-400">{t('common_app.dossier_none')}</p>
          ) : (
            <ul className="space-y-1.5">
              {d.credentials.map((c, i) => (
                <li key={`${c.degree}-${i}`} className="text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {[c.degree, c.fieldOfStudy].filter(Boolean).join(' in ')}
                  </span>
                  {c.institutionName ? ` · ${c.institutionName}` : ''}
                  {c.yearAwarded ? ` (${c.yearAwarded})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Confessional Alignment */}
        <div className="space-y-2">
          <h3 className={sectionTitle}>Affirmed Confessional Standards</h3>
          <div className="flex flex-wrap gap-2">
            {d.confessions.length > 0 ? (
              d.confessions.map((c) => (
                <span
                  key={c.slug || c.name}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50"
                >
                  {c.name}
                  {c.adherenceLevel ? ` · ${c.adherenceLevel.replace(/_/g, ' ')}` : ''}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No historic standards selected.</span>
            )}
          </div>
        </div>

        {(d.disciplines.length > 0 || d.traditions.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <h3 className={sectionTitle}>{t('common_app.dossier_disciplines')}</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {d.disciplines.length > 0 ? d.disciplines.map((x) => x.name).join(', ') : t('common_app.dossier_none')}
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className={sectionTitle}>{t('common_app.dossier_traditions')}</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {d.traditions.length > 0 ? d.traditions.map((x) => x.name).join(', ') : t('common_app.dossier_none')}
              </p>
            </div>
          </div>
        )}

        {d.publications.length > 0 && (
          <div className="space-y-1.5">
            <h3 className={sectionTitle}>{t('common_app.dossier_publications')}</h3>
            <ul className="space-y-1 list-disc pl-4">
              {d.publications.map((p, i) => (
                <li key={`${p.title}-${i}`} className="text-xs text-slate-700 dark:text-slate-300">
                  {p.title}
                  {p.publisherOrJournal ? ` · ${p.publisherOrJournal}` : ''}
                  {p.year ? ` (${p.year})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {d.doctrinalStatement && (
          <div className="space-y-1.5">
            <h3 className={sectionTitle}>{t('common_app.dossier_statement')}</h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{d.doctrinalStatement}</p>
          </div>
        )}

        {/* Candidate Cover Note */}
        <div className="space-y-2">
          <h3 className={sectionTitle}>Candidate Cover Note</h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {applicant.coverNote}
          </div>
        </div>

        {/* Private committee notes */}
        <div className="space-y-2">
          <label htmlFor={`note-${applicant.applicationId}`} className={sectionTitle}>
            {t('common_app.notes_label')}
          </label>
          <p className="text-[11px] text-slate-500">{t('common_app.notes_hint')}</p>
          <textarea
            id={`note-${applicant.applicationId}`}
            rows={4}
            maxLength={MAX_NOTE_LENGTH}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteState('idle');
            }}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-y"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveNote}
              disabled={noteState === 'saving'}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition"
            >
              {noteState === 'saving' ? t('common_app.notes_saving') : t('common_app.notes_save')}
            </button>
            {noteState === 'saved' && (
              <span role="status" className="text-xs text-emerald-600 dark:text-emerald-400">
                {t('common_app.notes_saved')}
              </span>
            )}
            {noteState === 'error' && (
              <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                {t('common_app.notes_failed')}
              </span>
            )}
          </div>
        </div>

        {/* Contact: released only once an interview is scheduled */}
        <div className="space-y-2 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          {contactReleased(applicant.status) ? (
            <>
              <p className="text-[11px] text-slate-500">{t('common_app.contact_hint')}</p>
              {contact ? (
                <p className="text-sm font-semibold text-slate-900 dark:text-white" data-testid="applicant-contact">
                  {t('common_app.contact_label')}: <a className="text-indigo-600 hover:underline" href={`mailto:${contact}`}>{contact}</a>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={revealContact}
                  disabled={contactLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 rounded-xl transition"
                >
                  {t('common_app.contact_reveal')}
                </button>
              )}
              {contactError && (
                <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                  {t('common_app.contact_failed')}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span>{t('common_app.contact_locked')}</span>
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
          {applicant.scholarSlug ? (
            <Link
              href={`/scholars/${applicant.scholarSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
            >
              <span>{t('common_app.dossier_live_profile')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
