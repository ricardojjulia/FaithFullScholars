import React from 'react';
import { requireStaffPage } from '@/lib/auth/guards';
import { PublicNav } from '@/components/shell/public-nav';
import { AdminNav } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Same 404 as requireStaffPage() in each admin page, so non-staff never learn
  // the admin area exists (Council Review 12, C-3). Pages still guard themselves:
  // a layout does not stop pages from rendering.
  await requireStaffPage();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <PublicNav />
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {children}
      </main>
    </div>
  );
}
