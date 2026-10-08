import { describe, it, expect } from 'vitest';
import {
  DELIVERY_MODES,
  MAX_DISCIPLINES,
  TEXT_MAX,
  TITLE_MAX,
  slugify,
  uniqueSlug,
  validateCourseInput,
} from '@/lib/courses/course-validation';

const D1 = '11111111-1111-4111-8111-111111111111';
const D2 = '22222222-2222-4222-8222-222222222222';

const valid = { title: ' Exegesis of Romans ', level: 'graduate' };

describe('validateCourseInput', () => {
  it('accepts a minimal create body and trims', () => {
    const r = validateCourseInput(valid, { partial: false });
    expect(r).toEqual({ ok: true, value: { title: 'Exegesis of Romans', level: 'graduate' } });
  });

  it('requires title and level on create but not on partial update', () => {
    const r = validateCourseInput({}, { partial: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['level', 'title']);
    expect(validateCourseInput({ visibility: 'public' }, { partial: true })).toEqual({
      ok: true,
      value: { visibility: 'public' },
    });
  });

  it('enforces length limits', () => {
    expect(validateCourseInput({ ...valid, title: 'x'.repeat(TITLE_MAX + 1) }, { partial: false }).ok).toBe(false);
    expect(validateCourseInput({ ...valid, title: 'x'.repeat(TITLE_MAX) }, { partial: false }).ok).toBe(true);
    expect(validateCourseInput({ ...valid, description: 'x'.repeat(TEXT_MAX + 1) }, { partial: false }).ok).toBe(false);
    expect(validateCourseInput({ ...valid, reading_list: 'x'.repeat(TEXT_MAX + 1) }, { partial: false }).ok).toBe(false);
    expect(validateCourseInput({ ...valid, description: 5 }, { partial: false }).ok).toBe(false);
  });

  it('turns blank optional text into null', () => {
    const r = validateCourseInput({ ...valid, description: '   ' }, { partial: false });
    expect(r.ok && r.value.description).toBeNull();
  });

  it('only accepts database levels and visibilities', () => {
    expect(validateCourseInput({ ...valid, level: 'Graduate (M.Div.)' }, { partial: false }).ok).toBe(false);
    for (const level of ['undergraduate', 'graduate', 'doctoral', 'certificate', 'lay_education']) {
      expect(validateCourseInput({ ...valid, level }, { partial: false }).ok).toBe(true);
    }
    expect(validateCourseInput({ visibility: 'draft' }, { partial: true }).ok).toBe(false);
    expect(validateCourseInput({ visibility: 'unlisted' }, { partial: true }).ok).toBe(true);
  });

  it('allow-lists delivery modes and de-duplicates', () => {
    expect(validateCourseInput({ ...valid, delivery_modes: ['<script>'] }, { partial: false }).ok).toBe(false);
    expect(validateCourseInput({ ...valid, delivery_modes: ['in_person'] }, { partial: false }).ok).toBe(false);
    expect(validateCourseInput({ ...valid, delivery_modes: 'online_async' }, { partial: false }).ok).toBe(false);
    const r = validateCourseInput({ ...valid, delivery_modes: [...DELIVERY_MODES, 'online_async'] }, { partial: false });
    expect(r.ok).toBe(false); // longer than the allow-list
    const ok = validateCourseInput({ ...valid, delivery_modes: ['online_async', 'online_async'] }, { partial: false });
    expect(ok.ok && ok.value.delivery_modes).toEqual(['online_async']);
  });

  it('validates discipline ids as UUIDs, merges the primary, and caps at five', () => {
    expect(validateCourseInput({ ...valid, primary_discipline_id: 'nope' }, { partial: false }).ok).toBe(false);
    expect(validateCourseInput({ ...valid, discipline_ids: ['nope'] }, { partial: false }).ok).toBe(false);
    const r = validateCourseInput({ ...valid, primary_discipline_id: D1, discipline_ids: [D2, D1] }, { partial: false });
    expect(r.ok && r.value.discipline_ids).toEqual([D1, D2]);
    const many = Array.from({ length: MAX_DISCIPLINES + 1 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
    expect(validateCourseInput({ ...valid, discipline_ids: many }, { partial: false }).ok).toBe(false);
  });

  it('drops unknown keys such as scholar_id, slug and id', () => {
    const r = validateCourseInput(
      { ...valid, scholar_id: 'someone-else', slug: 'hijack', id: 'x', created_at: 'y' },
      { partial: false }
    );
    expect(r.ok && Object.keys(r.value).sort()).toEqual(['level', 'title']);
  });

  it('rejects non-objects', () => {
    for (const body of [null, 'x', 4, [valid]]) {
      expect(validateCourseInput(body, { partial: false }).ok).toBe(false);
    }
  });
});

describe('slugify / uniqueSlug', () => {
  it('builds a url-safe slug', () => {
    expect(slugify('Exegesis of Romans & Galatians!')).toBe('exegesis-of-romans-galatians');
    expect(slugify('Théologie Systématique')).toBe('theologie-systematique');
    expect(slugify('???')).toBe('course');
  });

  it('adds a numeric suffix when the slug is taken', () => {
    expect(uniqueSlug('romans', new Set())).toBe('romans');
    expect(uniqueSlug('romans', new Set(['romans']))).toBe('romans-2');
    expect(uniqueSlug('romans', new Set(['romans', 'romans-2']))).toBe('romans-3');
  });
});
