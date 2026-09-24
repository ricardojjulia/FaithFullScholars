import Link from 'next/link';
import { Building2, MapPin, ScrollText, ArrowRight } from 'lucide-react';
import { PublicScholarCard } from '@/lib/domain/queries';
import { formatOpportunityType } from '@/lib/domain/taxonomies';
import { DistinguishedBadge } from './distinguished-badge';

export function ScholarCard({ scholar }: { scholar: PublicScholarCard }) {
  const primaryDiscipline = scholar.disciplines.find((d) => d.is_primary) || scholar.disciplines[0];
  const primaryTradition = scholar.traditions.find((t) => t.is_primary) || scholar.traditions[0];

  // Derive 2 initials for the avatar
  const initials = scholar.full_name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="card-crisp p-6 flex flex-col justify-between">
      <div>
        {/* Top bar: Avatar & Availability */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/80 text-indigo-950 dark:bg-indigo-950 dark:border-indigo-800 dark:text-amber-300 font-display font-bold text-sm flex items-center justify-center shrink-0 tracking-tight shadow-3xs">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/scholars/${scholar.slug}`}
                  className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1"
                >
                  {scholar.full_name}
                </Link>
                {scholar.profile_tier === 'distinguished_fellow' && (
                  <DistinguishedBadge size="sm" showLabel={false} />
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {scholar.title || scholar.institutional_role || 'Theological Scholar'}
              </p>
            </div>
          </div>

          {scholar.is_available_for_hire && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Available
            </span>
          )}
        </div>

        {/* Institution & Location */}
        <div className="mb-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          {scholar.current_institution && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 stroke-[1.75]" />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {scholar.current_institution}
              </span>
            </div>
          )}
          {scholar.location && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 stroke-[1.75]" />
              <span>{scholar.location}</span>
            </div>
          )}
        </div>

        {/* Biography Snippet */}
        {scholar.biography && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            {scholar.biography}
          </p>
        )}

        {/* Taxonomies & Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {primaryDiscipline && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-900 dark:text-indigo-300 text-[11px] font-medium">
              {primaryDiscipline.name}
            </span>
          )}
          {primaryTradition && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
              {primaryTradition.name}
            </span>
          )}
          {scholar.confessions.slice(0, 2).map((c) => (
            <span
              key={c.slug}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 text-[11px]"
              title={`Affirms ${c.name} (${c.adherence_level.replace(/_/g, ' ')})`}
            >
              <ScrollText className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0 stroke-[2]" />
              <span>{c.name.split('(')[0].trim()}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="text-[11px] text-slate-500">
          {scholar.opportunity_types.length > 0 ? (
            <span>
              Opportunities:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {formatOpportunityType(scholar.opportunity_types[0])}
                {scholar.opportunity_types.length > 1 && ` +${scholar.opportunity_types.length - 1}`}
              </strong>
            </span>
          ) : (
            <span>Teaching & Research</span>
          )}
        </div>

        <Link
          href={`/scholars/${scholar.slug}`}
          className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 flex items-center gap-1.5 transition-colors group/link"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
