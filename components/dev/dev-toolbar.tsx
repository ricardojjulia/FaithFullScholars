"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ExternalLink, ArrowRight, Zap } from "lucide-react";

export function DevToolbar() {
  const [isOpen, setIsOpen] = useState(false);

  // In production builds, Next.js dead-code eliminates this block
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <aside
      aria-label="Developer diagnostics toolbar"
      className="fixed bottom-4 right-4 z-50 font-mono text-xs select-none"
    >
      {isOpen ? (
        <div className="bg-slate-900/95 text-slate-100 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md w-72 transition-all">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-white tracking-wider text-[11px] uppercase">
                Dev Console (:3845)
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Minimize toolbar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between py-1 px-1.5 rounded hover:bg-slate-800/60">
              <span className="text-slate-400">Next.js App:</span>
              <span className="text-indigo-400 font-semibold">:3845</span>
            </div>
            <div className="flex justify-between py-1 px-1.5 rounded hover:bg-slate-800/60">
              <span className="text-slate-400">Supabase API:</span>
              <span className="text-slate-300">:49321</span>
            </div>
            <div className="flex justify-between py-1 px-1.5 rounded hover:bg-slate-800/60">
              <span className="text-slate-400">PostgreSQL:</span>
              <span className="text-slate-300">:49322</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 grid grid-cols-2 gap-1.5 text-[11px]">
            <a
              href="http://127.0.0.1:49323"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-center rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 transition-colors inline-flex items-center justify-center gap-1"
            >
              <span>Studio</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="http://127.0.0.1:49324"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-center rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 transition-colors inline-flex items-center justify-center gap-1"
            >
              <span>Mailbox</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 text-center">
            <Link
              href="/dev/status"
              className="w-full py-1 text-center rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors text-[11px] font-semibold inline-flex items-center justify-center gap-1"
            >
              <span>Full Diagnostics Screen</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700 shadow-lg backdrop-blur transition-all hover:scale-105 cursor-pointer"
          title="Open Developer Toolbar"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-indigo-400">DEV :3845</span>
          <Zap className="w-3 h-3 text-amber-500" />
        </button>
      )}
    </aside>
  );
}
