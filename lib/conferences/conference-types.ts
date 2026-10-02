export interface GuildConference {
  slug: 'ets-2026' | 'sbl-2026' | 'eps-2026';
  name: string;
  fullTitle: string;
  dates: string;
  city: string;
  venue: string;
  theme?: string;
  isUpcoming: boolean;
}

export interface ScholarConferenceAppearance {
  id: string;
  scholarId: string;
  scholarName: string;
  scholarSlug: string;
  conferenceSlug: 'ets-2026' | 'sbl-2026' | 'eps-2026';
  conferenceName: string;
  sessionName: string;
  paperTitle: string;
  presentationTime: string;
  locationRoom: string;
  terminalDegree: string;
  primaryDiscipline: string;
  confessionalTradition: string;
  availableForInterviews: boolean;
  openSlots: string[];
}

export interface CommitteeDeliberationNotes {
  scholarshipScore: number; // 1-5
  pedagogyScore: number; // 1-5
  confessionalScore: number; // 1-5
  recommendation: 'strong_hire' | 'consider' | 'hold' | 'decline';
  evaluatorName: string;
  privateNotes: string;
  updatedAt: string;
}

export interface ConferenceInterview {
  id: string;
  conferenceSlug: 'ets-2026' | 'sbl-2026' | 'eps-2026';
  scholarId: string;
  scholarName: string;
  scholarSlug: string;
  institutionId: string;
  institutionName: string;
  timeSlot: string;
  locationLabel: string;
  status: 'scheduled' | 'completed' | 'canceled';
  candidateFocus: string;
  deliberationNotes?: CommitteeDeliberationNotes;
  createdAt: string;
}

export interface ScheduleInterviewInput {
  conferenceSlug: 'ets-2026' | 'sbl-2026' | 'eps-2026';
  scholarId: string;
  institutionId: string;
  institutionName: string;
  timeSlot: string;
  locationLabel: string;
  candidateFocus: string;
}
