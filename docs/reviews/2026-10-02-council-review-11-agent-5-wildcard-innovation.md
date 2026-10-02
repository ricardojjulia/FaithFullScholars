# Council Review #11 — Agent 5: The Wildcard (Innovation & Lateral Thinking Catalyst)

**Date:** 2026-10-02  
**Auditor:** Council Agent 5 (The Wildcard — Innovation & Lateral Thinking Catalyst)  
**Activation Mode:** Dual Mode (Mode A: Outside-the-Box Provocateur + Mode B: Direct Improvement Challenge)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Assumption Challenging & Unorthodox Perspectives

1. **The "Calendar-Blind Web Portal" Fallacy (The Annual Guild Meeting Vacuum)**  
   The platform assumes academic recruitment, vetting, and networking occur continuously across the calendar year through desktop browser dashboards. In theological academia, the opposite is true: over 70% of preliminary faculty hiring, adjunct vetting, doctoral networking, and monograph pitches physically transpire during a frantic 4-day window in mid-November at the joint **Evangelical Theological Society (ETS)**, **Society of Biblical Literature (SBL)**, and **Evangelical Philosophical Society (EPS)** Annual Meetings. Search committees carry printed binders between hotel suites, conducting back-to-back 30-minute candidate screenings in convention lobbies. Meanwhile, doctoral candidates spend $1,200+ on travel hoping to convert presentations into interviews. Currently, FaithFull Scholars is completely event-blind: candidates cannot declare conference papers or meeting slots, and committees cannot execute mobile interview dockets on the convention floor.

2. **The "Orderly Semester Horizon" Fallacy (The 72-Hour Course Cancellation Panic)**  
   The platform assumes faculty recruitment follows a leisurely multi-month cycle (post opening → collect dossiers → committee deliberation). In reality, academic deans face acute crises 2–4 weeks before term start: an adjunct abruptly departs, a professor takes emergency medical leave, or required biblical language sections (Greek I, Hebrew Exegesis) spike past capacity. If an instructor is not secured in 72 hours, the section must be canceled, disrupting M.Div. degree sequencing and forfeiting tuition. Our current job board (`/opportunities`) lacks an urgent dispatch mechanism to instantly mobilize pre-aligned, credentialed standby scholars.

---

## 2. The "What If?" Innovation Proposals

### Proposal 1: Theological Guild Annual Conference (ETS/SBL/EPS) Mobile Interview & Presentation Hub
* **Concept & Non-Obvious Insight**: Transform FaithFull Scholars from a static directory into an active field companion for the November annual guild meetings. Scholars declare their conference attendance, paper presentations (session, title, time, room), and open 30-minute institutional meeting slots. Search committees filter applicant matrices (ADR 0020) by "Attending ETS 2026", book convention interview slots, and access a touch-optimized **Mobile Floor Docket** on their smartphones or tablets with instant confessional fit rubrics and synchronized committee scoring notes.
* **User & Persona Impact**:
  * *Search Committees & Deans*: Eliminates physical paper binders; provides one-tap candidate briefing and live deliberation scoring in convention hotel suites.
  * *Scholars*: Dramatically boosts the ROI of costly conference travel by converting monograph presentations into scheduled institutional hiring interviews.
* **Data & Architecture Feasibility**:
  * Extends conference schedule types in `lib/conferences/conference-types.ts` (event, year, paper_title, session_time).
  * Implements `conference-service.ts` for scheduling and retrieving interview dockets with committee scoring notes.
  * Strict Supabase RLS and session authentication guarantees committee deliberation notes are visible only to the interviewing institution.
* **Proposed Specification**: **ADR 0021: Theological Guild Annual Conference Interview & Presentation Hub**.

---

### Proposal 2: Rapid Adjunct Dispatch Network ("Podium S.O.S." / 72-Hour Emergency Course Coverage)
* **Concept & Non-Obvious Insight**: An automated emergency course coverage broadcast. When a course section faces last-minute cancellation (<30 days before term start), deans broadcast an "Urgent Course Need" with required ATS degree qualification, confessional baseline, delivery modality, and fixed stipend. Verified scholars flagged for "Emergency Standby" matching the ATS Standard 3 discipline receive instant notifications and can accept with 1 click.
* **User & Persona Impact**: Rescues canceled seminary classes within 72 hours; protects student degree progression; provides immediate teaching revenue to contingent faculty.
* **Proposed Specification**: **ADR 0022: Emergency Course Coverage & Rapid Adjunct Dispatch Network**.

---

### Proposal 3: Confessional Scruple & Doctrinal Exception Adjudication Engine
* **Concept & Non-Obvious Insight**: In confessional institutions, candidate vetting hinges on explicit theological exceptions ("scruples") to historic confessions (Westminster Confession, 1689 London Baptist, 39 Articles). Candidates submit clause-by-clause commentary on standard confessions; committees review, tag precedent, and generate Board of Trustees doctrinal exception briefs.
* **User & Persona Impact**: Replaces ambiguous email debates with an auditable theological consensus rubric for faculty appointment committees.
* **Proposed Specification**: **ADR 0023: Confessional Scruple & Doctrinal Exception Adjudication Engine**.

---

## 3. Rapid Prototyping Path: Proposal 1 (ADR 0021)

Proposal 1 delivers the highest immediate ROI because the annual ETS/SBL/EPS meetings occur in mid-November—exactly six weeks from today. Search committees are finalizing interview schedules now.

**Single Factory Run Execution Plan:**
1. **Conference Domain & Types (`lib/conferences/conference-types.ts`)**:
   - Model annual meetings (ETS 2026 San Antonio, SBL/AAR 2026 San Antonio, EPS 2026), paper presentations, session rooms, and interview appointment slots.
2. **Service Layer (`lib/conferences/conference-service.ts`)**:
   - Implement conference attendees query, paper presentation catalog, convention interview scheduling, and committee deliberation scoring.
3. **UI Surfaces & App Router**:
   - Add `<ConferencePresentationBadge />` to `/scholars/[slug]` and `<PostingApplicantMatrix />`.
   - Build mobile-ready search committee conference suite `/institution/conferences` rendering convention floor docket with live committee scoring notes and confessional fit rubrics.
   - Build `<ConferenceInterviewModal />` for 1-click convention interview dispatch.
4. **Localization & Verification**:
   - Bilingual i18n support in `lib/i18n/messages/en.json` and `es.json` under `conferences`.
   - Author `tests/unit/conference-service.test.ts`.
   - Run full verification suite (`npm run lint`, `npm run test`, `npm run audit:rls`, `npm run build`).
