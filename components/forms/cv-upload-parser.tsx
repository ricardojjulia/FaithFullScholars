'use client';

import { useState } from 'react';
import { FileUp, FileText, Zap, UploadCloud, Check, Sparkles } from 'lucide-react';
import { parseCvText, ParsedCvDraft } from '@/lib/profiles/cv-parser';

interface CvUploadParserProps {
  onParsed: (draft: ParsedCvDraft) => void;
  isProcessing?: boolean;
}

const SAMPLE_THEOLOGICAL_CV = `Dr. Katharine G. Vance, Ph.D.
Associate Professor of Systematic Theology & Historical Doctrine
Gordon-Conwell Theological Seminary
Email: kvance@gordonconwell.edu
Location: South Hamilton, MA

EDUCATION
Ph.D. in Systematic Theology, University of Edinburgh, 2017
Th.M. in Historical Theology, Westminster Theological Seminary, 2013
M.Div., Covenant Theological Seminary, 2011
B.A. in Philosophy and Biblical Studies, Taylor University, 2007

RESEARCH LANGUAGES
Latin, German, Koine Greek, Biblical Hebrew

PUBLICATIONS
Books:
The Trinity and Divine Simplicity: Historical Formulations and Contemporary Dogmatics. Baker Academic, 2022.
Patristic Christology and the Reformed Orthodox. Oxford University Press, 2024.

Articles:
"Creatio Ex Nihilo and Early Christian Cosmology." International Journal of Systematic Theology, 2021.
"Divine Impassibility in the Thought of John Owen." Scottish Journal of Theology, 2019.

DOCTRINAL STATEMENT
I joyfully confess the historic Christian faith expressed in the Nicene-Constantinopolitan Creed and Chalcedonian Definition. As a Reformed theologian, I subscribe wholeheartedly to the Westminster Confession of Faith and Catechisms. I affirm the complete truthfulness and divine inspiration of the Old and New Testaments.
`;

export function CvUploadParser({ onParsed, isProcessing }: CvUploadParserProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedCvDraft | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function processFile(file: File) {
    setFileName(file.name);
    // For text-based files or markdown
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseCvText(content);
        setParsedPreview(result);
        onParsed(result);
      }
    };
    reader.readAsText(file);
  }

  function handleParsePasted() {
    if (!pastedText.trim()) return;
    const result = parseCvText(pastedText);
    setParsedPreview(result);
    onParsed(result);
  }

  function handleLoadSample() {
    setPastedText(SAMPLE_THEOLOGICAL_CV);
    setActiveTab('paste');
    const result = parseCvText(SAMPLE_THEOLOGICAL_CV);
    setParsedPreview(result);
    onParsed(result);
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 px-4 pt-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 inline-flex items-center gap-2 ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-900 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Upload Document (PDF/TXT)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 inline-flex items-center gap-2 ${
            activeTab === 'paste'
              ? 'border-indigo-600 text-indigo-900 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Paste CV Text</span>
        </button>

        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1.5 py-1 px-2"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Load Sample CV</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'upload' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors flex flex-col items-center justify-center cursor-pointer ${
              dragActive
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/40 dark:bg-slate-800/40'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Drag and drop your academic CV or syllabus
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Supports plain text (.txt, .md) and document text. Our parsing engine automatically infers your degrees, institutions, publications, and disciplines into editable draft suggestions.
            </p>

            <label className="mt-4 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs transition-colors">
              <span>Browse File</span>
              <input
                type="file"
                accept=".txt,.md,.doc,.docx,.pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isProcessing}
              />
            </label>

            {fileName && (
              <div className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Loaded file:</span>
                <span className="font-semibold">{fileName}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Paste your curriculum vitae or bio text below:
            </label>
            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your CV text here..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParsePasted}
                disabled={!pastedText.trim() || isProcessing}
                className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                {isProcessing ? 'Analyzing...' : 'Parse CV Content'}
              </button>
            </div>
          </div>
        )}

        {/* Parsed Suggestions Banner */}
        {parsedPreview && (
          <div className="mt-6 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                  Extraction Complete ({parsedPreview.confidence.toUpperCase()} Confidence)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {parsedPreview.raw_line_count} lines processed
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Identified Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {parsedPreview.full_name || 'Not detected'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Degrees Found</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {parsedPreview.credentials.length} credentials ({parsedPreview.credentials.map((c) => c.degree).join(', ') || 'None'})
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Publications</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {parsedPreview.publications.length} works extracted
                </span>
              </div>
            </div>

            {parsedPreview.suggested_disciplines.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Inferred Disciplines:</span>
                {parsedPreview.suggested_disciplines.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded-full bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-[10px] font-medium"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
