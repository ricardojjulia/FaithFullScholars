'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Check, BookOpen, Lock, Loader2 } from 'lucide-react';
import { OpportunityType, DeliveryMode } from '@/lib/domain/types';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { createClient } from '@/lib/supabase/client';

interface StructuredInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholar: {
    id: string;
    fullName: string;
    primaryInstitution?: string | null;
    avatarUrl?: string | null;
  };
  courseId?: string | null;
  courseTitle?: string | null;
  institutionId?: string;
  defaultInstitutionEmail?: string;
  defaultOpportunityType?: OpportunityType;
}

const OPPORTUNITY_OPTIONS: { value: OpportunityType; label: string; desc: string }[] = [
  { value: 'adjunct_teaching', label: 'Adjunct Teaching', desc: 'Semester-long course instruction' },
  { value: 'online_instruction', label: 'Online Instruction', desc: 'Synchronous or asynchronous distance courses' },
  { value: 'intensives_modular', label: 'Intensive / Modular', desc: '1-to-2 week block seminary course' },
  { value: 'guest_lecturing', label: 'Guest Lecture', desc: 'Special topical or keynote address' },
  { value: 'doctoral_supervision', label: 'Doctoral Supervision', desc: 'External Th.M. or Ph.D. committee member' },
  { value: 'curriculum_consulting', label: 'Curriculum Consulting', desc: 'Degree program and syllabus review' },
  { value: 'conference_speaking', label: 'Conference Speaking', desc: 'Keynote and academic conference addresses' },
];

const DELIVERY_OPTIONS: { value: DeliveryMode; label: string }[] = [
  { value: 'in_person_semester', label: 'In-Person (Semester format)' },
  { value: 'in_person_modular', label: 'In-Person (Modular intensive)' },
  { value: 'online_sync', label: 'Online Synchronous (Live Zoom/Meet)' },
  { value: 'online_async', label: 'Online Asynchronous (Self-paced/Recorded)' },
];

export function StructuredInquiryModal({
  isOpen,
  onClose,
  scholar,
  courseId,
  courseTitle,
  institutionId,
  defaultInstitutionEmail = '',
  defaultOpportunityType = 'adjunct_teaching',
}: StructuredInquiryModalProps) {
  const { t } = useTranslation();
  const [opportunityType, setOpportunityType] = useState<OpportunityType>(defaultOpportunityType);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('in_person_semester');
  const [proposedTerm, setProposedTerm] = useState('Fall 2027');
  const [contactEmail, setContactEmail] = useState(defaultInstitutionEmail);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Authenticated institution verification gate (ADR 0008 / PR #21 Security Gate)
  const [checkingAuth, setCheckingAuth] = useState(!institutionId);
  const [hasInstitutionAccess, setHasInstitutionAccess] = useState(Boolean(institutionId));
  const [resolvedInstitutionId, setResolvedInstitutionId] = useState<string | undefined>(institutionId);
  const [resolvedInstitutionName, setResolvedInstitutionName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || institutionId) return;
    let isMounted = true;

    async function checkInstitutionSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setHasInstitutionAccess(false);
            setCheckingAuth(false);
          }
          return;
        }

        const { data: instUser } = await supabase
          .from('institution_users')
          .select('institution_id, institutions(id, name, status, contact_email)')
          .eq('account_id', user.id)
          .maybeSingle();

        const inst = instUser?.institutions as unknown as {
          id: string;
          name: string;
          status: string;
          contact_email: string;
        } | null;

        if (isMounted) {
          if (instUser && inst && inst.status === 'approved') {
            setHasInstitutionAccess(true);
            setResolvedInstitutionId(instUser.institution_id);
            setResolvedInstitutionName(inst.name);
            if (inst.contact_email) {
              setContactEmail((prev) => prev || inst.contact_email);
            }
          } else {
            setHasInstitutionAccess(false);
          }
          setCheckingAuth(false);
        }
      } catch {
        if (isMounted) {
          setHasInstitutionAccess(false);
          setCheckingAuth(false);
        }
      }
    }

    checkInstitutionSession();
    return () => {
      isMounted = false;
    };
  }, [isOpen, institutionId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (message.trim().length < 20) {
      setError(t('inquiry.error_too_short') || 'Please provide a detailed inquiry message (at least 20 characters).');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: resolvedInstitutionId,
          scholar_id: scholar.id,
          course_id: courseId || null,
          opportunity_type: opportunityType,
          proposed_term: proposedTerm,
          delivery_mode: deliveryMode,
          contact_email: contactEmail,
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch inquiry');
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error sending inquiry';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSuccess(false);
    setError(null);
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-modal-title"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg overflow-hidden">
              {scholar.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={scholar.avatarUrl} alt={scholar.fullName} className="w-full h-full object-cover" />
              ) : (
                scholar.fullName.charAt(0)
              )}
            </div>
            <div>
              <h2 id="inquiry-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
                {t('inquiry.title') || 'Institutional Inquiry'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Outreach to <span className="font-semibold text-slate-900 dark:text-slate-200">{scholar.fullName}</span>
                {scholar.primaryInstitution && ` (${scholar.primaryInstitution})`}
                {resolvedInstitutionName && (
                  <span className="block text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">
                    Dispatching on behalf of {resolvedInstitutionName}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {checkingAuth ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 dark:text-indigo-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Verifying institutional credentials...
              </p>
            </div>
          ) : !hasInstitutionAccess ? (
            <div className="py-8 px-4 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Institutional Verification Required
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  To safeguard faculty contact privacy and maintain academic integrity, direct outreach and keynote speaking invitations are restricted to verified academic institutions, seminary deans, and symposium organizers.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/login?role=institution"
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  Sign In with Institutional Account
                </Link>
                <Link
                  href="/institution/profile"
                  className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  Register Institutional Profile
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('inquiry.success_title') || 'Inquiry Dispatched Successfully!'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                {t('inquiry.success_desc') ||
                  `Your structured opportunity request has been sent to ${scholar.fullName}. You will be notified at ${contactEmail} when the scholar responds.`}
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition shadow-xs"
                >
                  {t('inquiry.done') || 'Done'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {courseTitle && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm text-amber-900 dark:text-amber-200 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>
                    Regarding Course Showcase: <strong>{courseTitle}</strong>
                  </span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300 rounded-lg">
                  {error}
                </div>
              )}

              {/* Opportunity Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('inquiry.opportunity_type') || 'Opportunity Type'} *
                </label>
                <select
                  value={opportunityType}
                  onChange={(e) => setOpportunityType(e.target.value as OpportunityType)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {OPPORTUNITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proposed Term & Delivery Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('inquiry.proposed_term') || 'Target Academic Term'}
                  </label>
                  <input
                    type="text"
                    value={proposedTerm}
                    onChange={(e) => setProposedTerm(e.target.value)}
                    placeholder="e.g. Fall 2027, J-Term 2028"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('inquiry.delivery_mode') || 'Delivery Format'}
                  </label>
                  <select
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value as DeliveryMode)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DELIVERY_OPTIONS.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('inquiry.contact_email') || 'Institutional Contact Email'} *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('inquiry.email_note') ||
                    'Responses will be sent to this email address once the scholar accepts your inquiry.'}
                </p>
              </div>

              {/* Message */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('inquiry.message') || 'Structured Inquiry Message'} *
                  </label>
                  <span className="text-xs text-slate-400">
                    {message.length} / 5000 characters
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Describe your institution's teaching need, course expectations, schedule requirements, or lecture details for ${scholar.fullName}...`}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>

              {/* Anti-spam notice */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex items-start space-x-2">
                <Lock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  {t('inquiry.privacy_notice') ||
                    'Inquiries are routed through structured platform communication. Scholar personal contact details are released upon inquiry acceptance.'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition"
                >
                  {t('inquiry.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center space-x-2 shadow-xs"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t('inquiry.submit') || 'Send Inquiry'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
