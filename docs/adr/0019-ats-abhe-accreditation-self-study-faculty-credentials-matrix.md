# ADR 0019: ATS/ABHE Accreditation Self-Study Faculty Credentials Matrix & Standard 3 Compliance Report

## Status
Accepted (Council Review #9 / Phase 16 Strategic Capability)

## Context
Under ATS (Association of Theological Schools) Commission on Accrediting Standard 3 (Faculty and Scholarly Community) and ABHE (Association for Biblical Higher Education) Standard 11 (Faculty Qualifications), accredited seminaries, theological colleges, and Bible universities are required during decennial comprehensive self-studies and mid-cycle reports to produce an exhaustive Faculty Credentials Matrix. This documentation requires deans, provosts, and Accreditation Liaison Officers (ALOs) to compile:
1. Faculty terminal degrees (Ph.D., Th.D., D.Min., S.T.D.) and accredited degree-granting institutions.
2. Alignment between terminal degrees and primary assigned teaching disciplines.
3. Ratio of full-time and affiliated faculty possessing terminal degrees (minimum 50% for M.Div., higher for research master's and doctoral degrees).
4. Evidence of continuous scholarly activity (peer-reviewed publications, monographs, journal articles).
5. Affirmation of institutional and confessional doctrinal standards.

Currently, theological deans spend 60–100 hours per self-study compiling this data manually from disparate CVs and spreadsheets.

## Decision
1. Implement a specialized accreditation reporting engine in `lib/accreditation/ats-matrix-generator.ts` that ingests an institution's saved faculty roster (`public.saved_scholars`, `public.scholars`, `public.credentials`, `public.publications`, `public.scholar_confessions`).
2. Calculate key ATS/ABHE compliance metrics:
   - Terminal degree qualification ratio (e.g. % of roster with doctorate).
   - Primary teaching field alignment indicators.
   - Verified scholarship output counts.
   - Confessional affirmation verification markers.
3. Build `<ATSComplianceMatrixTable />` in `components/institution/ats-compliance-matrix-table.tsx` rendering:
   - Compliance summary KPI metric cards (Total Faculty, % Terminal Doctorate, Peer-Reviewed Publications, Confessionally Affirmed).
   - An ATS Table 1 & Table 2 structured matrix with print-optimized CSS for direct inclusion in accreditation self-study dossiers.
   - 1-click CSV export generating a cleanly formatted spreadsheet for institutional reporting binders.
4. Mount the dedicated view at `/institution/saved/accreditation` within the institutional portal shell and link it from the institutional navigation and saved shortlist view.
5. Create branded root error boundaries (`app/not-found.tsx`, `app/error.tsx`) to enhance resilience across dynamic routes.
6. Maintain 100% symmetric English (`en.json`) and Spanish (`es.json`) localization under the `accreditation` namespace.
7. Provide comprehensive unit testing in `tests/unit/ats-matrix-generator.test.ts`.

## Consequences
- **Positive**: Directly solves a major administrative burden for seminary deans, provosts, and ALOs, cementing FaithFull Scholars as an indispensable institutional governance platform.
- **Positive**: Encourages scholars to keep credentials, publications, and confessional affirmations up-to-date to ensure clean institutional compliance records.
- **Data Model**: Zero database migrations or schema alterations required; runs cleanly on existing tables and RLS policies.
- **Security & RLS**: All data access is strictly governed by institutional user session authentication and `saved_scholars` multi-tenant RLS isolation.
