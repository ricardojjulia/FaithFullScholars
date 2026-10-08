import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { covers } from '../support/covers';

/**
 * Regression guard for "real data on portal screens" (spec 2026-10-08).
 *
 * The portal used to render invented data as if it were real. These checks fail
 * if the known fixtures come back, and prove each changed page still reads from
 * the real query layer behind its own guard. They are per-file on purpose: a
 * tree-wide grep for seed names would flag legitimate placeholders and seed
 * scripts. Only the fixture UUID prefixes and the removed constants are banned
 * across app/ and components/ (tests and seed scripts may use them).
 */

covers(
  'page:/dashboard/analytics',
  'page:/scholars/[slug]',
  'page:/institution/conferences',
  'page:/institution/inquiries'
);

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = path.posix.join(dir, name);
    const stat = statSync(path.join(ROOT, rel));
    if (stat.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

const NEGATIVE_AND_POSITIVE: {
  file: string;
  absent: (string | RegExp)[];
  present: (string | RegExp)[];
}[] = [
  {
    file: 'app/(institution)/institution/page.tsx',
    absent: ['Westminster Theological Seminary', 'Glenside', 'ATS & MSCHE', 'Average response time', /<p[^>]*>\s*(3|2|1|4)\s*<\/p>/],
    present: ['requireInstitutionMember', 'fetchInstitutionProfileOrThrow', 'fetchInstitutionStats', 'DataErrorPanel', 'awaitingInquiries'],
  },
  {
    file: 'app/(institution)/institution/saved/page.tsx',
    absent: ['DEFAULT_SAVED_SCHOLARS', 'DEFAULT_SAVED_COURSES', 'Dr. Calvin Edwards'],
    present: ['requireInstitutionMember', 'fetchSavedScholarsOrThrow', 'fetchSavedCoursesOrThrow', 'DataErrorPanel'],
  },
  {
    file: 'components/institution/saved-lists.tsx',
    absent: ['DEFAULT_SAVED', "method: 'POST'", 'Dr. Calvin Edwards'],
    // Remove is an explicit DELETE: it can never add an item the way the old toggle POST could.
    present: ["method: 'DELETE'", 'role="alert"'],
  },
  {
    file: 'app/(institution)/institution/inquiries/page.tsx',
    absent: ['DEFAULT_OUTBOX', 'academic.dean@wts.edu'],
    present: ['requireInstitutionMember', 'fetchInstitutionInquiriesOrThrow', 'DataErrorPanel'],
  },
  {
    file: 'components/institution/outreach-log.tsx',
    absent: ['DEFAULT_OUTBOX', 'academic.dean@wts.edu'],
    present: ['No Outgoing Inquiries'],
  },
  {
    file: 'app/dashboard/page.tsx',
    absent: ['Approved & Active', 'Live Revision #1', '+18%', '+2 this month', 'Public Directory Views', 'Adjunct & modular', /\b182\b/],
    present: ['requireSignedIn', 'fetchScholarDashboardSummary', 'DataErrorPanel', 'dashboard-onboarding-prompt'],
  },
  {
    file: 'app/dashboard/inquiries/page.tsx',
    absent: ['DEFAULT_INQUIRIES'],
    present: ['requireSignedIn', 'fetchScholarInquiriesOrThrow', 'toInboxItems', 'DataErrorPanel'],
  },
  {
    file: 'components/inquiries/scholar-inquiry-inbox.tsx',
    absent: ['DEFAULT_INQUIRIES', 'inq-sample-', 'Westminster Theological Seminary', 'wts.edu'],
    // A failed PATCH must roll back and tell the user (previously masked).
    present: ['sendInquiryDecision', 'settleDecision', 'snapshotOf', 'role="alert"'],
  },
  {
    file: 'app/dashboard/analytics/page.tsx',
    absent: ['Live Feed'],
    present: [
      'role="note"',
      'data-testid="analytics-sample-banner"',
      'Sample data — analytics are coming soon',
      'The numbers, charts and keywords below are illustrative. They are not measurements of your profile or your visitors.',
      '(sample)',
    ],
  },
  {
    file: 'app/(institution)/institution/conferences/page.tsx',
    absent: ['GUILD_CONFERENCES', 'recordCommitteeDeliberationNotes', 'f2000000-'],
    present: ['verifyStaffUser', 'ConferencesComingSoon', 'ConferenceHubPreview'],
  },
  {
    file: 'components/conferences/conference-hub-preview.tsx',
    absent: ['Saved to Committee Docket', 'recordCommitteeDeliberationNotes', 'Save Deliberation Notes', 'Westminster', 'f2000000-', /scholarshipScore:\s*5/, /recommendation:\s*'strong_hire'/],
    present: ['conference-preview-banner', 'Preview — demo data, nothing is saved', 'CONFERENCE_PREVIEW_INSTITUTION'],
  },
  {
    file: 'components/conferences/conference-interview-modal.tsx',
    absent: ['Westminster', 'f2000000-'],
    present: ['CONFERENCE_PREVIEW_INSTITUTION'],
  },
  {
    file: 'lib/conferences/conference-service.ts',
    absent: ['Westminster', 'f2000000-'],
    present: ['CONFERENCE_PREVIEW_INSTITUTION'],
  },
  {
    file: 'app/scholars/[slug]/page.tsx',
    absent: ['conference-service', 'getScholarConferenceAppearances', 'ConferencePresentationBadge', 'Annual Guild Conference Presentations'],
    present: ['getPublicScholarBySlug'],
  },
  {
    file: 'components/institution/institution-nav.tsx',
    // The badge reflects the real institutions.status; a bare hard-coded "Verified" line is banned.
    absent: [/^\s*Verified\s*$/m],
    present: ['showConferences', 'institutionStatusBadge', 'verificationStatus'],
  },
  {
    file: 'app/(institution)/institution/profile/page.tsx',
    absent: ['DEFAULT_PROFILE', 'setTimeout', 'academic.dean@wts.edu', 'Westminster Theological Seminary', 'wts.edu', "'use client'"],
    present: ['requireInstitutionMember', 'fetchInstitutionProfileForEdit', 'InstitutionProfileForm', 'DataErrorPanel'],
  },
  {
    file: 'components/institution/institution-profile-form.tsx',
    absent: ['DEFAULT_PROFILE', 'setTimeout', 'academic.dean@wts.edu', 'Westminster Theological Seminary', 'wts.edu'],
    present: ["'/api/institution/profile'", "method: 'PATCH'", 'profile.status', 'profile-save-error'],
  },
  {
    file: 'app/(institution)/institution/layout.tsx',
    absent: [],
    present: ["session.role === 'admin'", 'fetchInstitutionStatus', 'SessionLookupError'],
  },
];

describe('portal fixture regression', () => {
  describe.each(NEGATIVE_AND_POSITIVE)('$file', ({ file, absent, present }) => {
    const source = read(file);
    it.each(absent.map((a) => [String(a), a] as const))('does not contain %s', (_label, needle) => {
      if (typeof needle === 'string') expect(source.includes(needle)).toBe(false);
      else expect(needle.test(source)).toBe(false);
    });
    it.each(present.map((p) => [String(p), p] as const))('contains %s', (_label, needle) => {
      if (typeof needle === 'string') expect(source.includes(needle)).toBe(true);
      else expect(needle.test(source)).toBe(true);
    });
  });

  it('no page or component in app/ or components/ uses the fixture UUID prefixes', () => {
    const offenders: string[] = [];
    for (const file of [...walk('app'), ...walk('components')]) {
      const source = read(file);
      for (const prefix of ['f1000000-', 'f2000000-', 'c1000000-']) {
        if (source.includes(prefix)) offenders.push(`${file}: ${prefix}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the removed fixture constants and "Live Feed" badge are gone from app/ and components/', () => {
    const banned = ['DEFAULT_SAVED_SCHOLARS', 'DEFAULT_SAVED_COURSES', 'DEFAULT_INQUIRIES', 'DEFAULT_OUTBOX', 'Live Feed', 'inq-sample-'];
    const offenders: string[] = [];
    for (const file of [...walk('app'), ...walk('components')]) {
      const source = read(file);
      for (const word of banned) if (source.includes(word)) offenders.push(`${file}: ${word}`);
      if (/\b182\b/.test(source)) offenders.push(`${file}: 182`);
    }
    expect(offenders).toEqual([]);
  });

  it('every portal data page uses the user/RLS client, never the service-role client', () => {
    for (const file of [
      'app/(institution)/institution/page.tsx',
      'app/(institution)/institution/saved/page.tsx',
      'app/(institution)/institution/inquiries/page.tsx',
      'app/dashboard/page.tsx',
      'app/dashboard/inquiries/page.tsx',
      'lib/profiles/dashboard-summary.ts',
    ]) {
      expect(read(file), file).not.toContain('createAdminClient');
    }
    for (const route of ['app/api/institution/saved-scholars/route.ts', 'app/api/institution/saved-courses/route.ts']) {
      expect(read(route), route).not.toContain('createAdminClient');
    }
  });
});
