'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react';
import type { CourseLevel, CourseVisibility, DeliveryMode } from '@/lib/domain/types';
import {
  COURSE_LEVELS,
  DELIVERY_MODES,
  DELIVERY_MODE_LABELS,
  LEVEL_LABELS,
  TEXT_MAX,
  TITLE_MAX,
  VISIBILITY_LABELS,
  splitDeliveryModes,
} from '@/lib/courses/course-validation';
import type { DisciplineOption, ScholarCourse } from '@/lib/courses/course-service';

interface FormState {
  title: string;
  description: string;
  reading_list: string;
  level: CourseLevel;
  primary_discipline_id: string;
  delivery_modes: DeliveryMode[];
  visibility: CourseVisibility;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  reading_list: '',
  level: 'graduate',
  primary_discipline_id: '',
  delivery_modes: [],
  visibility: 'private',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

const KNOWN_FIELDS = [
  'title',
  'description',
  'reading_list',
  'level',
  'primary_discipline_id',
  'discipline_ids',
  'delivery_modes',
  'visibility',
];
const PUBLISH_NOTE = 'Published courses appear publicly right away. They are not reviewed by an administrator.';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}

function toForm(course: ScholarCourse): FormState {
  return {
    title: course.title,
    description: course.description ?? '',
    reading_list: course.reading_list ?? '',
    level: course.level,
    primary_discipline_id: course.primary_discipline_id ?? '',
    delivery_modes: splitDeliveryModes(course.delivery_modes).valid,
    visibility: course.visibility,
  };
}

async function readError(res: Response): Promise<{ message: string; fields: Record<string, string> }> {
  try {
    const data = (await res.json()) as { error?: string; fields?: Record<string, string> };
    return { message: data.error ?? 'Something went wrong. Please try again.', fields: data.fields ?? {} };
  } catch {
    return { message: 'Something went wrong. Please try again.', fields: {} };
  }
}

export function CoursesManager({
  initialCourses,
  disciplines,
  profileStatus,
}: {
  initialCourses: ScholarCourse[];
  disciplines: DisciplineOption[];
  profileStatus: string;
}) {
  const uid = useId();
  const [courses, setCourses] = useState<ScholarCourse[]>(initialCourses);
  const [editing, setEditing] = useState<ScholarCourse | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [removedModes, setRemovedModes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [status, setStatus] = useState('');

  const openerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const disciplineName = (id: string | null) => disciplines.find((d) => d.id === id)?.name ?? null;

  function openDialog(target: ScholarCourse | 'new') {
    openerRef.current = document.activeElement as HTMLElement | null;
    setEditing(target);
    setForm(target === 'new' ? EMPTY_FORM : toForm(target));
    setRemovedModes(target === 'new' ? [] : splitDeliveryModes(target.delivery_modes).removed);
    setFieldErrors({});
    setFormError(null);
  }

  function closeDialog() {
    setEditing(null);
    openerRef.current?.focus();
  }

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  // Escape closes the dialog even when focus was lost (for example while the submit button is disabled).
  const isOpen = editing !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(null);
        openerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  function onDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'input, select, textarea, button:not([disabled])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function toggleMode(mode: DeliveryMode) {
    setForm((f) => ({
      ...f,
      delivery_modes: f.delivery_modes.includes(mode)
        ? f.delivery_modes.filter((m) => m !== mode)
        : [...f.delivery_modes, mode],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    setFormError(null);
    setFieldErrors({});
    const isNew = editing === 'new';
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      reading_list: form.reading_list,
      level: form.level,
      primary_discipline_id: form.primary_discipline_id || null,
      delivery_modes: form.delivery_modes,
    };
    if (!isNew) payload.visibility = form.visibility;
    try {
      const res = await fetch(isNew ? '/api/scholars/courses' : `/api/scholars/courses/${editing.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await readError(res);
        setFormError(err.message);
        setFieldErrors(err.fields);
        return;
      }
      const { course } = (await res.json()) as { course: ScholarCourse };
      setCourses((list) => (isNew ? [course, ...list] : list.map((c) => (c.id === course.id ? course : c))));
      setStatus(isNew ? `Added "${course.title}". It is private until you publish it.` : `Saved "${course.title}".`);
      setEditing(null);
      openerRef.current?.focus();
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function setVisibility(course: ScholarCourse, visibility: CourseVisibility) {
    setBusyId(course.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/scholars/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) {
        setRowError({ id: course.id, message: (await readError(res)).message });
        return;
      }
      const { course: updated } = (await res.json()) as { course: ScholarCourse };
      setCourses((list) => list.map((c) => (c.id === updated.id ? updated : c)));
      setStatus(`"${updated.title}" is now ${VISIBILITY_LABELS[updated.visibility].toLowerCase()}.`);
    } catch {
      setRowError({ id: course.id, message: 'Something went wrong. Please try again.' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(course: ScholarCourse) {
    setBusyId(course.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/scholars/courses/${course.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setRowError({ id: course.id, message: (await readError(res)).message });
        return;
      }
      setCourses((list) => list.filter((c) => c.id !== course.id));
      setConfirmDeleteId(null);
      setStatus(`Deleted "${course.title}".`);
    } catch {
      setRowError({ id: course.id, message: 'Something went wrong. Please try again.' });
    } finally {
      setBusyId(null);
    }
  }

  const badgeClass = (v: CourseVisibility) =>
    v === 'public'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : v === 'unlisted'
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  return (
    <div className="space-y-4">
      <div role="status" aria-live="polite" className="sr-only" data-testid="courses-status">
        {status}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => openDialog('new')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add course
        </button>
      </div>

      {courses.length === 0 ? (
        <div
          data-testid="courses-empty"
          className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-600 dark:text-slate-400"
        >
          You have not added any courses yet. Add one to describe what you teach; it stays private until you publish it.
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Your courses">
          {courses.map((course) => {
            const discipline = disciplineName(course.primary_discipline_id);
            const isPublic = course.visibility === 'public';
            const confirming = confirmDeleteId === course.id;
            return (
              <li
                key={course.id}
                data-testid="course-row"
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white break-words">{course.title}</h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {LEVEL_LABELS[course.level]}
                      {discipline ? ` · ${discipline}` : ''}
                    </p>
                    {course.delivery_modes.length > 0 && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {course.delivery_modes.map((m) => DELIVERY_MODE_LABELS[m] ?? m).join(', ')}
                      </p>
                    )}
                  </div>
                  <span
                    data-testid="course-visibility"
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(course.visibility)}`}
                  >
                    {VISIBILITY_LABELS[course.visibility]}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === course.id}
                    onClick={() => setVisibility(course, isPublic ? 'private' : 'public')}
                    aria-label={`${isPublic ? 'Unpublish' : 'Publish'} ${course.title}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {isPublic ? (
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {isPublic ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDialog(course)}
                    aria-label={`Edit ${course.title}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                  </button>
                  {confirming ? (
                    <span className="inline-flex items-center gap-2" role="group" aria-label={`Confirm deleting ${course.title}`}>
                      <span className="text-xs text-slate-700 dark:text-slate-300 max-w-md">
                        Delete this course? Institutions that saved it lose it from their shortlists. Inquiries and
                        media links are kept but no longer linked to it.
                      </span>
                      <button
                        type="button"
                        disabled={busyId === course.id}
                        onClick={() => remove(course)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          setRowError(null);
                        }}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(course.id);
                        setRowError(null);
                      }}
                      aria-label={`Delete ${course.title}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                    </button>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-600 dark:text-slate-400" data-testid="publish-note">
                  {PUBLISH_NOTE}
                </p>
                {isPublic && profileStatus !== 'approved' && (
                  <p
                    data-testid="course-hidden-note"
                    className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-300"
                  >
                    Hidden from the public until your profile is approved.
                  </p>
                )}

                {rowError?.id === course.id && (
                  <p role="alert" className="mt-3 text-xs text-red-700 dark:text-red-400">
                    {rowError.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-title`}
            onKeyDown={onDialogKeyDown}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={`${uid}-title`} className="text-lg font-bold text-slate-900 dark:text-white">
                {editing === 'new' ? 'Add a course' : 'Edit course'}
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close"
                className="rounded p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
              <div>
                <label htmlFor={`${uid}-f-title`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Title
                </label>
                <input
                  id={`${uid}-f-title`}
                  ref={titleRef}
                  type="text"
                  required
                  maxLength={TITLE_MAX}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  aria-invalid={!!fieldErrors.title}
                  aria-describedby={fieldErrors.title ? `${uid}-e-title` : undefined}
                  className={inputClass}
                />
                {fieldErrors.title && (
                  <p id={`${uid}-e-title`} className="mt-1 text-xs text-red-700 dark:text-red-400">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={`${uid}-f-desc`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  id={`${uid}-f-desc`}
                  rows={4}
                  maxLength={TEXT_MAX}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  aria-invalid={!!fieldErrors.description}
                  aria-describedby={fieldErrors.description ? `${uid}-e-description` : undefined}
                  className={inputClass}
                />
                <FieldError id={`${uid}-e-description`} message={fieldErrors.description} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${uid}-f-level`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Level
                  </label>
                  <select
                    id={`${uid}-f-level`}
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as CourseLevel })}
                    aria-invalid={!!fieldErrors.level}
                    aria-describedby={fieldErrors.level ? `${uid}-e-level` : undefined}
                    className={inputClass}
                  >
                    {COURSE_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {LEVEL_LABELS[l]}
                      </option>
                    ))}
                  </select>
                  <FieldError id={`${uid}-e-level`} message={fieldErrors.level} />
                </div>
                <div>
                  <label htmlFor={`${uid}-f-disc`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Primary discipline
                  </label>
                  <select
                    id={`${uid}-f-disc`}
                    value={form.primary_discipline_id}
                    onChange={(e) => setForm({ ...form, primary_discipline_id: e.target.value })}
                    aria-invalid={!!(fieldErrors.primary_discipline_id || fieldErrors.discipline_ids)}
                    aria-describedby={
                      fieldErrors.primary_discipline_id || fieldErrors.discipline_ids ? `${uid}-e-disc` : undefined
                    }
                    className={inputClass}
                  >
                    <option value="">Not specified</option>
                    {disciplines.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    id={`${uid}-e-disc`}
                    message={fieldErrors.primary_discipline_id ?? fieldErrors.discipline_ids}
                  />
                </div>
              </div>

              <fieldset aria-describedby={fieldErrors.delivery_modes ? `${uid}-e-modes` : undefined}>
                <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">Delivery modes</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {DELIVERY_MODES.map((mode) => (
                    <label key={mode} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.delivery_modes.includes(mode)}
                        onChange={() => toggleMode(mode)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {DELIVERY_MODE_LABELS[mode]}
                    </label>
                  ))}
                </div>
                {removedModes.length > 0 && (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300" data-testid="legacy-modes-note">
                    {removedModes.length === 1 ? 'One delivery mode' : `${removedModes.length} delivery modes`} from an
                    older version of this course ({removedModes.join(', ')}) {removedModes.length === 1 ? 'is' : 'are'} no
                    longer supported and will be removed when you save.
                  </p>
                )}
                <FieldError id={`${uid}-e-modes`} message={fieldErrors.delivery_modes} />
              </fieldset>

              <div>
                <label htmlFor={`${uid}-f-reading`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Reading list
                </label>
                <textarea
                  id={`${uid}-f-reading`}
                  rows={3}
                  maxLength={TEXT_MAX}
                  value={form.reading_list}
                  onChange={(e) => setForm({ ...form, reading_list: e.target.value })}
                  aria-invalid={!!fieldErrors.reading_list}
                  aria-describedby={fieldErrors.reading_list ? `${uid}-e-reading` : undefined}
                  className={inputClass}
                />
                <FieldError id={`${uid}-e-reading`} message={fieldErrors.reading_list} />
              </div>

              {editing !== 'new' && (
                <div>
                  <label htmlFor={`${uid}-f-vis`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Visibility
                  </label>
                  <select
                    id={`${uid}-f-vis`}
                    value={form.visibility}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value as CourseVisibility })}
                    aria-invalid={!!fieldErrors.visibility}
                    aria-describedby={`${uid}-visibility-note${fieldErrors.visibility ? ` ${uid}-e-vis` : ''}`}
                    className={inputClass}
                  >
                    <option value="private">Private (only you)</option>
                    {editing.visibility === 'unlisted' && (
                      <option value="unlisted">Unlisted (not shown publicly)</option>
                    )}
                    <option value="public">Public (catalogue, your profile and discipline pages)</option>
                  </select>
                  <p id={`${uid}-visibility-note`} className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {PUBLISH_NOTE}
                  </p>
                  <FieldError id={`${uid}-e-vis`} message={fieldErrors.visibility} />
                </div>
              )}

              {Object.keys(fieldErrors).some((k) => !KNOWN_FIELDS.includes(k)) && (
                <ul className="text-xs text-red-700 dark:text-red-400 list-disc pl-5">
                  {Object.entries(fieldErrors)
                    .filter(([k]) => !KNOWN_FIELDS.includes(k))
                    .map(([k, v]) => (
                      <li key={k}>{v}</li>
                    ))}
                </ul>
              )}

              {formError && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {saving ? 'Saving…' : editing === 'new' ? 'Add course' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
