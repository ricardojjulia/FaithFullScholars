'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AiFacultyMatcherModal } from '@/components/search/ai-faculty-matcher-modal';

export function AiMatcherTriggerButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-900 to-indigo-850 hover:from-indigo-850 hover:to-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all border border-indigo-700/50 group"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform stroke-[2]" />
        <span>AI Search Matcher</span>
      </button>

      <AiFacultyMatcherModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
