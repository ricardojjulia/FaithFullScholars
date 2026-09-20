'use client';

import { useState } from 'react';
import Link from 'next/link';
import { generateScholarAnalytics, WeeklyActivityPoint } from '@/lib/analytics/scholar-analytics';

export default function ScholarAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'8w' | '30d' | 'ytd'>('8w');
  const [activeMetric, setActiveMetric] = useState<'impressions' | 'views' | 'downloads'>('impressions');

  const analytics = generateScholarAnalytics();
  const { overview, weeklyTimeline, topSearchKeywords, traditionDistribution, institutionVisitorTypes, actionableTips } = analytics;

  // Compute SVG chart coordinates dynamically from weeklyTimeline
  const chartHeight = 180;
  const chartWidth = 700;
  const paddingX = 40;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const maxVal = Math.max(
    ...weeklyTimeline.map((p) => Math.max(p.impressions, p.profileViews * 5, p.syllabusDownloads * 8)),
    100
  );

  const getPoints = (getValue: (p: WeeklyActivityPoint) => number) => {
    return weeklyTimeline.map((p, i) => {
      const x = paddingX + (i / (weeklyTimeline.length - 1)) * usableWidth;
      const val = getValue(p);
      const y = paddingY + usableHeight - (val / maxVal) * usableHeight;
      return { x, y, val, week: p.week };
    });
  };

  const impressionPoints = getPoints((p) => p.impressions);
  const viewPoints = getPoints((p) => p.profileViews * 5); // scaled for visual harmony
  const downloadPoints = getPoints((p) => p.syllabusDownloads * 8);

  const pointsToSvgPath = (pts: { x: number; y: number }[]) => {
    return pts.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = pts[idx - 1];
      const cx1 = (prev.x + curr.x) / 2;
      return `${acc} C ${cx1} ${prev.y}, ${cx1} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  };

  const impressionPath = pointsToSvgPath(impressionPoints);
  const impressionArea = `${impressionPath} L ${impressionPoints[impressionPoints.length - 1].x} ${chartHeight - paddingY} L ${impressionPoints[0].x} ${chartHeight - paddingY} Z`;

  const viewPath = pointsToSvgPath(viewPoints);
  const downloadPath = pointsToSvgPath(downloadPoints);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">
              Profile & Discovery Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track provost, dean, and search committee engagement with your research and course offerings.
          </p>
        </div>

        {/* Time Filter & Print Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setTimeRange('8w')}
              className={`px-3 py-1 rounded-lg transition-all ${timeRange === '8w' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'}`}
            >
              8 Weeks
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 rounded-lg transition-all ${timeRange === '30d' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange('ytd')}
              className={`px-3 py-1 rounded-lg transition-all ${timeRange === 'ytd' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'}`}
            >
              YTD
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Impressions */}
        <div
          onClick={() => setActiveMetric('impressions')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeMetric === 'impressions'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Search Impressions
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              +{overview.searchImpressionsTrend}%
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-slate-900 dark:text-white">
            {overview.searchImpressions.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Times featured in provost query results
          </p>
        </div>

        {/* Profile Views */}
        <div
          onClick={() => setActiveMetric('views')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeMetric === 'views'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Profile Views
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              +{overview.profileViewsTrend}%
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-slate-900 dark:text-white">
            {overview.profileViews.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Detailed faculty dossiers opened
          </p>
        </div>

        {/* Syllabus Downloads */}
        <div
          onClick={() => setActiveMetric('downloads')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeMetric === 'downloads'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Syllabus Previews
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              +{overview.syllabusDownloadsTrend}%
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-serif text-slate-900 dark:text-white">
            {overview.syllabusDownloads.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Course outlines inspected by deans
          </p>
        </div>

        {/* Inquiries */}
        <Link
          href="/dashboard/inquiries"
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Structured Inquiries
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              Active
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
              {overview.inquiriesCount}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
              View Inbox →
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Teaching & lecturing opportunities
          </p>
        </Link>
      </div>

      {/* SVG Engagement Chart Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-bold text-slate-900 dark:text-white">
              8-Week Institutional Discovery Velocity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Weekly search impressions vs. direct profile inspections
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Search Impressions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Profile Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Syllabi Previews</span>
            </div>
          </div>
        </div>

        {/* Responsive Zero-Bloat SVG Line Chart */}
        <div className="w-full overflow-x-auto pt-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="impressionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = paddingY + usableHeight * (1 - pct);
              return (
                <g key={idx}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeDasharray="4,4"
                  />
                </g>
              );
            })}

            {/* Area Fill for Impressions */}
            <path d={impressionArea} fill="url(#impressionGrad)" />

            {/* Trend Lines */}
            <path
              d={impressionPath}
              fill="none"
              stroke="#4f46e5"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d={viewPath}
              fill="none"
              stroke="#14b8a6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d={downloadPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="4,3"
            />

            {/* Dots and Labels */}
            {impressionPoints.map((pt, idx) => (
              <g key={idx} className="group">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#4f46e5"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-sans"
                >
                  {pt.week}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Two-Column Middle Grid: Top Search Keywords & Tradition Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keywords */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                Institutional Search Keywords
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exact terms provosts & search committees queried to find your profile
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Top Ranked
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topSearchKeywords.map((kw, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {kw.keyword}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      {kw.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-serif font-bold text-slate-700 dark:text-slate-300">
                    {kw.impressions} queries
                  </span>
                  <span
                    className={`text-xs ${
                      kw.trend === 'up'
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {kw.trend === 'up' ? '↑' : '→'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tradition & Institutional Demographics */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-serif font-bold text-slate-900 dark:text-white">
              Institutional Tradition Affinity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theological traditions of seminaries and universities inspecting your CV
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {traditionDistribution.map((trad, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300">{trad.tradition}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{trad.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${trad.percentage}%`,
                      backgroundColor: trad.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Visitor Institution Classification
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {institutionVisitorTypes.map((type, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <span className="text-slate-700 dark:text-slate-300 font-semibold block truncate">
                    {type.type}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {type.percentage}% ({type.count} visits)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Profile Optimization Recommendations */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-serif font-bold text-slate-900 dark:text-white">
            Algorithmic Visibility Recommendations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Optimize your scholar listing to increase institutional match rates and inquiry velocity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {actionableTips.map((tip) => (
            <div
              key={tip.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-3"
            >
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mb-2 ${
                    tip.impact === 'High Impact'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                  }`}
                >
                  {tip.impact}
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">{tip.title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {tip.description}
                </p>
              </div>

              <Link
                href={tip.actionHref}
                className="w-full text-center py-2 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-2xs"
              >
                {tip.actionLabel} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
