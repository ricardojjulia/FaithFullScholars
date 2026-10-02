import { describe, it, expect } from 'vitest';
import {
  getUpcomingConferences,
  getConferenceBySlug,
  getConferenceAttendees,
  getScholarConferenceAppearances,
  getInstitutionConferenceDocket,
  scheduleConferenceInterview,
  recordCommitteeDeliberationNotes,
} from '@/lib/conferences/conference-service';

describe('Theological Guild Conference Service (ADR 0021)', () => {
  it('1. retrieves upcoming annual guild meetings (ETS, SBL/AAR, EPS)', () => {
    const conferences = getUpcomingConferences();
    expect(conferences).toHaveLength(3);
    expect(conferences.map((c) => c.slug)).toEqual(['ets-2026', 'sbl-2026', 'eps-2026']);
    expect(conferences[0].city).toBe('San Antonio, TX');
  });

  it('2. retrieves a specific conference by its slug', () => {
    const ets = getConferenceBySlug('ets-2026');
    expect(ets).toBeDefined();
    expect(ets?.name).toBe('ETS 2026');
    expect(ets?.theme).toBe('The Church: Visible and Invisible');

    const unknown = getConferenceBySlug('unknown-conf');
    expect(unknown).toBeUndefined();
  });

  it('3. filters conference attendees and presented papers by conference slug', () => {
    const allAppearances = getConferenceAttendees();
    expect(allAppearances.length).toBeGreaterThan(0);

    const etsAttendees = getConferenceAttendees('ets-2026');
    expect(etsAttendees.length).toBeGreaterThan(0);
    expect(etsAttendees.every((a) => a.conferenceSlug === 'ets-2026')).toBe(true);

    const sblAttendees = getConferenceAttendees('sbl-2026');
    expect(sblAttendees.every((a) => a.conferenceSlug === 'sbl-2026')).toBe(true);
  });

  it('4. retrieves conference appearances for a specific scholar by slug', () => {
    const cranmer = getScholarConferenceAppearances('thomas-cranmer-davies');
    expect(cranmer.length).toBeGreaterThanOrEqual(1);
    expect(cranmer[0].scholarName).toBe('Dr. Thomas Cranmer-Davies');
    expect(cranmer[0].paperTitle).toContain('Psalms of Lament');
    expect(cranmer[0].availableForInterviews).toBe(true);
    expect(cranmer[0].openSlots.length).toBeGreaterThan(0);
  });

  it('5. returns institution conference docket with attendees and scheduled interviews', () => {
    const institutionId = 'f2000000-0000-0000-0000-000000000001';
    const docket = getInstitutionConferenceDocket(institutionId, 'ets-2026');

    expect(docket.conference.slug).toBe('ets-2026');
    expect(docket.attendees.length).toBeGreaterThan(0);
    expect(docket.scheduledInterviews.length).toBeGreaterThan(0);
    expect(docket.scheduledInterviews[0].institutionId).toBe(institutionId);
  });

  it('6. successfully books a convention screening interview slot', async () => {
    const institutionId = 'f2000000-0000-0000-0000-000000000002';
    const result = await scheduleConferenceInterview({
      conferenceSlug: 'ets-2026',
      scholarId: 'e0000000-0000-0000-0000-000000000001',
      institutionId,
      institutionName: 'Reformed Theological Seminary',
      timeSlot: 'Wed Nov 18 2:30 PM',
      locationLabel: 'Convention Center Lounge Table 3',
      candidateFocus: 'Old Testament Chair Screening',
    });

    expect(result.success).toBe(true);
    expect(result.interview).toBeDefined();
    expect(result.interview?.timeSlot).toBe('Wed Nov 18 2:30 PM');
    expect(result.interview?.status).toBe('scheduled');
  });

  it('7. prevents collision when booking the same time slot for the same institution', async () => {
    const institutionId = 'f2000000-0000-0000-0000-000000000003';
    const slot = 'Thu Nov 19 10:00 AM';

    const first = await scheduleConferenceInterview({
      conferenceSlug: 'ets-2026',
      scholarId: 'e0000000-0000-0000-0000-000000000001',
      institutionId,
      institutionName: 'Trinity Evangelical Divinity School',
      timeSlot: slot,
      locationLabel: 'Marriott Suite 410',
      candidateFocus: 'Biblical Studies Search',
    });
    expect(first.success).toBe(true);

    const collision = await scheduleConferenceInterview({
      conferenceSlug: 'ets-2026',
      scholarId: 'e0000000-0000-0000-0000-000000000001',
      institutionId,
      institutionName: 'Trinity Evangelical Divinity School',
      timeSlot: slot,
      locationLabel: 'Marriott Suite 410',
      candidateFocus: 'Second Attempt',
    });
    expect(collision.success).toBe(false);
    expect(collision.error).toContain('already has an interview booked');
  });

  it('8. rejects interview booking with missing required fields', async () => {
    const result = await scheduleConferenceInterview({
      conferenceSlug: 'ets-2026',
      scholarId: '',
      institutionId: 'inst-1',
      institutionName: 'Seminary',
      timeSlot: '',
      locationLabel: '',
      candidateFocus: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing required interview fields.');
  });

  it('9. records confidential search committee deliberation scoring and recommendation', async () => {
    const institutionId = 'f2000000-0000-0000-0000-000000000004';
    const booking = await scheduleConferenceInterview({
      conferenceSlug: 'eps-2026',
      scholarId: 'e0000000-0000-0000-0000-000000000002',
      institutionId,
      institutionName: 'Beeson Divinity School',
      timeSlot: 'Thu Nov 19 9:00 AM',
      locationLabel: 'Grand Hyatt Room 712',
      candidateFocus: 'Christian Apologetics Screening',
    });

    expect(booking.success).toBe(true);
    const interviewId = booking.interview!.id;

    const notesResult = await recordCommitteeDeliberationNotes(interviewId, {
      scholarshipScore: 5,
      pedagogyScore: 4,
      confessionalScore: 5,
      recommendation: 'strong_hire',
      evaluatorName: 'Dr. Academic Dean',
      privateNotes: 'Superb defense of presuppositional epistemology. Strong collegial fit.',
      updatedAt: new Date().toISOString(),
    });

    expect(notesResult.success).toBe(true);
  });

  it('10. returns error when attempting to record notes on non-existent interview', async () => {
    const notesResult = await recordCommitteeDeliberationNotes('non-existent-interview-id', {
      scholarshipScore: 3,
      pedagogyScore: 3,
      confessionalScore: 3,
      recommendation: 'hold',
      evaluatorName: 'Dean',
      privateNotes: 'None',
      updatedAt: new Date().toISOString(),
    });

    expect(notesResult.success).toBe(false);
    expect(notesResult.error).toBe('Interview not found.');
  });
});
