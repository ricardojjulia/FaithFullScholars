import { describe, it, expect } from 'vitest';
import { evaluate, coversArgs, routeFromAppPath } from '../../scripts/test-surface.mjs';

const today = new Date('2026-10-05T00:00:00Z');
const surfaces = [
  { id: 'page:/scholars', file: 'app/scholars/page.tsx' },
  { id: 'api:GET /api/inquiries', file: 'app/api/inquiries/route.ts' },
];
const exemption = (surface, expires = '2026-11-01') => ({ surface, reason: 'r', owner: 'o', expires });

describe('test-surface gate fails on bad state', () => {
  it('passes when every surface is covered or validly exempt', () => {
    const covered = new Map([['page:/scholars', new Set(['t'])]]);
    const res = evaluate({ surfaces, covered, exemptions: [exemption('api:GET /api/inquiries')], today });
    expect(res.ok).toBe(true);
  });

  it('fails on an uncovered surface with no exemption', () => {
    const res = evaluate({ surfaces, covered: new Map([['page:/scholars', new Set(['t'])]]), exemptions: [], today });
    expect(res.ok).toBe(false);
    expect(res.problems.map((p) => p.kind)).toContain('uncovered');
  });

  it('fails on a covers() tag that matches no surface (typo)', () => {
    const covered = new Map([
      ['page:/scholars', new Set(['t'])],
      ['api:GET /api/inquiry', new Set(['t'])],
    ]);
    const res = evaluate({ surfaces, covered, exemptions: [exemption('api:GET /api/inquiries')], today });
    expect(res.problems.map((p) => p.kind)).toContain('unknown-tag');
  });

  it('fails on expired, stale, and too-long exemptions', () => {
    const covered = new Map([['page:/scholars', new Set(['t'])]]);
    const kinds = (ex) => evaluate({ surfaces, covered, exemptions: ex, today }).problems.map((p) => p.kind);
    expect(kinds([exemption('api:GET /api/inquiries', '2026-10-01')])).toContain('expired-exemption');
    expect(kinds([exemption('page:/scholars'), exemption('api:GET /api/inquiries')])).toContain('stale-exemption');
    expect(kinds([exemption('api:GET /api/inquiries', '2027-06-01')])).toContain('invalid-exemption');
  });

  it('reads covers() ids but ignores commented-out calls', () => {
    // Built at runtime so this file's own source contains no literal tags for the gate to pick up.
    const call = ['cov', 'ers'].join('');
    const sample = `${call}('page:/a', "api:GET /b"); // ${call}('page:/c')`;
    expect(coversArgs(sample)).toEqual(['page:/a', 'api:GET /b']);
  });

  it('maps app paths to routes, dropping route groups', () => {
    expect(routeFromAppPath('(institution)/institution/postings/[id]/applicants')).toBe('/institution/postings/[id]/applicants');
  });
});
