import React from 'react';
import Link from 'next/link';
import { GraduationCap, Shield } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-2 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-900 text-amber-300 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 stroke-[1.75]" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
            FaithFull<span className="text-indigo-600 dark:text-indigo-400">Scholars</span>
          </span>
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          The Trusted Confessional Academic Directory & Faculty Network
        </p>
      </div>

      {/* Main Form Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800">
          {children}
        </div>

        {/* Footer Trust Marker */}
        <div className="mt-6 text-center flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured with PostgreSQL Row Level Security & Cloudflare Defense</span>
        </div>
      </div>
    </div>
  );
}
