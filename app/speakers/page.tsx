import { Metadata } from 'next';
import Link from 'next/link';
import { Mic, Search } from 'lucide-react';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import { SpeakerCard } from '@/components/speakers/speaker-card';
import { getAllSpeakers, TARGET_AUDIENCES, formatTargetAudience, TargetAudience } from '@/lib/speakers/speaker-service';
import { serializeJsonLd } from '@/lib/seo/json-ld';

export const metadata: Metadata = {
  title: 'Theological Speaker Bureau & Keynote Lecturers | FaithFull Scholars',
  description:
    'Discover and invite verified theological faculty, conference keynote speakers, chapel preachers, and academic symposium lecturers across orthodox Christian traditions.',
};

interface SpeakersPageProps {
  searchParams: Promise<{
    q?: string;
    audience?: string;
    discipline?: string;
    tradition?: string;
  }>;
}

export default async function SpeakersPage({ searchParams }: SpeakersPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const audience = params.audience || '';
  const discipline = params.discipline || '';
  const tradition = params.tradition || '';

  const speakers = await getAllSpeakers({
    audience,
    disciplineSlug: discipline,
    traditionSlug: tradition,
    query,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Theological Conference Speaker Bureau & Keynote Lecturers',
    description: 'Verified theological scholars available for academic symposiums, chapel lectures, and conferences.',
    url: 'https://faithfullscholars.org/speakers',
    numberOfItems: speakers.length,
    itemListElement: speakers.map((s, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Person',
        name: s.full_name,
        jobTitle: s.title,
        affiliation: s.institution_name,
        url: `https://faithfullscholars.org/scholars/${s.slug}`,
      },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      {/* Hero Section */}
      <section className="border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200/80 dark:border-amber-800/60 mb-4">
            <Mic className="w-3.5 h-3.5" />
            <span>Theological Speaker Bureau & Keynote Roster</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">
            Invite Confessional Scholars for Keynotes & Lectures
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Discover verified professors and theological keynote speakers for academic symposiums,
            annual lecture series, seminary chapels, and conferences.
          </p>

          {/* Search & Audience Chips */}
          <div className="mt-8 max-w-2xl mx-auto">
            <form method="GET" action="/speakers" className="relative flex items-center">
              <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search by speaker name, lecture topic, or theological theme..."
                className="w-full pl-11 pr-24 py-3 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-400 text-slate-900 dark:text-white shadow-xs"
              />
              <button
                type="submit"
                className="absolute right-2 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white transition-colors shadow-xs"
              >
                Search
              </button>
            </form>

            {/* Audience Filter Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <Link
                href="/speakers"
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors border ${
                  !audience
                    ? 'bg-indigo-900 text-white border-indigo-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                All Audiences
              </Link>
              {TARGET_AUDIENCES.map((aud) => (
                <Link
                  key={aud}
                  href={`/speakers?audience=${aud}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors border ${
                    audience === aud
                      ? 'bg-indigo-900 text-white border-indigo-900'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {formatTargetAudience(aud)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Speakers Roster */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">
              Verified Speakers ({speakers.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {audience ? `Filtering by ${formatTargetAudience(audience as TargetAudience)}` : 'Showing all active conference speakers'}
            </p>
          </div>

          {(query || audience) && (
            <Link
              href="/speakers"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Reset Filters
            </Link>
          )}
        </div>

        {speakers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-12 text-center max-w-md mx-auto">
            <Mic className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
              No matching speakers found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try refining your search terms or clearing the audience filter.
            </p>
            <Link
              href="/speakers"
              className="mt-4 inline-block text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white transition-colors"
            >
              Clear All Filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {speakers.map((speaker) => (
              <SpeakerCard key={speaker.scholar_id} speaker={speaker} />
            ))}
          </div>
        )}
      </main>

      <PublicFooter />

      {/* Script-Breakout-Safe JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </div>
  );
}
