# ADR 0009: Theological Conference Speaker Directory & Institutional Speaking Bureau

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Council (Data, Routes, UX, Feature Agents) & Core Engineering
- **Consulted:** Institutional Deans, Academic Conference Organizers, Theological Societies (ETS, SBL, IBR)

---

## Context

Theological seminaries, Christian colleges, university student ministries, churches, and academic societies regularly search for qualified, confessional speakers for:
1. **Academic Symposiums & Annual Lecture Series**: Keynote addresses (e.g. Staley Lectures, Payton Lectures, Reformation Day lectures).
2. **Seminary Chapel Preachers & Convocation Addresses**: Doctrinally vetted faculty who can minister to pastoral trainees.
3. **Conference Panelists & Guest Lecturers**: Specialized theological topic experts for intensive modular workshops.

While scholars on FaithFull Scholars have boolean availability flags (`guest_lecture: boolean`, `conference_speaking: boolean`), there is currently no structured surface to showcase **keynote lecture topics**, sample audio/video sermon or lecture recordings, geographic travel preferences, or honorarium parameters. Conference directors and event committees are forced to search general faculty directories and guess at a scholar's preferred speaking themes.

---

## Decision

We establish a dedicated **Theological Conference Speaker Directory & Speaking Bureau** within FaithFull Scholars:

### 1. Data Architecture & Multi-Tenant RLS
- Create `public.speaker_topics` table:
  - `id` (UUID primary key)
  - `scholar_id` (UUID foreign key referencing `scholars.id` with CASCADE delete)
  - `title` (TEXT, e.g. *"Union with Christ in Pauline Theology"*)
  - `description` (TEXT, detailed abstract of the lecture)
  - `target_audience` (TEXT, e.g. `'academic'`, `'pastoral'`, `'church_wide'`)
  - `sample_media_url` (TEXT, nullable link to YouTube, Vimeo, or MP3 audio recording)
  - `display_order` (INTEGER default 0)
  - `is_featured` (BOOLEAN default false)
- Extend `public.availability_profiles`:
  - `travel_preferences` (TEXT, e.g. `'Regional / Virtual preferred'`, `'Domestic & International'`)
  - `speaking_bio` (TEXT, speaker-oriented bio focusing on preaching/lecturing experience)
  - `honorarium_policy` (TEXT, e.g. `'Standard institutional honorarium + travel expenses'`)
- **Row Level Security (RLS)**:
  - Public SELECT: Allowed for topics belonging to `scholars` where `profile_status = 'approved'` and `availability_profiles.conference_speaking = true` or `guest_lecture = true`.
  - Scholar INSERT/UPDATE/DELETE: Restricted strictly to `scholar_id = (SELECT auth.uid())`.
  - Admin ALL: Allowed for platform administrators.

### 2. Public Surface & Navigation
- Add **Speakers** navigation destination to `components/shell/public-nav.tsx` leading to `/speakers`.
- Build `/speakers` directory:
  - Faceted filtering by Theological Discipline, Confessional Tradition, Target Audience, and Delivery Mode (In-Person / Virtual).
  - Speaker cards highlighting doctoral credentials, institutional affiliation, primary lecture topics, and sample lecture previews.
- Public Scholar Dossier integration:
  - Add "Keynote Lectures & Speaking Topics" card to `/scholars/[slug]`.
  - "Invite as Speaker" CTA button triggering the structured inquiry modal with pre-selected `opportunity_type: 'conference_speaking'` and topic context.

### 3. Scholar Workspace Management
- Update `/dashboard/availability`:
  - Add interactive "Speaking Bureau & Keynote Topics" management section allowing scholars to add, edit, reorder, and remove speaking topics.
  - Configure travel parameters and speaker bio.

---

## Consequences

### Positive
- Opens a high-frequency, high-value recruitment channel for theological colleges and conference directors.
- Gives scholars a professional academic speaking bureau portfolio to showcase their best lectures.
- Enhances discovery without creating a separate siloed application—built directly on the existing `scholars`, `inquiries`, and RLS infrastructure.

### Negative / Trade-offs
- Adds one more table (`speaker_topics`) and additional columns to `availability_profiles`, requiring test and pre-flight synchronization.
