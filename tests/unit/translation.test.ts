import { describe, it, expect } from 'vitest';
import enMessages from '@/lib/i18n/messages/en.json';
import esMessages from '@/lib/i18n/messages/es.json';

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getAllKeys(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current && typeof current === 'object' && p in current) {
      current = (current as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return current;
}

describe('Internationalization & Language Translation (Phase 4 & Skill)', () => {
  it('has 100% key parity between English and Spanish message catalogs', () => {
    const enKeys = getAllKeys(enMessages);
    const esKeys = getAllKeys(esMessages);

    expect(enKeys.length).toBeGreaterThan(20);
    expect(esKeys.length).toBe(enKeys.length);

    const missingInEs: string[] = [];
    for (const key of enKeys) {
      const esVal = getValue(esMessages, key);
      if (esVal === undefined) {
        missingInEs.push(key);
      }
    }

    expect(missingInEs).toEqual([]);
  });

  it('ensures all Spanish translations are non-empty strings', () => {
    const esKeys = getAllKeys(esMessages);

    for (const key of esKeys) {
      const val = getValue(esMessages, key);
      expect(typeof val).toBe('string');
      expect((val as string).trim().length).toBeGreaterThan(0);
    }
  });

  it('correctly provides dignified theological Spanish terminology', () => {
    expect(esMessages.directory.confession).toBe('Confesión Histórica');
    expect(esMessages.directory.discipline).toBe('Disciplina Teológica');
    expect(esMessages.profile.faith_statement_title).toBe('Declaración Personal de Fe');
    expect(esMessages.profile.affirmed_confessions).toBe('Estándares Históricos Afirmados');
    expect(esMessages.profile.full_subscription).toBe('Suscripción Plena');
    expect(esMessages.profile.with_exceptions).toBe('Con Excepciones Declaradas');
    expect(esMessages.nav.brand_sub).toBe('Red Académica Teológica');
  });
});
