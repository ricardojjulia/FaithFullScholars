/**
 * ==============================================================================
 * FaithFull Scholars — Confessional Lens & Doctrinal Alignment Matrix (ADR-0016)
 *
 * Computes theological alignment between an institutional statement of faith /
 * required confessional standard and a scholar's verified confessional standards.
 * ==============================================================================
 */

export type ConfessionalAlignmentLevel = 'full' | 'substantial' | 'ecumenical' | 'distinctive';

export interface ConfessionalComparisonResult {
  scholarSlug: string;
  scholarName: string;
  alignmentLevel: ConfessionalAlignmentLevel;
  alignmentScorePercent: number; // 0 - 100
  sharedStandards: Array<{
    id: string;
    name: string;
    historicYear?: number;
    traditionCategory: string;
    matchedAffirmation: boolean;
  }>;
  openHandedNuances: string[];
  inerrancyAffirmed: boolean;
  confessionalSummary: string;
}

/**
 * Evaluates confessional compatibility between a target institution standard
 * and a scholar's verified confessions list.
 */
export function evaluateConfessionalAlignment(params: {
  targetStandardId?: string;
  targetTradition?: string;
  scholarConfessions: Array<{ id: string; name: string; slug?: string }>;
  scholarDoctrinalStatement?: string;
}): {
  alignmentLevel: ConfessionalAlignmentLevel;
  scorePercent: number;
  sharedCount: number;
  details: string[];
} {
  const { targetStandardId, targetTradition, scholarConfessions, scholarDoctrinalStatement } = params;
  const confessionsCount = scholarConfessions.length;

  if (confessionsCount === 0) {
    return {
      alignmentLevel: 'distinctive',
      scorePercent: 30,
      sharedCount: 0,
      details: ['No historic confessional affirmations on record; personal statement applies.']
    };
  }

  // Check direct standard match
  const hasDirectMatch = targetStandardId
    ? scholarConfessions.some(c => c.id === targetStandardId || c.slug === targetStandardId)
    : false;

  const text = (scholarDoctrinalStatement || '').toLowerCase();
  const hasInerrancy = text.includes('inerran') || text.includes('infallib') || text.includes('authority of scripture');
  const hasCovenantal = text.includes('covenant') || text.includes('westminster') || text.includes('reformed');
  const hasBaptistic = text.includes('baptist') || text.includes('credo') || text.includes('1689');

  let score = 50;
  const details: string[] = [];

  if (hasDirectMatch) {
    score = 100;
    details.push('Direct verified adherence to primary institutional confessional standard.');
  } else if (targetTradition && targetTradition.toLowerCase().includes('reformed') && (hasCovenantal || confessionsCount > 0)) {
    score = 90;
    details.push('Substantial historical Reformed confessional alignment.');
  } else if (targetTradition && targetTradition.toLowerCase().includes('baptist') && hasBaptistic) {
    score = 90;
    details.push('Substantial historical Baptist confessional alignment.');
  } else if (confessionsCount >= 2) {
    score = 80;
    details.push('Broad historic ecumenical and orthodox confessional subscription.');
  } else {
    score = 70;
    details.push('General evangelical and historic confessional compatibility.');
  }

  if (hasInerrancy) {
    details.push('Explicit affirmation of biblical inerrancy and full divine authority.');
  }

  let alignmentLevel: ConfessionalAlignmentLevel = 'ecumenical';
  if (score >= 95) alignmentLevel = 'full';
  else if (score >= 80) alignmentLevel = 'substantial';
  else if (score >= 60) alignmentLevel = 'ecumenical';
  else alignmentLevel = 'distinctive';

  return {
    alignmentLevel,
    scorePercent: score,
    sharedCount: confessionsCount,
    details
  };
}
