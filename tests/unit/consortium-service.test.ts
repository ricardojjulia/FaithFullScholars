import { describe, it, expect } from 'vitest';
import { generateConsortiumSlug } from '@/lib/consortium/consortium-service';
import { ConsortiumRole, ConsortiumMemberStatus } from '@/lib/consortium/types';

describe('Seminary Consortium & Multi-Campus System Unit Tests (ADR 0012)', () => {
  it('generates URL-friendly slugs for consortia and systems', () => {
    expect(generateConsortiumSlug('Association of Reformed Theological Seminaries')).toBe(
      'association-of-reformed-theological-seminaries'
    );
    expect(generateConsortiumSlug('Reformed Theological Seminary (Multi-Campus System)')).toBe(
      'reformed-theological-seminary-multi-campus-system'
    );
    expect(generateConsortiumSlug('Boston Theological Interreligious Consortium #1')).toBe(
      'boston-theological-interreligious-consortium-1'
    );
    expect(generateConsortiumSlug('   Holy Trinity Seminary & College   ')).toBe(
      'holy-trinity-seminary-college'
    );
  });

  it('verifies consortium role and member status type constraints', () => {
    const validRoles: ConsortiumRole[] = ['lead', 'member', 'affiliate'];
    const validStatuses: ConsortiumMemberStatus[] = ['active', 'pending', 'inactive'];

    expect(validRoles).toHaveLength(3);
    expect(validStatuses).toHaveLength(3);
    expect(validRoles).toContain('lead');
    expect(validRoles).toContain('member');
    expect(validRoles).toContain('affiliate');
  });
});
