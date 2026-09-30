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
  ChevronDown,
} from 'lucide-react';
import type { PostingApplicantReport, ApplicantDossier } from '@/lib/postings/applicant-service';
import { InquiryStatus } from '@/lib/domain/types';

interface PostingApplicantMatrixProps {
  report: PostingApplicantReport;
}

export function PostingApplicantMatrix({ report }: PostingApplicantMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [terminalOnly, setTerminalOnly] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantDossier | null>(null);
  const [applicants, setApplicants] = useState<ApplicantDossier[]>(report.applicants);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter applicants
  const filteredApplicants = applicants.filter((a) => {
    const matchesSearch =
      a.scholarName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.currentInstitution && a.currentInstitution.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.highestDegree && a.highestDegree.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesTerminal = !terminalOnly || a.isTerminalDoctorate;

    return matchesSearch && matchesStatus && matchesTerminal;
  });

  // Client-side CSV Download
  const handleDownloadCsv = () => {
    const headers = [
      'Candidate Name',
      'Preferred Title',
      'Current Institution',
      'Highest Degree',
      'Awarding Institution',
      'ATS Terminal Doctorate',
      'Confessional Alignment',
      'Alignment Score',
      'Application Status',
      'Applied Date',
      'Cover Note',
    ];

    const escapeCsv = (val: string | null | undefined): string => {
      if (!val) return '""';
      return `"${val.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    };

    const rows = filteredApplicants.map((a) => [
      escapeCsv(a.scholarName),
      escapeCsv(a.title),
      escapeCsv(a.currentInstitution),
      escapeCsv(a.highestDegree),
      escapeCsv(a.degreeInstitution),
      a.isTerminalDoctorate ? '"YES"' : '"NO"',
      escapeCsv(a.alignmentLevel.toUpperCase()),
      `"${a.alignmentScorePercent}%"`,
      escapeCsv(a.status.toUpperCase()),
      escapeCsv(new Date(a.appliedAt).toISOString().split('T')[0]),
      escapeCsv(a.coverNote),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
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

  // Status Change Handler
  const handleStatusChange = async (inquiryId: string, newStatus: InquiryStatus) => {
    setUpdatingId(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) => (a.inquiryId === inquiryId ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      console.error('Failed to update applicant status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: InquiryStatus) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'read':
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'declined':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
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
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Term: {report.term}
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {report.postingTitle}
          </h1>
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
            <div className="text-xl font-display font-bold text-slate-900 dark:text-white">
              {report.totalApplicants}
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
            <option value="all">All Application Statuses</option>
            <option value="pending">Pending Triage</option>
            <option value="read">Under Review</option>
            <option value="accepted">Interview / Shortlisted</option>
            <option value="declined">Declined</option>
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

      {/* Applicant Comparison Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {filteredApplicants.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500">No candidate applications match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Candidate</th>
                  <th className="py-3.5 px-4">Terminal Degree (ATS Standard 3)</th>
                  <th className="py-3.5 px-4">Confessional Fit</th>
                  <th className="py-3.5 px-4">Applied</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredApplicants.map((a) => {
                  const alignment = getAlignmentBadge(a.alignmentLevel, a.alignmentScorePercent);
                  const isUpdating = updatingId === a.inquiryId;

                  return (
                    <tr
                      key={a.inquiryId}
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
                          {a.title ? `${a.title} · ` : ''}{a.currentInstitution || 'Independent Scholar'}
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
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {a.degreeInstitution}
                          </div>
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

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(a.appliedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="relative inline-block print:hidden">
                          <select
                            value={a.status}
                            disabled={isUpdating}
                            onChange={(e) => handleStatusChange(a.inquiryId, e.target.value as InquiryStatus)}
                            aria-label={`Update status for ${a.scholarName}`}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border appearance-none pr-6 cursor-pointer focus:outline-none ${getStatusBadge(
                              a.status
                            )}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="read">Under Review</option>
                            <option value="accepted">Interview / Shortlist</option>
                            <option value="declined">Declined</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <span className={`hidden print:inline px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(a.status)}`}>
                          {a.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right print:hidden">
                        <button
                          onClick={() => setSelectedApplicant(a)}
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

      {/* Candidate Dossier Modal */}
      {selectedApplicant && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dossier-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedApplicant(null)}
              aria-label="Close candidate dossier"
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  Common App Candidate Dossier
                </span>
                {selectedApplicant.isTerminalDoctorate && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    ATS Terminal Doctorate
                  </span>
                )}
              </div>
              <h2 id="dossier-modal-title" className="text-xl font-display font-bold text-slate-900 dark:text-white">
                {selectedApplicant.scholarName}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedApplicant.title} · {selectedApplicant.currentInstitution || 'Independent Scholar'}
              </p>
            </div>

            {/* Academic Credentials */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Highest Earned Degree
              </h3>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedApplicant.highestDegree || 'Not Specified'}
              </div>
              {selectedApplicant.degreeInstitution && (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Awarded by {selectedApplicant.degreeInstitution}
                </div>
              )}
            </div>

            {/* Confessional Alignment */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Affirmed Confessional Standards
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedApplicant.confessions.length > 0 ? (
                  selectedApplicant.confessions.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No historic standards selected.</span>
                )}
              </div>
            </div>

            {/* Candidate Cover Note */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Candidate Cover Note
              </h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedApplicant.coverNote}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
              <Link
                href={`/scholars/${selectedApplicant.scholarSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
              >
                <span>Inspect Full Scholar Profile & Syllabi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
