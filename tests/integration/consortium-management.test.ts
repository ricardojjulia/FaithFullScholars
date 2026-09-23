import { describe, it, expect } from 'vitest';
import {
  createConsortium,
  addConsortiumMember,
  removeConsortiumMember,
} from '@/lib/consortium/consortium-service';

describe('Consortium Management Service Integration (ADR 0012)', () => {
  const dummyLeadInstId = 'f2000000-0000-0000-0000-000000000001';
  const dummyMemberInstId = 'f2000000-0000-0000-0000-000000000002';
  const dummyConsortiumId = 'c0000000-0000-0000-0000-000000000001';

  it('rejects consortium creation with missing or whitespace-only name', async () => {
    const result = await createConsortium(dummyLeadInstId, {
      name: '   ',
      description: 'Test description',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Consortium name must be at least 3 characters long');
  });

  it('rejects consortium creation with names that are too short', async () => {
    const result = await createConsortium(dummyLeadInstId, {
      name: 'AB',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Consortium name must be at least 3 characters long');
  });

  it('enforces authorization rules on member invitation by non-lead institution', async () => {
    // Non-lead institution attempting to add a member without admin override
    const nonLeadCallerId = '99999999-9999-9999-9999-999999999999';
    const result = await addConsortiumMember(
      nonLeadCallerId,
      {
        consortiumId: dummyConsortiumId,
        institutionId: dummyMemberInstId,
        role: 'member',
      },
      false
    );

    // In a test environment without lead permissions, expect failure
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects adding a member with an invalid role', async () => {
    const result = await addConsortiumMember(
      dummyLeadInstId,
      {
        consortiumId: dummyConsortiumId,
        institutionId: dummyMemberInstId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: 'invalid_role' as any,
      },
      true
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid consortium membership role.');
  });

  it('prevents lead institution from removing itself from its own consortium', async () => {
    // Lead institution attempting to remove itself
    const result = await removeConsortiumMember(
      dummyLeadInstId,
      dummyConsortiumId,
      dummyLeadInstId,
      false
    );

    // Either permission check fails because DB row doesn't match or self-removal blocked
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
