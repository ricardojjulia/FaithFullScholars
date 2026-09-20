import Link from 'next/link';
import { PublicCourseCard } from '@/lib/domain/queries';
import { formatDeliveryMode } from '@/lib/domain/taxonomies';

export function CourseCard({ course }: { course: PublicCourseCard }) {
  return (
    <div className="card-crisp p-6 flex flex-col justify-between">
      <div>
        {/* Top Badges: Discipline & Level */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {course.discipline ? (
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
              {course.discipline.name}
            </span>
          ) : (
            <span />
          )}
          <span className="text-[10px] font-medium text-slate-500 uppercase">
            {course.level}
          </span>
        </div>

        {/* Title */}
        <Link
          href={`/courses/${course.slug}`}
          className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2 mb-2"
        >
          {course.title}
        </Link>

        {/* Instructor */}
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3">
          <span>Instructor:</span>
          <Link
            href={`/scholars/${course.scholar.slug}`}
            className="font-medium text-indigo-700 dark:text-indigo-400 hover:underline"
          >
            {course.scholar.full_name}
          </Link>
          {course.scholar.current_institution && (
            <span className="text-slate-400">({course.scholar.current_institution})</span>
          )}
        </div>

        {/* Description */}
        {course.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
            {course.description}
          </p>
        )}

        {/* Delivery Modes */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {course.delivery_modes.map((mode) => (
            <span
              key={mode}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] border border-slate-200 dark:border-slate-700"
            >
              {formatDeliveryMode(mode)}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
          {course.public_preview_enabled ? '✓ Preview & Syllabus Available' : 'Course Catalog'}
        </span>
        <Link
          href={`/courses/${course.slug}`}
          className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          Inspect Syllabus →
        </Link>
      </div>
    </div>
  );
}
