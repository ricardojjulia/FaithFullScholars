'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { ShieldCheck, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { evaluateConfessionalAlignment, ConfessionalAlignmentLevel } from '@/lib/search/confessional-matcher';

interface ConfessionalAlignmentMatrixProps {
  scholarName?: string;
  scholarConfessions: Array<{ id: string; name: string; slug?: string }>;
  scholarDoctrinalStatement?: string;
  targetStandardId?: string;
  targetTradition?: string;
}

export function ConfessionalAlignmentMatrix({
  scholarName,
  scholarConfessions,
  scholarDoctrinalStatement,
  targetStandardId,
  targetTradition
}: ConfessionalAlignmentMatrixProps) {
  const { t } = useTranslation();

  const alignment = evaluateConfessionalAlignment({
    targetStandardId,
    targetTradition,
    scholarConfessions,
    scholarDoctrinalStatement
  });

  const getLevelBadge = (level: ConfessionalAlignmentLevel) => {
    switch (level) {
      case 'full':
        return {
          label: t('confessional_lens.matrix_full_alignment'),
          bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500'
        };
      case 'substantial':
        return {
          label: t('confessional_lens.matrix_substantial_alignment'),
          bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          dot: 'bg-indigo-500'
        };
      case 'ecumenical':
        return {
          label: t('confessional_lens.matrix_ecumenical_alignment'),
          bg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          dot: 'bg-blue-500'
        };
      default:
        return {
          label: t('confessional_lens.matrix_distinctive_alignment'),
          bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          dot: 'bg-amber-500'
        };
    }
  };

  const badge = getLevelBadge(alignment.alignmentLevel);

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t('confessional_lens.confessional_lens_title')}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-semibold border border-indigo-200/60 dark:border-indigo-800/60">
                {t('confessional_lens.ai_verified')}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {scholarName ? `${scholarName} • ` : ''}{t('confessional_lens.confessional_lens_subtitle')}
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Alignment Score Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-600 dark:text-slate-400">
            {t('confessional_lens.theological_compatibility_index')}
          </span>
          <span className="font-bold text-slate-900 dark:text-white font-mono">
            {alignment.scorePercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${alignment.scorePercent}%` }}
          />
        </div>
      </div>

      {/* Verified Standards & Nuance Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t('confessional_lens.verified_confessional_standards')}</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {scholarConfessions.length > 0 ? (
              scholarConfessions.map((conf) => (
                <span
                  key={conf.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{conf.name}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">
                {t('confessional_lens.no_explicit_confessions')}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('confessional_lens.committee_theological_notes')}</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {alignment.details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
