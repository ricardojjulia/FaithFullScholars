import React from 'react';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { AdminNav } from '@/components/admin/admin-nav';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await verifyStaffUser();

  if (!auth.authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg dark:border-rose-900/50 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Access Restricted
          </h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {auth.error || 'You must be logged in as platform administrator to view the trust & moderation hub.'}
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
