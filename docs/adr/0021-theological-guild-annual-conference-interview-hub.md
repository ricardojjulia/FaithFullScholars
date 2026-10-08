# ADR 0021: Theological Guild Annual Conference (ETS/SBL/EPS) Mobile Interview & Presentation Hub

- **Status:** Approved. **Amended 2026-10-08:** the hub runs on in-memory demo data, so it is a staff-only preview labelled "Preview — demo data, nothing is saved" (non-staff see "coming soon" and no nav link), the false "Saved to Committee Docket" message and the default scores are removed, and the demo conference appearances no longer appear on public scholar profiles. Spec: `docs/superpowers/specs/2026-10-08-real-portal-data.md`.
- **Date:** 2026-10-02
- **Deciders:** Council Review #11 (Agents 1–5, Documenter, Lead Architect)
- **Consulted:** Deans of Faculty, Search Committee Chairs, Theological Society Members, Contingent Faculty

---

## 1. Context and Problem Statement

In theological higher education, preliminary faculty hiring, adjunct vetting, doctoral candidate screening, and scholarly networking do not occur evenly throughout the calendar year. Over 70% of candidate interviews and publishing discussions physically transpire during a 4-day window in mid-November at the joint Annual Meetings of the **Evangelical Theological Society (ETS)**, the **Society of Biblical Literature (SBL)**, the **American Academy of Religion (AAR)**, and the **Evangelical Philosophical Society (EPS)**.

Search committees traditionally navigate convention hotels carrying thick binders of printed CVs, conducting 30-minute screening interviews in crowded hotel lobbies and suites. Committee members take fragmented handwritten notes that must later be collated. Simultaneously, doctoral candidates and contingent scholars invest significant personal funds ($1,200–$2,000) to attend and present academic papers, hoping their monograph presentations attract the attention of hiring institutions.

Prior to Council Review #11, FaithFull Scholars functioned as an evergreen web directory without calendar or event awareness:
1. Scholars could not highlight their scheduled conference presentations or indicate availability for convention interviews.
2. Institutional search committees could not filter applicants by conference attendance or generate a mobile-friendly, convention floor interview docket with real-time scoring rubrics and confidential committee notes.

---

## 2. Decision Drivers

1. **High Seasonal Criticality:** The ETS/SBL/EPS 2026 Annual Meetings take place in November—exactly six weeks from today. Search committees are scheduling candidate interviews now.
2. **Multi-Tenant Privacy:** Committee interview deliberation notes and candidate rankings must remain strictly confidential to the interviewing institution under PostgreSQL Row Level Security.
3. **Mobile & Print Ergonomics:** Search committee members need touch-friendly interfaces that work seamlessly on smartphones and tablets in convention center halls, with rapid print support for backup.
4. **Integration with Existing Architecture:** Must leverage existing scholar profiles, ATS Standard 3 credentials, Confessional Lens alignment matrices, and applicant triage states (ADR 0020) without requiring schema rewrites.

---

## 3. Considered Options

- **Option A (External Integration Only):** Provide a static PDF download or external Google Calendar link for scholars to link in their bios.  
  *Rejected:* Does not allow search committees to filter by conference attendance, lacks standardized rubrics, and offers zero multi-tenant note security.
- **Option B (Separate Standalone Event App):** Build a separate micro-service or external event application.  
  *Rejected:* High architectural overhead; severs candidate dossiers from verified ATS credentials, syllabi, and confessional affirmations.
- **Option C (Unified Conference Suite & Floor Docket — Selected):** Native conference schedule data structures in `lib/conferences/`, integrated profile presentation badges, 1-click convention interview scheduling modals, and a dedicated mobile-ready search committee floor docket at `/institution/conferences`.

---

## 4. Decision Outcome

We adopt **Option C: Unified Conference Suite & Floor Docket**.

### Architecture & Capabilities:
1. **Conference Domain Modeling (`lib/conferences/conference-types.ts`):**
   - Annual guild meetings: ETS 2026 (San Antonio), SBL/AAR 2026 (San Antonio), EPS 2026.
   - Scholar conference appearances: event, paper title, session category, date/time, and room/location.
   - Convention interview schedules: 30-minute interview slots with location tags (e.g., "Grand Hyatt Suite 412", "Convention Center Lobby Lounge").
   - Search committee scoring rubrics: 1–5 scoring on scholarship, pedagogical delivery, and confessional alignment, with confidential committee notes.
2. **Service Layer (`lib/conferences/conference-service.ts`):**
   - Query attendees and scheduled presentations by conference.
   - Schedule and manage convention interviews.
   - Aggregate confidential committee evaluations and deliberation notes scoped to the institution.
3. **Search Committee Convention Suite (`/institution/conferences`):**
   - Touch-optimized candidate floor docket displaying interview agenda, candidate dossier summaries, confessional match scores, and live deliberation note-taking.
4. **Profile & Directory Badges (`<ConferencePresentationBadge />`):**
   - Visual badge on scholar profile dossiers (`/scholars/[slug]`) and candidate applicant matrices (`/institution/postings/[id]/applicants`) highlighting upcoming paper presentations and interview availability.
5. **Interview Scheduling Modal (`<ConferenceInterviewModal />`):**
   - 1-click convention interview request dispatch connecting search committees directly to attending scholars.

---

## 5. Security & Multi-Tenant Isolation

- **Confidentiality:** All search committee deliberation notes, interview feedback, and candidate rankings are private to the institutional tenant.
- **Data Protection:** No private scholar contact information (email, phone) is exposed; communication occurs through authenticated platform dispatch.
- **Audit Logging:** Convention interview bookings and note submissions maintain audit timestamps.

---

## 6. Verification and Validation

- **Unit Testing:** `tests/unit/conference-service.test.ts` validates conference appearance querying, interview slot scheduling, and committee scoring serialization.
- **Quality Gates:** Must pass `npm run typecheck`, `npm run lint`, `npm run test`, `npm run audit:rls`, `npm run audit:security`, `npm run test:e2e`, and `npm run build`.
- **Localization:** 100% symmetric bilingual support in `en.json` and `es.json` under `conferences` namespace.
