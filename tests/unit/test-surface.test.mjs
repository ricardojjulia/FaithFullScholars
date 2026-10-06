import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { evaluate, coversArgs, routeFromAppPath, discoverSurfaces } from '../../scripts/test-surface.mjs';

const today = new Date('2026-10-05T00:00:00Z');
const surfaces = [
  { id: 'page:/scholars', file: 'app/scholars/page.tsx' },
  { id: 'api:GET /api/inquiries', file: 'app/api/inquiries/route.ts' },
];
const exemption = (surface, expires = '2026-11-01', added = '2026-10-05') => ({ surface, reason: 'r', owner: 'o', added, expires });

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

  it('caps exemptions at 60 days from when they were added, so renewals cannot silently extend them', () => {
    const covered = new Map([['page:/scholars', new Set(['t'])]]);
    const kinds = (ex, on = today) => evaluate({ surfaces, covered, exemptions: ex, today: on }).problems.map((p) => p.kind);
    // Granted 2026-08-01; "renewed" on 2026-10-05 by only bumping expires → still capped from added.
    expect(kinds([exemption('api:GET /api/inquiries', '2026-12-01', '2026-08-01')])).toContain('invalid-exemption');
    expect(kinds([exemption('api:GET /api/inquiries', '2026-11-01', '2026-12-01')])).toContain('invalid-exemption'); // added in the future
    expect(kinds([{ surface: 'api:GET /api/inquiries', reason: 'r', owner: 'o', expires: '2026-11-01' }])).toContain('invalid-exemption'); // no added
  });

  it('fails when implausibly few surfaces are discovered', () => {
    const res = evaluate({ surfaces: [], covered: new Map(), exemptions: [], today, minSurfaces: 50 });
    expect(res.problems.map((p) => p.kind)).toContain('too-few-surfaces');
  });

  it('discovers re-exported route handlers and arrow-function Server Actions', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'surface-'));
    const write = (rel, src) => {
      mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      writeFileSync(path.join(root, rel), src);
    };
    write('app/api/a/route.ts', "export { GET, handler as POST } from './impl';");
    write('app/api/b/route.ts', 'export const { PATCH } = makeHandlers();');
    write('lib/actions.ts', "// leading comment\n'use server';\nexport const save = async () => {};\nexport async function load() {}");
    const ids = discoverSurfaces(root).map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'api:GET /api/a',
        'api:POST /api/a',
        'api:PATCH /api/b',
        'action:lib/actions.save',
        'action:lib/actions.load',
      ])
    );
  });
});
