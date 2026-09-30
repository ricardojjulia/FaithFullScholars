# Council Review #10 — Agent 5: The Wildcard (Innovation & Lateral Thinking Catalyst)

**Date:** 2026-09-30  
**Auditor:** Council Agent 5 (The Wildcard — Innovation & Lateral Thinking Catalyst)  
**Activation Mode:** Dual Mode (Mode A: Outside-the-Box Provocateur + Mode B: Direct Improvement Challenge)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Assumption Challenging & Unorthodox Perspectives

1. **The "Outbound Search vs. Inbound Triage" Fallacy (The Asymmetric Market Trap)**  
   The platform heavily assumes institutional deans act as active outbound headhunters—filtering directories, building shortlists, and generating board dockets (`/institution/saved/dossier`). In theological higher education, the inverse is reality: search committees post an opening and are immediately inundated with 50+ unstructured email packets containing 40-page CVs, personal statements, and letters of recommendation. Simultaneously, qualified adjuncts and doctoral graduates spend dozens of hours retyping confessional affirmations and credentials into disparate institutional portals. We have treated job postings (`/opportunities`) as simple marketing billboards with an unlinked `express-interest` contact form. Inverting this pattern transforms FaithFull Scholars into the **"Confessional Common App"**—standardizing and automating inbound application triage.

2. **The "Calendar-Blind Platform" Fallacy (The Annual Guild Convention Vacuum)**  
   Academic platforms assume engagement is uniform throughout the year. Yet in theological academia, over 70% of faculty hiring, adjunct vetting, doctoral networking, and sabbatical planning physically occurs across 4 days in November at the **Evangelical Theological Society (ETS)**, **Society of Biblical Literature (SBL)**, and **Evangelical Philosophical Society (EPS)** annual meetings. Platforms treat conferences as external events. FaithFull Scholars can capture this annual epicenter by integrating conference presence directly into candidate discovery and mobile interview triage.

---

## 2. The "What If?" Innovation Proposals

### Proposal 1: Confessional "Common App" & Search Committee Applicant Matrix (ADR 0020)
* **Concept & Non-Obvious Insight**: Invert the job board from an outbound billboard into an automated candidate clearinghouse. When a scholar clicks "Express Interest" on an opportunity (`/opportunities/[slug]`), the system packages their verified profile, ATS Standard 3 credentials snapshot, affirmed confessional standards, and sample syllabi into a sealed **Candidate Dossier Application**. The sponsoring institution’s dashboard (`/institution/postings/[id]/applicants`) instantly renders an **Applicant Comparison Matrix** scoring confessional fit, terminal degree discipline alignment, and teaching experience across the applicant pool.
* **User & Persona Impact**:
  * *Scholars*: One-click application with verified academic pedigree; real-time application status tracking (`submitted` → `under_review` → `interview_scheduled` → `declined`).
  * *Search Committees & Deans*: Eliminates 30+ hours of PDF collation; delivers standardized, side-by-side candidate comparison tables with automated doctrinal alignment indicators.
* **Data & Architecture Feasibility**:
  * Upgrades `inquiries` (or introduces `posting_applications` linking `posting_id`, `scholar_id`, `status`, `dossier_snapshot: jsonb`).
  * Extends `/institution/postings` with a dedicated `/institution/postings/[id]/applicants` route.
  * Reuses `<ATSComplianceMatrixTable />` and `<ConfessionalMatchBadge />` UI primitives.
* **Proposed Specification**: **ADR 0020: Confessional Common Application & Search Committee Applicant Matrix**.

---

### Proposal 2: Theological Guild Annual Conference (ETS/SBL/EPS) Mobile Interview Docket (ADR 0021)
* **Concept & Non-Obvious Insight**: A seasonal "Conference Sync" hub. Scholars flag their attendance, presented papers, and open meeting slots for the November ETS/SBL meetings. Search committees filter by "Attending ETS 2026", schedule 30-minute hotel/convention center interview slots, and generate a mobile-optimized, offline-cached **Floor Briefing Docket** with candidate CV highlights, confessional fit rubrics, and committee evaluation notes.
* **User & Persona Impact**:
  * *Deans*: Mobile interview execution on the convention floor without paper binders; synchronized committee scoring notes.
  * *Scholars*: Maximizes costly conference travel by converting monograph presentations into scheduled institutional interviews.
* **Data & Architecture Feasibility**:
  * Stores conference attendance in `availability_profiles.conference_appearances` (JSONB).
  * Adds conference filter in `/scholars` and a responsive `/institution/conference-docket` view.
* **Proposed Specification**: **ADR 0021: Theological Guild Conference Interview Suite**.

---

### Proposal 3: Rapid Adjunct Dispatch ("Podium S.O.S.") (ADR 0022)
* **Concept & Non-Obvious Insight**: An emergency course broadcast mechanism for sudden vacancies (<30 days before term start). Automatically matches available, confessionally vetted adjunct faculty with vacant course sections (e.g., Greek I, Systematic Theology II) with pre-negotiated compensation baselines.
* **User & Persona Impact**: Rescues canceled seminary classes within 72 hours; provides immediate teaching income for qualified adjuncts.
* **Data & Architecture Feasibility**: Extends `institution_postings` with `is_urgent: true` and leverages `lib/search/confessional-matcher.ts`.
* **Proposed Specification**: **ADR 0022: Emergency Course Coverage & Rapid Adjunct Dispatch Network**.

---

## 3. Rapid Prototyping Path: Proposal 1 (ADR 0020)

To deliver **Proposal 1 (ADR 0020)** in a single focused cycle:

1. **Application Data Layer**: Extend `lib/postings/postings-service.ts` with `getPostingApplicants(postingId)` and `submitPostingApplication(postingId, scholarId, coverNote)`.
2. **Search Committee Applicant View**: Mount `/institution/postings/[id]/applicants/page.tsx` rendering `<PostingApplicantMatrixTable />` showing terminal degree, confessional match badge, and status workflow controls.
3. **Scholar Application Tracker**: Add an "Applications" view under `/dashboard/inquiries` allowing scholars to inspect status and submitted dossiers.
4. **Verification**: Author `tests/unit/posting-applications.test.ts` verifying application serialization and multi-tenant RLS isolation; verify clean with `npm run test` and `npm run build`.
