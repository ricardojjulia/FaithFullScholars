'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Award, UserCheck, ShieldCheck } from 'lucide-react';
import { ShortlistDossierCandidate } from '@/lib/inquiries/export-dossier';

interface BoardDocketSummaryProps {
  candidates: ShortlistDossierCandidate[];
  institutionName?: string;
}

export function BoardDocketSummary({ candidates, institutionName }: BoardDocketSummaryProps) {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    candidates.forEach((c, idx) => {
      initial[c.id] = idx === 0 ? 'highly_recommended' : 'recommended';
    });
    return initial;
  });

  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleRecommendationChange = (candidateId: string, value: string) => {
    setRecommendations((prev) => ({ ...prev, [candidateId]: value }));
  };

  const handleNoteChange = (candidateId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [candidateId]: value }));
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'highly_recommended':
        return {
          label: t('board_docket.highly_recommended'),
          style: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
        };
      case 'recommended':
        return {
          label: t('board_docket.recommended'),
          style: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
        };
      default:
        return {
          label: t('board_docket.alternative'),
          style: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
        };
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/80 border-2 border-indigo-100 dark:border-indigo-950/60 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-900 text-white shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t('board_docket.board_executive_docket_title')}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {institutionName ? `${institutionName} • ` : ''}{t('board_docket.board_docket_subtitle')}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-full text-[11px] font-semibold text-amber-800 dark:text-amber-300">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('board_docket.confidential_board_record')}</span>
        </div>
      </div>

      {/* Comparative Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-3.5">{t('board_docket.candidate')}</th>
              <th className="py-3 px-3.5">{t('board_docket.terminal_credentials')}</th>
              <th className="py-3 px-3.5">{t('board_docket.primary_discipline')}</th>
              <th className="py-3 px-3.5">{t('board_docket.confessional_stance')}</th>
              <th className="py-3 px-3.5">{t('board_docket.verified_pubs')}</th>
              <th className="py-3 px-3.5">{t('board_docket.committee_tier')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {candidates.map((c) => {
              const currentRec = recommendations[c.id] || 'recommended';
              const badge = getRecommendationBadge(currentRec);
              return (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{c.full_name}</span>
                    </div>
                    {c.title && <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{c.title}</span>}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {c.terminal_degree ? `${c.terminal_degree}` : 'PhD'}
                    <span className="text-slate-400 block text-[10px]">{c.terminal_degree_institution || c.current_institution || 'Accredited'}</span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">{c.primary_discipline || 'Theology'}</span>
                    <span className="text-slate-400 block text-[10px]">{c.primary_tradition || 'Ecumenical'}</span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                      {c.confessions.length > 0 ? c.confessions[0] : 'Evangelical Orthodox'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    <span>{c.key_publications?.length || 0} Pubs • {c.availability_formats?.length || 0} Formats</span>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="print:hidden">
                      <select
                        value={currentRec}
                        onChange={(e) => handleRecommendationChange(c.id, e.target.value)}
                        className="text-[11px] font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 shadow-2xs focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="highly_recommended">{t('board_docket.highly_recommended')}</option>
                        <option value="recommended">{t('board_docket.recommended')}</option>
                        <option value="alternative">{t('board_docket.alternative')}</option>
                      </select>
                    </div>
                    <div className="hidden print:block">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badge.style}`}>
                        {badge.label}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Committee Deliberation Notes (Interactive & Printable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {candidates.map((c) => (
          <div key={`notes-${c.id}`} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {c.full_name} • {t('board_docket.search_committee_eval')}
              </span>
              <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                {recommendations[c.id] === 'highly_recommended' ? '★ Tier 1 Finalist' : 'Finalist'}
              </span>
            </div>
            <textarea
              rows={2}
              value={notes[c.id] || ''}
              onChange={(e) => handleNoteChange(c.id, e.target.value)}
              placeholder={t('board_docket.enter_board_deliberation_notes')}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
