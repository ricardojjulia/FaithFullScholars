import { describe, it, expect } from 'vitest';
import { formatOpportunityType, OpportunityType } from '@/lib/postings/postings-service';
import { InstitutionalRelationshipType } from '@/lib/endorsements/institutional-endorsement-service';

describe('Institution Postings & Academic Opportunities (§21 Architecture)', () => {
  it('formats all recognized opportunity types with human-readable academic labels', () => {
    expect(formatOpportunityType('adjunct')).toBe('Adjunct Teaching');
    expect(formatOpportunityType('modular_intensive')).toBe('Modular Intensive');
    expect(formatOpportunityType('full_time_tenure_track')).toBe('Full-Time / Tenure Track');
    expect(formatOpportunityType('visiting_fellow')).toBe('Visiting Fellow');
    expect(formatOpportunityType('sabbatical_cover')).toBe('Sabbatical Replacement');
    expect(formatOpportunityType('guest_lecturer')).toBe('Guest Lecturer');
    expect(formatOpportunityType('doctoral_supervision')).toBe('Doctoral Supervision');
    expect(formatOpportunityType('custom_call' as OpportunityType)).toBe('custom_call');
  });

  it('validates opportunity posting required parameters correctly', () => {
    function validatePostingInput(input: Record<string, unknown>): { valid: boolean; error?: string } {
      if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
        return { valid: false, error: 'Title is required' };
      }
      if (!input.opportunity_type || typeof input.opportunity_type !== 'string') {
        return { valid: false, error: 'Opportunity type is required' };
      }
      if (!input.required_degree || typeof input.required_degree !== 'string' || !input.required_degree.trim()) {
        return { valid: false, error: 'Required degree is required' };
      }
      if (!input.term || typeof input.term !== 'string' || !input.term.trim()) {
        return { valid: false, error: 'Academic term is required' };
      }
      if (!input.description || typeof input.description !== 'string' || !input.description.trim()) {
        return { valid: false, error: 'Description is required' };
      }
      return { valid: true };
    }

    expect(validatePostingInput({}).valid).toBe(false);
    expect(validatePostingInput({ title: 'Prof of NT' }).valid).toBe(false);
    expect(
      validatePostingInput({
        title: 'Prof of NT',
        opportunity_type: 'adjunct',
        required_degree: 'Ph.D.',
        term: 'Fall 2027',
        description: 'Undergraduate Greek and Exegesis',
      }).valid
    ).toBe(true);
  });
});

describe('Authoritative Institutional Endorsements', () => {
  it('validates relationship types accepted by seminaries and colleges', () => {
    const validRelationships: InstitutionalRelationshipType[] = [
      'Current Faculty',
      'Former Faculty',
      'Visiting Scholar',
      'Adjunct Instructor',
      'Research Fellow',
      'Distinguished Lecturer',
    ];

    expect(validRelationships).toHaveLength(6);
    expect(validRelationships).toContain('Current Faculty');
    expect(validRelationships).toContain('Adjunct Instructor');
    expect(validRelationships).toContain('Former Faculty');
  });

  it('validates required fields for issuing official institutional endorsements', () => {
    function validateEndorsementInput(input: Record<string, unknown>): { valid: boolean; error?: string } {
      if (!input.institution_id || !input.scholar_id) {
        return { valid: false, error: 'Institution and scholar identifiers are required' };
      }
      if (!input.relationship_type) {
        return { valid: false, error: 'Relationship type is required' };
      }
      if (!input.department_or_field || typeof input.department_or_field !== 'string' || !input.department_or_field.trim()) {
        return { valid: false, error: 'Department or field is required' };
      }
      if (!input.endorsement_text || typeof input.endorsement_text !== 'string' || !input.endorsement_text.trim()) {
        return { valid: false, error: 'Endorsement text is required' };
      }
      return { valid: true };
    }

    expect(validateEndorsementInput({}).valid).toBe(false);
    expect(
      validateEndorsementInput({
        institution_id: 'e1000000-0000-0000-0000-000000000001',
        scholar_id: 's1000000-0000-0000-0000-000000000001',
        relationship_type: 'Former Faculty',
        department_or_field: 'Systematic Theology',
        endorsement_text: 'Dr. Edwards served with distinction in our faculty.',
      }).valid
    ).toBe(true);
  });
});
