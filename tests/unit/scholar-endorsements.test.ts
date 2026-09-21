import { describe, it, expect } from 'vitest';
import { submitPeerEndorsement } from '@/lib/endorsements/endorsement-service';

describe('Scholar Peer Endorsements & Commendations (§21 Post-MVP Backlog)', () => {
  it('blocks a scholar from endorsing themselves', async () => {
    const scholarId = '11111111-1111-1111-1111-111111111111';
    const result = await submitPeerEndorsement(scholarId, {
      recipientScholarId: scholarId,
      relationship: 'Department Colleague',
      subjectArea: 'Systematic Theology',
      endorsementText: 'Exemplary faculty colleague with deep research rigor.',
    });

    expect(result.error).toBe('Scholars cannot endorse themselves.');
    expect(result.endorsement).toBeUndefined();
  });

  it('rejects submissions with missing subject area or empty endorsement text', async () => {
    const endorserId = '11111111-1111-1111-1111-111111111111';
    const recipientId = '22222222-2222-2222-2222-222222222222';

    const res1 = await submitPeerEndorsement(endorserId, {
      recipientScholarId: recipientId,
      relationship: 'Doctoral Supervisor',
      subjectArea: '   ',
      endorsementText: 'Outstanding doctoral dissertation and research.',
    });
    expect(res1.error).toBe('Subject area and endorsement text are required.');

    const res2 = await submitPeerEndorsement(endorserId, {
      recipientScholarId: recipientId,
      relationship: 'Doctoral Supervisor',
      subjectArea: 'New Testament Studies',
      endorsementText: '   ',
    });
    expect(res2.error).toBe('Subject area and endorsement text are required.');
  });
});
