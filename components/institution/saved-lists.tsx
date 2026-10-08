'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Download, FileText, GraduationCap, BookOpen, Bookmark, X, ShieldCheck } from 'lucide-react';
import { StructuredInquiryModal } from '@/components/inquiries/structured-inquiry-modal';
import type { BookmarkedCourseItem, ShortlistedScholarItem } from '@/lib/inquiries/mappers';

interface SavedListsProps {
  initialScholars: ShortlistedScholarItem[];
  initialCourses: BookmarkedCourseItem[];
}

export function SavedLists({ initialScholars, initialCourses }: SavedListsProps) {
  const [activeTab, setActiveTab] = useState<'scholars' | 'courses'>('scholars');
  const [scholars, setScholars] = useState<ShortlistedScholarItem[]>(initialScholars);
  const [courses, setCourses] = useState<BookmarkedCourseItem[]>(initialCourses);
  const [selectedScholarForInquiry, setSelectedScholarForInquiry] = useState<ShortlistedScholarItem | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Pessimistic removal through an explicit DELETE (never the add/remove toggle):
  // the row leaves the list only after the server confirms it.
  const removeItem = async (rowId: string, url: string, onRemoved: () => void) => {
    setRemovingId(rowId);
    setRemoveError(null);
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        setRemoveError('We could not remove that item. Please try again.');
        return;
      }
      onRemoved();
    } catch {
      setRemoveError('We could not remove that item. Please check your connection and try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveScholar = (item: ShortlistedScholarItem) =>
    removeItem(
      item.id,
      `/api/institution/saved-scholars?scholarId=${encodeURIComponent(item.scholar_id)}`,
      () => setScholars((prev) => prev.filter((s) => s.id !== item.id))
    );

  const handleRemoveCourse = (item: BookmarkedCourseItem) =>
    removeItem(
      item.id,
      `/api/institution/saved-courses?courseId=${encodeURIComponent(item.course_id)}`,
      () => setCourses((prev) => prev.filter((c) => c.id !== item.id))
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Shortlists & Bookmarks
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage prospective adjunct faculty candidates and benchmark course syllabi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/institution/saved-scholars/export?format=csv"
            download
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <Link
            href="/institution/saved/dossier"
            className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Committee Dossier</span>
          </Link>
          <Link
            href="/institution/saved/accreditation"
            className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Accreditation Matrix</span>
          </Link>
          <Link
            href="/scholars"
            className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Discover Scholars
          </Link>
        </div>
      </div>

      {removeError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs font-semibold text-amber-900 dark:text-amber-200"
        >
          {removeError}
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Saved items" className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
        <button
          role="tab"
          aria-selected={activeTab === 'scholars'}
          onClick={() => setActiveTab('scholars')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'scholars'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Shortlisted Scholars</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {scholars.length}
          </span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'courses'}
          onClick={() => setActiveTab('courses')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'courses'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Saved Courses</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {courses.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'scholars' ? (
        scholars.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              No saved scholars yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              While browsing scholars, click &ldquo;Save to Shortlist&rdquo; to collect promising professors for upcoming terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scholars.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-base text-slate-700 dark:text-slate-200 overflow-hidden">
                        {item.full_name ? item.full_name.charAt(0) : '?'}
                      </div>
                      <div>
                        {item.full_name && item.slug ? (
                          <>
                            <Link
                              href={`/scholars/${item.slug}`}
                              className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition"
                            >
                              {item.full_name}
                            </Link>
                            <p className="text-xs text-slate-500">{item.primary_institution || 'Independent Scholar'}</p>
                          </>
                        ) : (
                          <>
                            <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                              Profile unavailable
                            </span>
                            <p className="text-xs text-slate-500">
                              This scholar&rsquo;s profile is not currently visible. You can still remove it.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveScholar(item)}
                      disabled={removingId === item.id}
                      title="Remove from shortlist"
                      aria-label={`Remove ${item.full_name ?? 'unavailable scholar'} from shortlist`}
                      className="text-slate-400 hover:text-rose-500 p-1 text-sm rounded-lg transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {item.notes && (
                    <div className="mt-3 p-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-semibold">Internal Note: </span>
                      {item.notes}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">
                    Saved {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    {item.slug && (
                      <Link
                        href={`/scholars/${item.slug}`}
                        className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                      >
                        View Profile
                      </Link>
                    )}
                    {item.full_name && (
                      <button
                        type="button"
                        onClick={() => setSelectedScholarForInquiry(item)}
                        className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Send Inquiry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            No saved courses yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Bookmark syllabi and courses from the Course Showcase to inspect learning objectives and reading lists.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    {item.title && item.slug ? (
                      <>
                        {item.delivery_mode && (
                          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                            {item.delivery_mode.replaceAll('_', ' ')}
                          </div>
                        )}
                        <Link
                          href={`/courses/${item.slug}`}
                          className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition"
                        >
                          {item.title}
                        </Link>
                        {item.scholar_name && (
                          <p className="text-xs text-slate-500 mt-1">
                            Instructor: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.scholar_name}</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-base font-bold text-slate-700 dark:text-slate-300">Course unavailable</span>
                        <p className="text-xs text-slate-500 mt-1">
                          This course is not currently visible. You can still remove it.
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveCourse(item)}
                    disabled={removingId === item.id}
                    title="Remove from saved courses"
                    aria-label={`Remove ${item.title ?? 'unavailable course'} from saved courses`}
                    className="text-slate-400 hover:text-rose-500 p-1 text-sm rounded-lg transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {item.notes && (
                  <div className="mt-3 p-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-semibold">Note: </span>
                    {item.notes}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[11px] text-slate-400">
                  Bookmarked {new Date(item.created_at).toLocaleDateString()}
                </span>
                {item.slug && (
                  <Link
                    href={`/courses/${item.slug}`}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    View Syllabus
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inquiry Modal */}
      {selectedScholarForInquiry && (
        <StructuredInquiryModal
          isOpen={true}
          onClose={() => setSelectedScholarForInquiry(null)}
          scholar={{
            id: selectedScholarForInquiry.scholar_id,
            fullName: selectedScholarForInquiry.full_name ?? '',
            primaryInstitution: selectedScholarForInquiry.primary_institution,
            avatarUrl: selectedScholarForInquiry.avatar_url,
          }}
        />
      )}
    </div>
  );
}
