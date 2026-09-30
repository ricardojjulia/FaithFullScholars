import React from 'react';
import { PublicNav } from '@/components/shell/public-nav';
import { InstitutionNav } from '@/components/institution/institution-nav';

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="print:hidden">
        <PublicNav />
        <InstitutionNav />
      </div>
      <main className="flex-1 py-8 px-4 sm:px-6 print:p-0 print:m-0">
        <div className="max-w-7xl mx-auto print:max-w-none print:w-full">{children}</div>
      </main>
    </div>
  );
}
