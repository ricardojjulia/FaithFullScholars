import { Metadata } from 'next';
import { ScholarInquiryInbox } from '@/components/inquiries/scholar-inquiry-inbox';

export const metadata: Metadata = {
  title: 'Institutional Inquiries | Scholar Workspace',
  description: 'Manage incoming teaching, lecturing, and academic outreach opportunities from accredited theological seminaries and colleges.',
};

export default function ScholarInquiriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Institutional Opportunities & Outreach
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Review and respond to structured academic inquiries from seminaries, Bible colleges, and ministry programs.
        </p>
      </div>

      <ScholarInquiryInbox />
    </div>
  );
}
