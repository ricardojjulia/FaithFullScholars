'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export function DossierPrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.print();
        }
      }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-950 hover:bg-indigo-900 text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 transition-colors shadow-xs cursor-pointer"
    >
      <Printer className="w-4 h-4 stroke-[2]" />
      <span>Print / Save PDF Dossier</span>
    </button>
  );
}
