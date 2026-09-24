'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, X, GraduationCap, ScrollText, BookOpen, FileSpreadsheet, Briefcase, Building2, Search, Check, ArrowRight } from 'lucide-react';
import { FacultyMatchResult } from '@/lib/ai/gemini-faculty-matcher';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface AiFacultyMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_PROMPTS = [
  'Cambridge or Oxford doctorate in New Testament & Greek syntax',
  'Historical theologian subscribing to the Westminster Confession',
  '1689 London Baptist professor for Old Testament & Hebrew poetry',
  'Adjunct or modular instructor available for online and summer intensives',
];

export function AiFacultyMatcherModal({ isOpen, onClose }: AiFacultyMatcherModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FacultyMatchResult[]>([]);
  const [engine, setEngine] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery ?? query).trim();
    if (!q) return;

    if (searchQuery) {
      setQuery(searchQuery);
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/match-faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to match faculty candidates.');
      }

      setResults(data.matches || []);
      setEngine(data.engine || 'heuristic');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during search.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-800/80 border border-indigo-700/60 text-amber-300 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 stroke-[2]" />
              <span>{t('ai_matcher.modal_badge')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-white">
              {t('ai_matcher.modal_title')}
            </h2>
            <p className="text-xs text-indigo-200 max-w-xl leading-relaxed">
              {t('ai_matcher.modal_subtitle')}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ai_matcher.prompt_placeholder')}
                className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 shadow-2xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  {t('search.clear')}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-6 py-3 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold rounded-2xl shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('ai_matcher.matching_in_progress')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 stroke-[2]" />
                  <span>{t('ai_matcher.find_matches')}</span>
                </>
              )}
            </button>
          </form>

          {/* Sample Prompts */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Try search committee queries:</span>
            {SAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSearch(prompt)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors shadow-3xs"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs">
              <strong>Error:</strong> {error}
            </div>
          )}

          {isLoading && (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base tracking-tight">
                  Evaluating Faculty Portfolios & Doctrinal Formularies...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Synthesizing terminal credentials, confessional subscriptions, and syllabus publications across approved scholars.
                </p>
              </div>
            </div>
          )}

          {!isLoading && results.length === 0 && !error && (
            <div className="py-14 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900 shadow-inner">
                <Search className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base tracking-tight">
                Ready for Academic Search Matching
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Type an inquiry or click any sample search above to see candidate match scores and citation-grounded evidence.
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Found <strong className="text-slate-900 dark:text-white">{results.length}</strong> matched candidates
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  Engine: {engine === 'gemini' ? 'Google Gemini AI' : 'Deterministic Theological Heuristic'}
                </span>
              </div>

              <div className="space-y-4">
                {results.map((match) => (
                  <div
                    key={match.scholarId}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 hover:border-indigo-300 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/scholars/${match.slug}`}
                            onClick={onClose}
                            className="text-base font-display font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors tracking-tight"
                          >
                            {match.fullName}
                          </Link>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              match.fitLevel === 'Exceptional Fit'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                            }`}
                          >
                            {match.fitLevel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {match.academicTitle || 'Faculty Scholar'} • {match.currentInstitution || 'Theological Higher Ed'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-lg font-display font-bold text-indigo-950 dark:text-indigo-300 tracking-tight">
                            {match.fitScore}%
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block -mt-1">
                            Fit Score
                          </span>
                        </div>
                        <Link
                          href={`/scholars/${match.slug}`}
                          onClick={onClose}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 group"
                        >
                          <span>View Dossier</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Committee Summary */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      <strong className="text-slate-900 dark:text-white">Search Committee Note: </strong>
                      {match.committeeSummary}
                    </div>

                    {/* Grounded Citations */}
                    {match.groundedCitations.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Verified Portfolio Citations
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {match.groundedCitations.map((cit, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs space-y-0.5"
                            >
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 truncate">
                                <span className="shrink-0 flex items-center">
                                  {cit.sourceType === 'credential' && <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 stroke-[2]" />}
                                  {cit.sourceType === 'confession' && <ScrollText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2]" />}
                                  {cit.sourceType === 'publication' && <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[2]" />}
                                  {cit.sourceType === 'course' && <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 stroke-[2]" />}
                                  {cit.sourceType === 'availability' && <Briefcase className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2]" />}
                                  {cit.sourceType === 'biography' && <Building2 className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />}
                                </span>
                                <span className="truncate">{cit.title}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {cit.quoteOrDetail}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths & Notes */}
                    {match.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {match.strengths.map((str, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium border border-emerald-100 dark:border-emerald-900 inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{str}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Human provost oversight required per ADR 0005 & Governing Decision 11</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
