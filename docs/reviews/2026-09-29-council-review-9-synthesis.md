# Council Review #9 — Synthesis & Strategic Roadmap

**Date:** September 29, 2026  
**Council Composition:** 6 Agents (Agents 1–4 Baseline Audits, Agent 5 The Wildcard, Agent 6 Documenter)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`  
**Live Production URL:** [https://faithfull-scholars.vercel.app](https://faithfull-scholars.vercel.app)  
**Database:** Supabase `faithfull-scholars-prod` (`yxrvrjkzlumenlvczqjd`) in `us-east-1`  

---

## 1. Executive Summary & Quality Gate Status

Council Review #9 evaluated the complete platform following the delivery of all MVP and post-MVP phases (Phases 0 through 15) and daily baseline verification. All quality gates, security perimeters, and compilation targets are 100% green:

- **Unit & Integration Tests**: 232 / 232 Passing across 46 suites (`npm run test`)
- **Browser E2E Tests**: 38 / 38 Passing across 13 test specs (`npm run test:e2e`)
- **PostgreSQL RLS Coverage**: 35 / 35 Tables PASS with 123 active security policies (`npm run audit:rls`)
- **Database Security (Splinter)**: 6 / 6 Checks PASS (`npm run audit:security`)
- **Pilot Cohort Readiness**: 14 / 14 Checks PASS (`npm run verify:pilot`)
- **Production Pre-flight**: 22 / 22 Checks PASS (`npm run verify:deploy`)
- **Static & Dynamic Routes**: 58 / 58 Routes building with Turbopack (`npm run build`)
- **i18n Symmetry**: 100% key parity between `en.json` and `es.json` across 18+ namespaces

---

## 2. Cross-Agent Consensus & Quality Findings

1. **UX & Shell Error Handling (Agent 3 Finding)**:
   - Root dynamic error boundaries (`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`) should be explicitly defined to avoid generic Next.js fallback screens when records are not found or exceptions occur.
   - Shell links in navigation should explicitly include `aria-current="page"` when active to maximize screen reader accessibility.

2. **Schema & API Stability (Agents 1 & 2 Finding)**:
   - Zero database migration drift, zero unindexed foreign keys, and 100% role-based access validation across all 31 route handlers.

---

## 3. Evaluation of Agent 5 (Wildcard) Innovation Proposals

The Council reviewed the three lateral proposals submitted by Agent 5 (The Wildcard):

| Proposal | Value / Impact | Technical Feasibility | Council Recommendation |
| :--- | :---: | :---: | :--- |
| **Proposal 1: ATS/ABHE Accreditation Self-Study Faculty Credentials Matrix (ADR 0019)** | Very High (Solves 60–100 hours of decennial self-study audit reporting for academic deans & ALOs) | High (Hooks cleanly into existing saved scholars, credentials, and publications tables with zero migrations) | **APPROVED FOR IMMEDIATE IMPLEMENTATION (PHASE 16)** |
| **Proposal 2: Seminary Rapid Adjunct Dispatch & Emergency Course Coverage ("Podium S.O.S.") (ADR 0020)** | High (Resolves sudden 30-day course cancellations) | Medium (Requires broadcast notification queue) | Backlog for Phase 17 |
| **Proposal 3: Annual Theological Guild & Conference Interview Docket (ADR 0021)** | Moderate (Streamlines ETS/SBL annual hiring meetings) | Medium (Requires conference calendar metadata) | Backlog for Phase 18 |

---

## 4. Approved Software Factory Execution Plan: Proposal 1 (ADR 0019)

### Feature Scope: ATS/ABHE Accreditation Self-Study Faculty Credentials Matrix
1. **Architecture Decision Record**:
   - Draft and finalize `docs/adr/0019-ats-abhe-accreditation-self-study-faculty-credentials-matrix.md`.
2. **Accreditation Calculation Engine**:
   - Implement `lib/accreditation/ats-matrix-generator.ts` to transform institutional saved faculty rosters into ATS Standard 3 & ABHE Standard 11 compliant tables:
     - Identification of terminal degree status (Ph.D., Th.D., D.Min., etc.) and degree-granting institutions.
     - Terminal degree qualification ratio calculation across the roster.
     - Teaching field alignment, publication counts, and confessional affirmation records.
     - CSV export formatter for institutional accreditation packets.
3. **UI Components & Routes**:
   - Build `<ATSComplianceMatrixTable />` in `components/institution/ats-compliance-matrix-table.tsx` with print-ready styling, compliance summary KPI cards, and CSV download trigger.
   - Mount `/institution/saved/accreditation/page.tsx` within the institutional portal shell.
   - Add access link in `components/institution/institution-nav.tsx` and on `/institution/saved/page.tsx`.
4. **UX & Shell Elevation**:
   - Create branded `app/not-found.tsx` and `app/error.tsx` resolving Agent 3's finding.
5. **Bilingual Localization (i18n)**:
   - Add symmetric English and Spanish translation keys in `lib/i18n/messages/en.json` and `lib/i18n/messages/es.json` under `accreditation` namespace.
6. **Testing & Quality Verification**:
   - Author comprehensive unit tests in `tests/unit/ats-matrix-generator.test.ts`.
   - Re-verify full test suite (`npm run test`), lint (`npm run lint`), typecheck (`npm run typecheck`), RLS audit (`npm run audit:rls`), and build (`npm run build`).

---

## 5. Council Sign-Off & Verification

- **Agent 1 (Data & API):** ✅ SIGN-OFF
- **Agent 2 (Routes & Pages):** ✅ SIGN-OFF
- **Agent 3 (UX & Shell):** ✅ SIGN-OFF (with error boundary item included in Phase 16)
- **Agent 4 (Feature & Competitive):** ✅ SIGN-OFF
- **Agent 5 (The Wildcard):** ✅ INNOVATION BRIEF DELIVERED & APPROVED
- **Agent 6 (Documenter):** ✅ SYNTHESIS RECORDED
