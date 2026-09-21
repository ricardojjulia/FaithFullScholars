# Council Review 3 — Agent 2: Route & Page Audit

**Review Date:** 2026-09-21  
**Agent:** Council Agent 2 (Route & Page Audit)  
**Status:** Complete (Read-Only)  
**Repo Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Shell & Navigation Inventory

FaithFull Scholars maintains four dedicated shell navigation frameworks:
1. **Public Shell (`components/shell/public-nav.tsx`)**:
   - Universal search bar with keyboard trigger (`/`).
   - Primary destinations: *Faculty* (`/scholars`), *Courses* (`/courses`), *Opportunities* (`/opportunities`), *Disciplines* (`/disciplines`), *Traditions* (`/traditions`).
   - User menu ("Me") routing to scholar dashboard or institution portal.
   - Internationalization switcher (`LanguageSwitcher`).
2. **Scholar Workspace Shell (`app/dashboard/layout.tsx`)**:
   - Sidebar/tab navigation: *Overview* (`/dashboard`), *Profile* (`/dashboard/profile`), *Onboarding* (`/dashboard/onboarding`), *Courses* (`/dashboard/courses`), *Inquiries* (`/dashboard/inquiries`), *Availability* (`/dashboard/availability`), *Analytics* (`/dashboard/analytics`), *Live Preview* (`/dashboard/preview`).
3. **Institution Management Shell (`components/institution/institution-nav.tsx`)**:
   - Tabs: *Inquiries* (`/institution/inquiries`), *Openings* (`/institution/postings`), *Endorsements* (`/institution/endorsements`), *Saved Candidates* (`/institution/saved`), *Institutional Profile* (`/institution/profile`).
4. **Admin Console Shell (`components/admin/admin-nav.tsx`)**:
   - Tabs: *Reviews* (`/admin/reviews`), *Institutions* (`/admin/institutions`), *Content Reports* (`/admin/reports`), *Error Triage* (`/admin/triage`), *System Diagnostics* (`/dev/status`).

---

## 2. Route Existence & Completeness Check

| Route | Shell | Status | Type | Notes |
|:---|:---|:---|:---|:---|
| `/` | Public | EXISTS | Static | High-conversion hero with search bar & category badges |
| `/scholars` | Public | EXISTS | Dynamic | 3-column discovery with facets & 3-page anonymous cap |
| `/scholars/[slug]` | Public | EXISTS | Dynamic | Comprehensive profile dossier with institutional & peer commendations |
| `/courses` | Public | EXISTS | Dynamic | Syllabi showcase with level, format, and reading list filters |
| `/courses/[slug]` | Public | EXISTS | Dynamic | Course preview dossier with lecture links & syllabus download |
| `/opportunities` | Public | EXISTS | Dynamic | Academic postings marketplace with tenure/adjunct filters |
| `/opportunities/[slug]` | Public | EXISTS | Dynamic | Opportunity view with `JobPosting` schema & express interest |
| `/disciplines` & `[slug]` | Public | EXISTS | Dynamic | SEO topic hubs with `CollectionPage` structured data |
| `/traditions` & `[slug]` | Public | EXISTS | Dynamic | Confessional tradition hubs with affinity filters |
| `/dashboard` | Scholar | EXISTS | Dynamic | Command center with review status banner & quick actions |
| `/dashboard/profile` | Scholar | EXISTS | Dynamic | Draft revision editor (biography, publications, degrees) |
| `/dashboard/onboarding` | Scholar | EXISTS | Dynamic | Assisted CV ingestion with Gemini & heuristic parsing |
| `/dashboard/courses` | Scholar | EXISTS | Dynamic | Course creator with syllabus file attachment |
| `/dashboard/availability`| Scholar | EXISTS | Dynamic | 6 availability toggles with delivery mode preferences |
| `/dashboard/inquiries` | Scholar | EXISTS | Dynamic | Two-way inquiry message thread with institutions |
| `/dashboard/analytics` | Scholar | EXISTS | Dynamic | 4 KPI cards, impressions velocity chart, attribution table |
| `/dashboard/preview` | Scholar | EXISTS | Dynamic | Side-by-side draft vs. published revision preview |
| `/institution` | Institution | EXISTS | Dynamic | Overview portal with recent candidates & postings metrics |
| `/institution/postings` | Institution | EXISTS | Dynamic | Openings table with status toggles (Draft, Published, Filled) |
| `/institution/postings/new`| Institution | EXISTS | Dynamic | Creation form with confessional criteria & compensation |
| `/institution/endorsements`| Institution | EXISTS | Dynamic | Endorsements portal with verified credential checkboxes |
| `/institution/inquiries` | Institution | EXISTS | Dynamic | Outbound inquiry manager with candidate link |
| `/institution/saved` | Institution | EXISTS | Dynamic | Candidate shortlists with tags and export buttons |
| `/institution/saved/dossier`| Institution | EXISTS | Dynamic | Board-ready printable candidate dossier (`@media print`) |
| `/institution/profile` | Institution | EXISTS | Dynamic | Institutional accreditation and contact settings |
| `/admin/reviews` & `[id]` | Admin | EXISTS | Dynamic | Side-by-side visual diff inspector and review decision panel |
| `/admin/institutions` | Admin | EXISTS | Dynamic | Seminary verification queue |
| `/admin/reports` | Admin | EXISTS | Dynamic | Reported profile content moderation |
| `/admin/triage` | Admin | EXISTS | Dynamic | Error logs, stack traces, and pilot feedback viewer |
| `/dev/status` | Dev/Admin | EXISTS | Dynamic | System health, RLS table statuses, environment variables |

---

## 3. Findings & Navigation Gaps

1. **No Dedicated Conference Speakers / Guest Lecture Surface**: The public nav currently routes to *Faculty*, *Courses*, and *Opportunities*. Event organizers looking strictly for keynote speakers or chapel preachers must browse the general directory and toggle `Available for Guest Lecture`. A dedicated `/speakers` or `/speaking-bureau` route is absent.
2. **Postings Filter by Region / Remote**: `/opportunities` allows filtering by opportunity type, discipline, and tradition, but delivery format (Residential vs. Online Synchronous) is not yet exposed as an interactive filter chip.
3. **Empty State Call-to-Actions**: When search filters return 0 scholars or 0 courses, the empty state displays a clear prompt, but does not yet offer a one-click reset for all active filters.
