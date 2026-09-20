'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Download, FileText, GraduationCap, BookOpen, Bookmark, X } from 'lucide-react';
import { StructuredInquiryModal } from '@/components/inquiries/structured-inquiry-modal';

interface ShortlistedScholarItem {
  id: string;
  scholar_id: string;
  full_name: string;
  slug: string;
  primary_institution?: string | null;
  primary_discipline?: string | null;
  avatar_url?: string | null;
  notes?: string | null;
  created_at: string;
}

interface BookmarkedCourseItem {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  course_number?: string | null;
  delivery_mode?: string | null;
  scholar_name: string;
  scholar_id: string;
  notes?: string | null;
  created_at: string;
}

const DEFAULT_SAVED_SCHOLARS: ShortlistedScholarItem[] = [
  {
    id: 'save-1',
    scholar_id: 'f1000000-0000-0000-0000-000000000001',
    full_name: 'Dr. Calvin Edwards',
    slug: 'calvin-edwards',
    primary_institution: 'Covenant Theological Seminary',
    primary_discipline: 'Systematic Theology',
    notes: 'Top candidate for our Fall 2027 modular intensive on Federal Vision critiques.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'save-2',
    scholar_id: 'f1000000-0000-0000-0000-000000000002',
    full_name: 'Dr. Sarah Edwards',
    slug: 'sarah-edwards',
    primary_institution: 'Reformed Theological Seminary',
    primary_discipline: 'New Testament & Early Christianity',
    notes: 'Approved by academic dean for the annual Kantzer Lecture Series.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
];

const DEFAULT_SAVED_COURSES: BookmarkedCourseItem[] = [
  {
    id: 'course-save-1',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    title: 'Exegesis of Romans & Galatians',
    slug: 'exegesis-romans-galatians',
    course_number: 'NT 601',
    delivery_mode: 'modular_intensive',
    scholar_name: 'Dr. Calvin Edwards',
    scholar_id: 'f1000000-0000-0000-0000-000000000001',
    notes: 'High syllabus quality; good benchmark for our upcoming M.Div. curriculum revision.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export default function InstitutionSavedPage() {
  const [activeTab, setActiveTab] = useState<'scholars' | 'courses'>('scholars');
  const [scholars, setScholars] = useState<ShortlistedScholarItem[]>(DEFAULT_SAVED_SCHOLARS);
  const [courses, setCourses] = useState<BookmarkedCourseItem[]>(DEFAULT_SAVED_COURSES);
  const [selectedScholarForInquiry, setSelectedScholarForInquiry] = useState<ShortlistedScholarItem | null>(null);

  const handleRemoveScholar = async (id: string, scholarId: string) => {
    setScholars((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch('/api/institution/saved-scholars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: 'f2000000-0000-0000-0000-000000000001',
          scholarId,
        }),
      });
    } catch (err) {
      console.error('Error removing scholar:', err);
    }
  };

  const handleRemoveCourse = async (id: string, courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch('/api/institution/saved-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: 'f2000000-0000-0000-0000-000000000001',
          courseId,
        }),
      });
    } catch (err) {
      console.error('Error removing course:', err);
    }
  };

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
            href="/scholars"
            className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Discover Scholars
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
        <button
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
              No Shortlisted Candidates
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
                        {item.full_name.charAt(0)}
                      </div>
                      <div>
                        <Link
                          href={`/scholars/${item.slug}`}
                          className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition"
                        >
                          {item.full_name}
                        </Link>
                        <p className="text-xs text-slate-500">{item.primary_institution || 'Independent Scholar'}</p>
                        {item.primary_discipline && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                            {item.primary_discipline}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveScholar(item.id, item.scholar_id)}
                      title="Remove from shortlist"
                      className="text-slate-400 hover:text-rose-500 p-1 text-sm rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
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
                    <Link
                      href={`/scholars/${item.slug}`}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => setSelectedScholarForInquiry(item)}
                      className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Send Inquiry
                    </button>
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
            No Bookmarked Courses
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
                    <div className="flex items-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                      {item.course_number && <span>{item.course_number}</span>}
                      {item.delivery_mode && <span>• {item.delivery_mode.replace('_', ' ')}</span>}
                    </div>
                    <Link
                      href={`/courses/${item.slug}`}
                      className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-1">
                      Instructor: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.scholar_name}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveCourse(item.id, item.course_id)}
                    title="Remove from saved courses"
                    className="text-slate-400 hover:text-rose-500 p-1 text-sm rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
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
                <Link
                  href={`/courses/${item.slug}`}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                >
                  View Syllabus
                </Link>
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
            fullName: selectedScholarForInquiry.full_name,
            primaryInstitution: selectedScholarForInquiry.primary_institution,
            avatarUrl: selectedScholarForInquiry.avatar_url,
          }}
        />
      )}
    </div>
  );
}
