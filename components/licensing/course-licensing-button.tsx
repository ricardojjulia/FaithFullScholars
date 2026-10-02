'use client';

import { useState } from 'react';
import { Award } from 'lucide-react';
import { CourseLicensingModal } from './course-licensing-modal';

interface CourseLicensingButtonProps {
  courseId: string;
  courseTitle: string;
  scholarId: string;
  scholarName: string;
}

export function CourseLicensingButton({
  courseId,
  courseTitle,
  scholarId,
  scholarName,
}: CourseLicensingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
      >
        <Award className="w-4 h-4 stroke-[2]" />
        <span>Request Institutional License</span>
      </button>

      <CourseLicensingModal
        courseId={courseId}
        courseTitle={courseTitle}
        scholarId={scholarId}
        scholarName={scholarName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
