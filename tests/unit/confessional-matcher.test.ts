import { describe, it, expect } from 'vitest';
import { evaluateConfessionalAlignment } from '@/lib/search/confessional-matcher';

describe('Confessional Lens & Doctrinal Fit Matcher (ADR-0016)', () => {
  it('identifies full confessional alignment on direct standard match', () => {
    const result = evaluateConfessionalAlignment({
      targetStandardId: 'std-westminster',
      scholarConfessions: [
        { id: 'std-westminster', name: 'Westminster Confession of Faith' },
        { id: 'std-chicago', name: 'Chicago Statement on Biblical Inerrancy' }
      ],
      scholarDoctrinalStatement: 'I wholeheartedly affirm the Westminster Standards and biblical inerrancy.'
    });

    expect(result.alignmentLevel).toBe('full');
    expect(result.scorePercent).toBe(100);
    expect(result.details.some(d => d.includes('Direct verified adherence'))).toBe(true);
    expect(result.details.some(d => d.includes('inerrancy'))).toBe(true);
  });

  it('identifies substantial Reformed alignment when tradition matches', () => {
    const result = evaluateConfessionalAlignment({
      targetTradition: 'Reformed',
      scholarConfessions: [
        { id: 'std-heidelberg', name: 'Heidelberg Catechism' }
      ],
      scholarDoctrinalStatement: 'We hold firmly to covenant theology and the historic Reformed confessions.'
    });

    expect(result.alignmentLevel).toBe('substantial');
    expect(result.scorePercent).toBeGreaterThanOrEqual(80);
    expect(result.details.some(d => d.includes('Reformed'))).toBe(true);
  });

  it('provides ecumenical orthodox status for broad confessional scholars', () => {
    const result = evaluateConfessionalAlignment({
      scholarConfessions: [
        { id: 'std-nicene', name: 'Nicene Creed' },
        { id: 'std-apostles', name: "Apostles' Creed" }
      ],
      scholarDoctrinalStatement: 'I subscribe to historic trinitarian Christian orthodoxy.'
    });

    expect(result.alignmentLevel).toBe('substantial');
    expect(result.scorePercent).toBe(80);
  });

  it('handles scholars with no explicit confessions on record gracefully', () => {
    const result = evaluateConfessionalAlignment({
      scholarConfessions: [],
      scholarDoctrinalStatement: ''
    });

    expect(result.alignmentLevel).toBe('distinctive');
    expect(result.scorePercent).toBe(30);
    expect(result.sharedCount).toBe(0);
  });
});
