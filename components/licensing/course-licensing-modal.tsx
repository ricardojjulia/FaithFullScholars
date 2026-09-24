'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { LicenseType, TermDuration } from '@/lib/licensing/types';

interface CourseLicensingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  scholarId: string;
  scholarName: string;
  onSuccess?: () => void;
}

export function CourseLicensingModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  scholarId,
  scholarName,
  onSuccess,
}: CourseLicensingModalProps) {
  const { t } = useTranslation();
  const [licenseType, setLicenseType] = useState<LicenseType>('syllabus_only');
  const [termDuration, setTermDuration] = useState<TermDuration>('1_academic_year');
  const [royaltyAmount, setRoyaltyAmount] = useState<string>('850');
  const [permittedStudents, setPermittedStudents] = useState<string>('25');
  const [customTerms, setCustomTerms] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/institution/licensing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          scholar_id: scholarId,
          license_type: licenseType,
          term_duration: termDuration,
          royalty_amount: parseFloat(royaltyAmount) || 0,
          permitted_students_count: parseInt(permittedStudents, 10) || null,
          custom_terms: customTerms || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit licensing request.');
        return;
      }

      setSuccessMsg(t('licensing.request_submitted_success') || 'Course licensing agreement successfully requested!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch {
      setErrorMsg('Network error while requesting course licensing agreement.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 px-6 py-5 text-white flex justify-between items-center">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
              {t('licensing.modal_badge') || 'Curricular Licensing & Distribution'}
            </span>
            <h3 className="text-lg font-bold mt-0.5">{t('licensing.modal_title') || 'Request Course License'}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white transition p-1.5 rounded-lg hover:bg-emerald-700/50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-900">
            <p className="font-semibold text-emerald-950">{courseTitle}</p>
            <p className="text-emerald-800 mt-0.5">
              {t('licensing.authored_by') || 'Authored by'}: <span className="font-medium">{scholarName}</span>
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-semibold flex items-center gap-2">
              <span>✓</span> {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('licensing.license_type_label') || 'License Scope'}
            </label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value as LicenseType)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="syllabus_only">{t('licensing.type_syllabus') || 'Syllabus & Bibliography Only'}</option>
              <option value="full_course_curriculum">{t('licensing.type_full') || 'Full Course Curriculum & Lecture Units'}</option>
              <option value="modular_guest_lecture">{t('licensing.type_modular') || 'Modular Guest Lectureship Series'}</option>
              <option value="custom_institution_license">{t('licensing.type_custom') || 'Consortium-Wide Institutional License'}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('licensing.duration_label') || 'Term Duration'}
              </label>
              <select
                value={termDuration}
                onChange={(e) => setTermDuration(e.target.value as TermDuration)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="1_semester">{t('licensing.term_1_sem') || '1 Semester'}</option>
                <option value="1_academic_year">{t('licensing.term_1_yr') || '1 Academic Year'}</option>
                <option value="single_modular_cohort">{t('licensing.term_modular') || 'Single Intensive Cohort'}</option>
                <option value="perpetual_institutional">{t('licensing.term_perpetual') || 'Perpetual Institutional'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('licensing.permitted_students_label') || 'Expected Cohort Size'}
              </label>
              <input
                type="number"
                value={permittedStudents}
                onChange={(e) => setPermittedStudents(e.target.value)}
                min="1"
                placeholder="25"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('licensing.royalty_label') || 'Proposed Royalty / Compensation (USD)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">$</span>
              <input
                type="number"
                value={royaltyAmount}
                onChange={(e) => setRoyaltyAmount(e.target.value)}
                step="50"
                min="0"
                placeholder="850.00"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('licensing.custom_terms_label') || 'Custom Accreditations / Delivery Notes'}
            </label>
            <textarea
              value={customTerms}
              onChange={(e) => setCustomTerms(e.target.value)}
              rows={3}
              placeholder={t('licensing.custom_terms_placeholder') || 'Specify any course requirements, LMS format needs, or guest lecture dates...'}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>{t('common.submitting') || 'Submitting...'}</span>
              ) : (
                <span>{t('licensing.submit_request') || 'Send Licensing Request'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
