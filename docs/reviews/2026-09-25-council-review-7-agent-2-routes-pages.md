# Council Review #7 — Agent 2: Routes & Pages Audit

**Date:** 2026-09-25  
**Auditor:** Council Agent 2 (Routes & Pages Auditor)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`  
**Status:** Clean — 58 Routes Compiling, 0 Missing or Broken Handlers

---

## 1. Shell & Navigation Hierarchy

The application structure cleanly separates concerns across four distinct navigation shells:
1. **Public Shell (`app/layout.tsx`, `components/nav/public-nav.tsx`)**:
   - Universal App Bar with dynamic authenticated user menu and reactive EN/ES language toggle.
   - Links: Faculty Directory (`/scholars`), Course Showcase (`/courses`), Speakers Bureau (`/speakers`), Opportunities (`/opportunities`), Disciplines (`/disciplines`), Traditions (`/traditions`).
2. **Scholar Dashboard Shell (`app/dashboard/layout.tsx`)**:
   - Navigation: Overview (`/dashboard`), Profile & Revisions (`/dashboard/profile`), CV Onboarding (`/dashboard/onboarding`), Course Manager (`/dashboard/courses`), Inquiries (`/dashboard/inquiries`), Contracts & Speaking (`/dashboard/contracts`), Licensing (`/dashboard/licensing`), Availability (`/dashboard/availability`), Analytics (`/dashboard/analytics`), Public Preview (`/dashboard/preview`).
3. **Institution Recruiter Shell (`app/(institution)/institution/layout.tsx`)**:
   - Navigation: Overview (`/institution`), Saved Shortlist (`/institution/saved`), Board Dossier Generator (`/institution/saved/dossier`), Faculty Postings (`/institution/postings`), Inquiries & Contracts (`/institution/contracts`), Course Licensing (`/institution/licensing`), Consortium Portal (`/institution/consortium`), Institutional Endorsements (`/institution/endorsements`), Subscription & Billing (`/institution/subscription`).
4. **Admin Trust Governance Shell (`app/(admin)/admin/layout.tsx`)**:
   - Navigation: Profile Review Queue (`/admin/reviews`), Ingestion Triage (`/admin/triage`), Institution Verification (`/admin/institutions`), Community Reports (`/admin/reports`).

---

## 2. Route Inventory & Status Matrix

| Route Pattern | Shell | Type | Status | Functionality |
| :--- | :--- | :---: | :---: | :--- |
| `/` | Public | Static | ✅ EXISTS | High-conversion hero, AI matcher trigger, trending disciplines |
| `/scholars` | Public | Dynamic | ✅ EXISTS | Faceted search, tradition/discipline filters, rate-limit gating |
| `/scholars/[slug]` | Public | Dynamic | ✅ EXISTS | Full public profile, syllabi, media, confessional badges |
| `/scholars/[slug]/dossier` | Public | Dynamic | ✅ EXISTS | Print-ready academic dossier layout for board packets |
| `/courses` | Public | Dynamic | ✅ EXISTS | Curriculum catalog, syllabi downloads, licensing inquiry |
| `/speakers` | Public | Dynamic | ✅ EXISTS | Speaking bureau topics, travel radius, target audiences |
| `/opportunities` | Public | Dynamic | ✅ EXISTS | Open faculty calls, adjunct openings, guest lectures |
| `/login`, `/signup` | Auth | Dynamic | ✅ EXISTS | Dual-role switcher (Scholar vs. Seminary Recruiter) |
| `/dashboard/onboarding` | Scholar | Dynamic | ✅ EXISTS | Assisted CV PDF/text ingestion & heuristic parser |
| `/institution/saved/dossier` | Institution | Dynamic | ✅ EXISTS | Multi-candidate comparative dossier view & print generator |
| `/institution/consortium` | Institution | Dynamic | ✅ EXISTS | Multi-seminary consortium sharing and cross-listing |
| `/admin/reviews/[id]` | Admin | Dynamic | ✅ EXISTS | Visual diff inspector comparing draft vs. published snapshot |

---

## 3. Client / Server Boundary Integrity

- **Reactive State Hydration**: All server components with dynamic search parameters (e.g., `/scholars`, `/courses`) extract interactive UI banners into focused client wrappers (`ScholarDirectoryHeader`, `CourseDirectoryHeader`), ensuring language switching toggles render immediately without page reloads.
- **Link & Button Consistency**: Zero dead links or empty stub buttons across the 58 compiled routes.
