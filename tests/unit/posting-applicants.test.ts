import { describe, it, expect } from 'vitest';
import { isTerminalDoctorate } from '@/lib/accreditation/ats-matrix-generator';
import {
  getPostingApplicantReport,
  parseDossierSnapshot,
  pickHighestCredential,
} from '@/lib/postings/applicant-service';
import { PortalQueryError } from '@/lib/inquiries/queries';
import { covers } from '../support/covers';

covers('page:/institution/postings/[id]/applicants');

const POSTING = '11111111-1111-4111-8111-111111111111';
const INST = '22222222-2222-4222-8222-222222222222';

describe('Search Committee Applicant Matrix & Confessional Common App (ADR 0020)', () => {
  describe('ATS Standard 3 Terminal Degree Qualifications', () => {
    it('accurately identifies theological doctorate degrees as terminal', () => {
      expect(isTerminalDoctorate('Ph.D. in Systematic Theology')).toBe(true);
      expect(isTerminalDoctorate('Doctor of Philosophy (Ph.D.)')).toBe(true);
      expect(isTerminalDoctorate('Th.D. in Old Testament')).toBe(true);
      expect(isTerminalDoctorate('D.Phil. in Patristics (Oxford)')).toBe(true);
      expect(isTerminalDoctorate('D.Min. in Expository Preaching')).toBe(true);
      expect(isTerminalDoctorate('S.T.D. (Doctor of Sacred Theology)')).toBe(true);
    });

    it('rejects master degrees and candidate designations as terminal', () => {
      expect(isTerminalDoctorate('Master of Divinity (M.Div.)')).toBe(false);
      expect(isTerminalDoctorate('Th.M. in Historical Theology')).toBe(false);
      expect(isTerminalDoctorate('M.A. in Biblical Studies')).toBe(false);
      expect(isTerminalDoctorate('Ph.D. Candidate (ABD)')).toBe(false);
      expect(isTerminalDoctorate(null)).toBe(false);
      expect(isTerminalDoctorate(undefined)).toBe(false);
    });
  });

  describe('applicant report (real applications, member client, two queries)', () => {
    const snapshot = {
      snapshot_version: 1,
      sealed_at: '2026-10-01T12:00:00Z',
      scholar_slug: 'sarah-edwards',
      full_name: 'Dr. Sarah Edwards',
      title: 'Associate Professor',
      current_institution: 'Reformed Theological Seminary',
      doctrinal_statement_text: 'We affirm the Westminster Standards.',
      credentials: [
        { degree: 'M.Div.', field_of_study: 'Pastoral Studies', institution_name: 'RTS', year_awarded: 2010, is_terminal: false },
        { degree: 'Ph.D.', field_of_study: 'New Testament', institution_name: 'University of Aberdeen', year_awarded: 2016, is_terminal: true },
      ],
      confessions: [{ name: 'Westminster Confession of Faith', slug: 'westminster-confession', adherence_level: 'full_subscription', exception_notes: null }],
      disciplines: [{ name: 'New Testament', slug: 'new-testament', is_primary: true }],
      traditions: [{ name: 'Reformed', slug: 'reformed', is_primary: true }],
      publications: [{ title: 'A Book', publication_type: 'book', year: 2018 }],
    };

    function fakeClient(opts: { posting?: unknown; postingError?: { code: string }; rows?: unknown[]; rowsError?: { code: string } }) {
      const calls: { table: string; filters: [string, unknown][] }[] = [];
      const client = {
        from(table: string) {
          const call = { table, filters: [] as [string, unknown][] };
          calls.push(call);
          const result =
            table === 'institution_postings'
              ? { data: opts.posting ?? null, error: opts.postingError ?? null }
              : { data: opts.rows ?? [], error: opts.rowsError ?? null };
          const builder: Record<string, unknown> = {};
          for (const m of ['select', 'order']) builder[m] = () => builder;
          for (const m of ['eq', 'in']) {
            builder[m] = (column: string, value: unknown) => {
              call.filters.push([`${m}:${column}`, value]);
              return builder;
            };
          }
          builder.maybeSingle = async () => result;
          builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
          return builder;
        },
      };
      return { client: client as never, calls };
    }

    const posting = {
      id: POSTING,
      institution_id: INST,
      title: 'Adjunct NT',
      slug: 'adjunct-nt',
      opportunity_type: 'adjunct',
      term: 'Fall 2027',
      required_degree: 'Ph.D.',
      confessional_requirements: null,
      traditions: { name: 'Reformed' },
    };

    it('derives degree, alignment and notes from the frozen snapshot with exactly two queries', async () => {
      const { client, calls } = fakeClient({
        posting,
        rows: [
          {
            id: 'app-1',
            scholar_id: 's-1',
            cover_note: 'Please consider me.',
            dossier_snapshot: snapshot,
            status: 'under_review',
            status_changed_at: '2026-10-02T12:00:00Z',
            created_at: '2026-10-01T12:00:00Z',
            posting_application_notes: [{ body: 'Strong candidate' }],
          },
        ],
      });

      const report = await getPostingApplicantReport(client, POSTING, [INST]);

      expect(calls.map((c) => c.table)).toEqual(['institution_postings', 'posting_applications']);
      expect(calls[0].filters).toContainEqual(['in:institution_id', [INST]]);
      expect(calls[1].filters).toContainEqual(['in:institution_id', [INST]]);
      expect(calls[1].filters).toContainEqual(['eq:posting_id', POSTING]);
      expect(report?.totalApplicants).toBe(1);
      const a = report!.applicants[0];
      expect(a.scholarName).toBe('Dr. Sarah Edwards');
      expect(a.highestDegree).toBe('Ph.D. in New Testament');
      expect(a.degreeInstitution).toBe('University of Aberdeen');
      expect(a.isTerminalDoctorate).toBe(true);
      expect(a.status).toBe('under_review');
      expect(a.note).toBe('Strong candidate');
      expect(a.confessions).toEqual([
        { name: 'Westminster Confession of Faith', slug: 'westminster-confession', adherenceLevel: 'full_subscription', exceptionNotes: null },
      ]);
      expect(report!.confessionalStandard).toBe('Reformed');
      expect(Object.keys(a)).not.toEqual(expect.arrayContaining(['alignmentLevel']));
      expect(JSON.stringify(report)).not.toMatch(/alignment|fullConfessionalMatch/i);
      expect(report!.terminalDoctoratesCount).toBe(1);
      expect(report!.terminalDoctoratesRatio).toBe(100);
    });

    it('returns null without touching the database for an invalid id or no memberships', async () => {
      const { client, calls } = fakeClient({ posting });
      expect(await getPostingApplicantReport(client, 'not-a-uuid', [INST])).toBeNull();
      expect(await getPostingApplicantReport(client, POSTING, [])).toBeNull();
      expect(calls).toEqual([]);
    });

    it('returns null when the posting is not one of the member institutions', async () => {
      const { client, calls } = fakeClient({ posting: null });
      expect(await getPostingApplicantReport(client, POSTING, [INST])).toBeNull();
      expect(calls.map((c) => c.table)).toEqual(['institution_postings']);
    });

    it('throws (never reports "no applicants") when a query fails', async () => {
      await expect(
        getPostingApplicantReport(fakeClient({ posting, rowsError: { code: '57014' } }).client, POSTING, [INST])
      ).rejects.toBeInstanceOf(PortalQueryError);
      await expect(
        getPostingApplicantReport(fakeClient({ postingError: { code: '57014' } }).client, POSTING, [INST])
      ).rejects.toBeInstanceOf(PortalQueryError);
    });

    it('skips rows with an unknown status instead of guessing', async () => {
      const { client } = fakeClient({
        posting,
        rows: [{ id: 'a', scholar_id: 's', cover_note: 'x', dossier_snapshot: snapshot, status: 'accepted', status_changed_at: 'x', created_at: '2026-10-01T00:00:00Z' }],
      });
      expect((await getPostingApplicantReport(client, POSTING, [INST]))?.totalApplicants).toBe(0);
    });
  });

  describe('snapshot parsing', () => {
    it('degrades unknown shapes to empty lists and never throws', () => {
      for (const raw of [null, undefined, 'x', 5, [], { credentials: 'nope', confessions: [null, 3] }]) {
        const view = parseDossierSnapshot(raw);
        expect(view.credentials).toEqual([]);
        expect(view.confessions).toEqual([]);
        expect(view.publications).toEqual([]);
      }
    });

    it('prefers a terminal doctorate, else the most recent credential', () => {
      const mdiv = { degree: 'M.Div.', fieldOfStudy: null, institutionName: null, yearAwarded: 2010, isTerminal: false };
      const thm = { degree: 'Th.M.', fieldOfStudy: null, institutionName: null, yearAwarded: 2014, isTerminal: false };
      const phd = { degree: 'Ph.D.', fieldOfStudy: null, institutionName: null, yearAwarded: 2008, isTerminal: true };
      expect(pickHighestCredential([mdiv, thm, phd])?.degree).toBe('Ph.D.');
      expect(pickHighestCredential([mdiv, thm])?.degree).toBe('Th.M.');
      expect(pickHighestCredential([])).toBeNull();
    });
  });
});
