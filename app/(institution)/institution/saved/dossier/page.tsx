'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Printer, ExternalLink, GraduationCap, ScrollText, BookOpen } from 'lucide-react';
import { ShortlistDossier } from '@/lib/inquiries/export-dossier';
import { BoardDocketSummary } from '@/components/institution/board-docket-summary';

export default function SearchCommitteeDossierPage() {
  const [dossier, setDossier] = useState<ShortlistDossier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDossier() {
      try {
        const res = await fetch('/api/institution/saved-scholars/export?format=json');
        if (res.ok) {
          const data = await res.json();
          setDossier(data.dossier);
        }
      } catch (err) {
        console.error('Error loading dossier:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDossier();
  }, []);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Assembling Committee Search Dossier...</p>
        </div>
      </div>
    );
  }

  const candidates = dossier?.candidates || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 print:p-0 print:m-0 print:max-w-none">
      {/* Top Controls — Hidden on Print */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/institution/saved"
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shortlist</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {candidates.length} Candidate{candidates.length === 1 ? '' : 's'} Selected
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href="/api/institution/saved-scholars/export?format=csv"
            download
            className="flex-1 sm:flex-initial px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition text-center inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </a>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Formal Header (Executive Document) */}
      <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-700 dark:text-indigo-400 font-bold block mb-1">
              FaithFull Scholars • Faculty Recruitment Dossier
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Academic Search Committee Candidate Dossier
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Prepared for <span className="font-semibold text-slate-800 dark:text-slate-200">{dossier?.institution_name || 'Academic Search Committee'}</span>
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 font-mono">
            <div>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div className="mt-0.5">Classification: Confidential Academic</div>
          </div>
        </div>
      </div>

      {/* Board Executive Docket & Candidate Decision Matrix */}
      <BoardDocketSummary candidates={candidates} institutionName={dossier?.institution_name} />

      {/* Detailed Candidate Dossier Cards */}
      <div className="space-y-6">
        <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500">
          Comprehensive Candidate Portfolios
        </h2>

        {candidates.map((c, index) => (
          <div
            key={c.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl card-crisp p-6 shadow-2xs space-y-5 print:break-inside-avoid print:shadow-none print:border-slate-300"
          >
            {/* Header / Identity */}
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold font-mono flex items-center justify-center">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">
                    {c.full_name}
                  </h3>
                  {c.title && (
                    <span className="text-xs text-slate-500">
                      • {c.title}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {c.current_institution || 'Independent Scholar'}
                  {c.primary_discipline && ` • ${c.primary_discipline}`}
                  {c.primary_tradition && ` (${c.primary_tradition})`}
                </p>
              </div>

              <div className="text-right print:hidden">
                <Link
                  href={`/scholars/${c.slug}`}
                  target="_blank"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>View Live Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Core Dossier Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Credentials & Education */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Academic Credentials</span>
                </span>
                <p className="text-slate-800 dark:text-slate-200">
                  <strong className="font-semibold">Terminal Degree: </strong>
                  {c.terminal_degree || 'Unspecified'}
                  {c.terminal_degree_institution && ` from ${c.terminal_degree_institution}`}
                  {c.graduation_year && ` (${c.graduation_year})`}
                </p>
              </div>

              {/* Confessional Standard Affirmations */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Confessional Standards & Creedal Subscription</span>
                </span>
                {c.confessions.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                    {c.confessions.map((conf, ci) => (
                      <li key={ci}>{conf}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic">No formal confessions listed</p>
                )}
              </div>
            </div>

            {/* Key Publications */}
            {c.key_publications.length > 0 && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Representative Scholarly Publications</span>
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                  {c.key_publications.map((pub, pi) => (
                    <li key={pi} className="leading-relaxed">
                      {pub}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Availability Formats & Relocation */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-500">Teaching Formats:</span>
              {c.availability_formats.length > 0 ? (
                c.availability_formats.map((fmt, fi) => (
                  <span
                    key={fi}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[11px]"
                  >
                    {fmt.replace('_', ' ')}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic">Not specified</span>
              )}

              {c.relocation_preference && (
                <span className="ml-auto text-[11px] text-slate-500">
                  Relocation: <span className="font-medium text-slate-700 dark:text-slate-300">{c.relocation_preference.replace(/_/g, ' ')}</span>
                </span>
              )}
            </div>

            {/* Internal Committee Notes */}
            {c.notes && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">Search Committee Notes: </span>
                {c.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Print Timestamp */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400 font-mono">
        Generated via FaithFull Scholars Academic Network • https://faithfullscholars.com
      </div>
    </div>
  );
}
