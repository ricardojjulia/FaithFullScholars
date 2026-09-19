'use client';

import { useState } from 'react';

interface CourseItem {
  id: string;
  title: string;
  discipline: string;
  delivery_modes: string[];
  level: string;
  has_sample_video: boolean;
  syllabus_url?: string;
  status: 'published' | 'draft';
}

const INITIAL_COURSES: CourseItem[] = [
  {
    id: '1',
    title: 'Exegesis of Romans & Galatians',
    discipline: 'New Testament & Early Christianity',
    delivery_modes: ['online_async', 'modular_intensive'],
    level: 'Graduate (M.Div. / Th.M.)',
    has_sample_video: true,
    syllabus_url: 'https://example.edu/syllabi/romans-galatians.pdf',
    status: 'published'
  },
  {
    id: '2',
    title: 'Intermediate Biblical Greek Syntax',
    discipline: 'Biblical Languages',
    delivery_modes: ['online_sync', 'in_person'],
    level: 'Graduate (M.Div.)',
    has_sample_video: false,
    status: 'published'
  }
];

export default function CoursesManagerPage() {
  const [courses, setCourses] = useState<CourseItem[]>(INITIAL_COURSES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDiscipline, setNewDiscipline] = useState('New Testament & Early Christianity');
  const [newLevel, setNewLevel] = useState('Graduate (M.Div.)');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  function handleAddCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newCourse: CourseItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      discipline: newDiscipline,
      delivery_modes: ['online_async'],
      level: newLevel,
      has_sample_video: !!newVideoUrl.trim(),
      status: 'draft'
    };

    setCourses([...courses, newCourse]);
    setNewTitle('');
    setNewVideoUrl('');
    setShowAddModal(false);
  }

  function toggleStatus(id: string) {
    setCourses(
      courses.map((c) =>
        c.id === id ? { ...c, status: c.status === 'published' ? 'draft' : 'published' } : c
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">
            Courses & Syllabus Showcases
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Showcase the theological courses, modules, and free preview lectures you are available to teach, license, or adapt for institutions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <span>+</span>
          <span>Add Course Syllabus</span>
        </button>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                  {course.level}
                </span>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    course.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {course.status}
                </span>
              </div>

              <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                {course.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {course.discipline}
              </p>

              <div className="flex flex-wrap gap-1 pt-1">
                {course.delivery_modes.map((mode) => (
                  <span
                    key={mode}
                    className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full"
                  >
                    {mode.replace('_', ' ')}
                  </span>
                ))}
                {course.has_sample_video && (
                  <span className="text-[10px] font-medium bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span>▶</span>
                    <span>Video Preview</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleStatus(course.id)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
              >
                Toggle {course.status === 'published' ? 'Draft' : 'Publish'}
              </button>

              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">
                Edit Syllabus Details →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                Add Course Syllabus
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Johannine Literature & Theology"
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discipline
                  </label>
                  <select
                    value={newDiscipline}
                    onChange={(e) => setNewDiscipline(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>New Testament & Early Christianity</option>
                    <option>Old Testament & Hebrew Scriptures</option>
                    <option>Systematic Theology</option>
                    <option>Historical Theology & Church History</option>
                    <option>Biblical Languages</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Level
                  </label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Graduate (M.Div. / Th.M.)</option>
                    <option>Post-Graduate (Ph.D. / Th.D.)</option>
                    <option>Undergraduate (B.A.)</option>
                    <option>Certificate / Lay Ministry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sample Lecture YouTube URL (Optional)
                </label>
                <input
                  type="url"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
