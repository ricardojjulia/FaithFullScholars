import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllDisciplines, getAllTraditions } from '@/lib/domain/queries';
import { NewPostingForm } from '@/components/institution/new-posting-form';

export const metadata: Metadata = {
  title: 'Post New Opportunity | Institution Portal',
};

export default async function NewPostingPage() {
  const [disciplines, traditions] = await Promise.all([
    getAllDisciplines(),
    getAllTraditions(),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/institution/postings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Opportunities</span>
        </Link>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
          Create Academic Opportunity Call
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Publish a teaching vacancy, intensive modular seminar, or sabbatical cover for verified faculty.
        </p>
      </div>

      <NewPostingForm disciplines={disciplines} traditions={traditions} />
    </div>
  );
}
