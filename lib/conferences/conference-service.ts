import {
  GuildConference,
  ScholarConferenceAppearance,
  ConferenceInterview,
  CommitteeDeliberationNotes,
  ScheduleInterviewInput,
} from './conference-types';

export const GUILD_CONFERENCES: GuildConference[] = [
  {
    slug: 'ets-2026',
    name: 'ETS 2026',
    fullTitle: '78th Annual Meeting of the Evangelical Theological Society',
    dates: 'November 17–19, 2026',
    city: 'San Antonio, TX',
    venue: 'Henry B. González Convention Center & Grand Hyatt',
    theme: 'The Church: Visible and Invisible',
    isUpcoming: true,
  },
  {
    slug: 'sbl-2026',
    name: 'SBL / AAR 2026',
    fullTitle: 'Society of Biblical Literature & American Academy of Religion Annual Meeting',
    dates: 'November 21–24, 2026',
    city: 'San Antonio, TX',
    venue: 'Henry B. González Convention Center & Marriott Rivercenter',
    theme: 'Scripture, Society, and Human Flourishing',
    isUpcoming: true,
  },
  {
    slug: 'eps-2026',
    name: 'EPS 2026',
    fullTitle: 'Evangelical Philosophical Society Annual Meeting',
    dates: 'November 18–20, 2026',
    city: 'San Antonio, TX',
    venue: 'Grand Hyatt San Antonio River Walk',
    theme: 'Philosophical Theology and Christian Rationality',
    isUpcoming: true,
  },
];

export const REFERENCE_CONFERENCE_APPEARANCES: ScholarConferenceAppearance[] = [
  {
    id: 'app-001',
    scholarId: 'e0000000-0000-0000-0000-000000000001',
    scholarName: 'Dr. Thomas Cranmer-Davies',
    scholarSlug: 'thomas-cranmer-davies',
    conferenceSlug: 'ets-2026',
    conferenceName: 'ETS 2026',
    sessionName: 'Old Testament & Hebrew Poetics Section',
    paperTitle: 'Acoustic Parallelism and Phonological Structures in the Exilic Psalms of Lament',
    presentationTime: 'Wednesday, Nov 18, 9:00 AM – 9:40 AM',
    locationRoom: 'Convention Center Room 214A',
    terminalDegree: 'D.Phil. in Oriental Studies (Hebrew & Semitic Languages), University of Oxford',
    primaryDiscipline: 'Old Testament',
    confessionalTradition: 'Anglican / Reformed Episcopalian',
    availableForInterviews: true,
    openSlots: [
      'Tue Nov 17 2:00 PM',
      'Tue Nov 17 3:00 PM',
      'Wed Nov 18 2:30 PM',
      'Thu Nov 19 10:00 AM',
    ],
  },
  {
    id: 'app-002',
    scholarId: 'e0000000-0000-0000-0000-000000000002',
    scholarName: 'Dr. Marcus Aurelius Vance',
    scholarSlug: 'marcus-aurelius-vance',
    conferenceSlug: 'eps-2026',
    conferenceName: 'EPS 2026',
    sessionName: 'Reformed Epistemology & Presuppositional Apologetics Section',
    paperTitle: 'Transcendental Critique and the Indispensability of Special Revelation in Scientific Heuristics',
    presentationTime: 'Wednesday, Nov 18, 2:15 PM – 2:55 PM',
    locationRoom: 'Grand Hyatt Lone Star Ballroom C',
    terminalDegree: 'Ph.D. in Philosophical Theology, University of Edinburgh',
    primaryDiscipline: 'Systematic Theology & Apologetics',
    confessionalTradition: 'Reformed Baptist (1689)',
    availableForInterviews: true,
    openSlots: [
      'Wed Nov 18 4:00 PM',
      'Thu Nov 19 9:00 AM',
      'Thu Nov 19 11:30 AM',
    ],
  },
  {
    id: 'app-003',
    scholarId: 'e0000000-0000-0000-0000-000000000003',
    scholarName: 'Dr. Elizabeth Montgomery-Knox',
    scholarSlug: 'elizabeth-montgomery-knox',
    conferenceSlug: 'sbl-2026',
    conferenceName: 'SBL / AAR 2026',
    sessionName: 'Ethics and Biblical Interpretation Consultation',
    paperTitle: 'The Decalogue as Ecological and Civic Habituation in Reformation Exegesis',
    presentationTime: 'Saturday, Nov 21, 1:00 PM – 1:40 PM',
    locationRoom: 'Convention Center Room 302B',
    terminalDegree: 'Ph.D. in Theological Ethics, Princeton Theological Seminary',
    primaryDiscipline: 'Christian Ethics & Practical Theology',
    confessionalTradition: 'Presbyterian (PCA / EPC)',
    availableForInterviews: true,
    openSlots: [
      'Sat Nov 21 3:30 PM',
      'Sun Nov 22 10:00 AM',
      'Mon Nov 23 2:00 PM',
    ],
  },
  {
    id: 'app-004',
    scholarId: 'e0000000-0000-0000-0000-000000000001',
    scholarName: 'Dr. Thomas Cranmer-Davies',
    scholarSlug: 'thomas-cranmer-davies',
    conferenceSlug: 'sbl-2026',
    conferenceName: 'SBL / AAR 2026',
    sessionName: 'Hebrew Scriptures & Cognate Literature Section',
    paperTitle: 'Ugaritic Epistolary Formulas and the Iron Age Epigraphic Corpus',
    presentationTime: 'Sunday, Nov 22, 10:45 AM – 11:25 AM',
    locationRoom: 'Convention Center Room 217C',
    terminalDegree: 'D.Phil. in Oriental Studies (Hebrew & Semitic Languages), University of Oxford',
    primaryDiscipline: 'Old Testament',
    confessionalTradition: 'Anglican / Reformed Episcopalian',
    availableForInterviews: true,
    openSlots: [
      'Sun Nov 22 2:00 PM',
      'Mon Nov 23 11:00 AM',
    ],
  },
];

// In-memory persistent state for scheduled interviews and deliberation notes during runtime
const scheduledInterviewsStore: ConferenceInterview[] = [
  {
    id: 'int-001',
    conferenceSlug: 'ets-2026',
    scholarId: 'e0000000-0000-0000-0000-000000000001',
    scholarName: 'Dr. Thomas Cranmer-Davies',
    scholarSlug: 'thomas-cranmer-davies',
    institutionId: 'f2000000-0000-0000-0000-000000000001',
    institutionName: 'Westminster Theological Seminary',
    timeSlot: 'Tue Nov 17 2:00 PM',
    locationLabel: 'Grand Hyatt Executive Lounge Suite 612',
    status: 'scheduled',
    candidateFocus: 'Associate Professor of Old Testament search committee screening',
    deliberationNotes: {
      scholarshipScore: 5,
      pedagogyScore: 4,
      confessionalScore: 5,
      recommendation: 'strong_hire',
      evaluatorName: 'Dean of Faculty / Search Committee Chair',
      privateNotes: 'Exceptional linguistic pedigree in Semitic philology. Affirmation of Westminster standards is clear and enthusiastic.',
      updatedAt: '2026-10-02T08:00:00.000Z',
    },
    createdAt: '2026-10-01T14:30:00.000Z',
  },
];

export function getUpcomingConferences(): GuildConference[] {
  return GUILD_CONFERENCES;
}

export function getConferenceBySlug(slug: string): GuildConference | undefined {
  return GUILD_CONFERENCES.find((c) => c.slug === slug);
}

export function getConferenceAttendees(
  conferenceSlug?: 'ets-2026' | 'sbl-2026' | 'eps-2026'
): ScholarConferenceAppearance[] {
  if (!conferenceSlug) {
    return REFERENCE_CONFERENCE_APPEARANCES;
  }
  return REFERENCE_CONFERENCE_APPEARANCES.filter(
    (app) => app.conferenceSlug === conferenceSlug
  );
}

export function getScholarConferenceAppearances(
  scholarSlug: string
): ScholarConferenceAppearance[] {
  return REFERENCE_CONFERENCE_APPEARANCES.filter(
    (app) => app.scholarSlug === scholarSlug
  );
}

export function getInstitutionConferenceDocket(
  institutionId: string,
  conferenceSlug: 'ets-2026' | 'sbl-2026' | 'eps-2026' = 'ets-2026'
): {
  conference: GuildConference;
  attendees: ScholarConferenceAppearance[];
  scheduledInterviews: ConferenceInterview[];
} {
  const conference =
    getConferenceBySlug(conferenceSlug) || GUILD_CONFERENCES[0];
  const attendees = getConferenceAttendees(conferenceSlug);
  const scheduledInterviews = scheduledInterviewsStore.filter(
    (int) =>
      int.institutionId === institutionId &&
      int.conferenceSlug === conferenceSlug
  );

  return {
    conference,
    attendees,
    scheduledInterviews,
  };
}

export async function scheduleConferenceInterview(
  input: ScheduleInterviewInput
): Promise<{ success: boolean; interview?: ConferenceInterview; error?: string }> {
  if (!input.scholarId || !input.institutionId || !input.timeSlot) {
    return { success: false, error: 'Missing required interview fields.' };
  }

  const appearance = REFERENCE_CONFERENCE_APPEARANCES.find(
    (app) =>
      app.scholarId === input.scholarId &&
      app.conferenceSlug === input.conferenceSlug
  );

  const scholarName = appearance?.scholarName || 'Scholar';
  const scholarSlug = appearance?.scholarSlug || 'scholar';

  // Check for collision with an existing interview at the same time slot for this institution
  const existingSlot = scheduledInterviewsStore.find(
    (int) =>
      int.institutionId === input.institutionId &&
      int.conferenceSlug === input.conferenceSlug &&
      int.timeSlot === input.timeSlot &&
      int.status !== 'canceled'
  );

  if (existingSlot) {
    return {
      success: false,
      error: `Your committee already has an interview booked at ${input.timeSlot}.`,
    };
  }

  const newInterview: ConferenceInterview = {
    id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    conferenceSlug: input.conferenceSlug,
    scholarId: input.scholarId,
    scholarName,
    scholarSlug,
    institutionId: input.institutionId,
    institutionName: input.institutionName,
    timeSlot: input.timeSlot,
    locationLabel: input.locationLabel || 'Convention Hotel Meeting Area',
    status: 'scheduled',
    candidateFocus: input.candidateFocus || 'Preliminary screening interview',
    createdAt: new Date().toISOString(),
  };

  scheduledInterviewsStore.push(newInterview);
  return { success: true, interview: newInterview };
}

export async function recordCommitteeDeliberationNotes(
  interviewId: string,
  notes: CommitteeDeliberationNotes
): Promise<{ success: boolean; error?: string }> {
  const interview = scheduledInterviewsStore.find((i) => i.id === interviewId);
  if (!interview) {
    return { success: false, error: 'Interview not found.' };
  }

  interview.deliberationNotes = {
    ...notes,
    updatedAt: new Date().toISOString(),
  };

  return { success: true };
}
