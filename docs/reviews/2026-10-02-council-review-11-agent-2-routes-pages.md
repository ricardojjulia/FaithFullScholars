# Council Review #11 — Agent 2: Route & Page Audit

**Auditor:** Council Agent 2 (Routes & Pages)  
**Date:** 2026-10-02  
**Status:** Complete (READ-ONLY)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Shell & Navigation Inventory
- **Public Shell** (`components/shell/public-nav.tsx`, `public-footer.tsx`, `user-menu.tsx`):
  - **Header Nav**: `/`, `/scholars`, `/courses`, `/opportunities`, `/speakers`, `/scholars?available=true`.
  - **UserMenu ("Me")**: `/login`, `/signup`, `/scholars`, `/courses`, `/speakers`, `/opportunities`, `/dashboard`, `/dashboard/contracts`, `/dashboard/media`, `/dashboard/licensing`, `/institution`, `/institution/contracts`, `/institution/licensing`, `/institution/subscription`, `/institution/consortium`, `/admin/reviews`, `/dev/status`.
  - **Footer Hubs**: `/disciplines`, `/traditions`, `/dev/status`, `/admin/reviews`, plus confessional filters.
- **Scholar Dashboard Shell** (`components/scholar/scholar-dashboard-nav.tsx`):
  - **Sub-Nav (10 links)**: `/dashboard`, `/dashboard/profile`, `/dashboard/courses`, `/dashboard/availability`, `/dashboard/media`, `/dashboard/licensing`, `/dashboard/inquiries`, `/dashboard/contracts`, `/dashboard/analytics`, `/dashboard/preview`.
  - **Onboarding Wizard**: `/dashboard/onboarding`.
- **Institution Shell** (`components/institution/institution-nav.tsx`):
  - **Sub-Nav (10 links)**: `/institution`, `/institution/inquiries`, `/institution/postings`, `/institution/endorsements`, `/institution/saved`, `/institution/contracts`, `/institution/licensing`, `/institution/subscription`, `/institution/consortium`, `/institution/profile`.
  - **Sub-Views**: `/institution/postings/new`, `/institution/postings/[id]/applicants`, `/institution/saved/accreditation`, `/institution/saved/dossier`, `/institution/contracts/[id]`.
- **Admin Shell** (`components/admin/admin-nav.tsx`):
  - **Sub-Nav (4 links)**: `/admin/reviews`, `/admin/institutions`, `/admin/reports`, `/admin/triage`. Outbound: `/dashboard`, `/scholars`.
- **Dev Shell** (`components/dev/dev-toolbar.tsx`): `/dev/status`.

---

## 2. Page Existence Check
All 24 primary audited destinations have active `page.tsx` files. There are 0 missing page files, but 4 stub routes remain:
- **Named Stubs**:
  1. `/dashboard/profile` (STUB): Saves draft revisions solely to client `sessionStorage` (`fs_draft_revision`); no DB persistence.
  2. `/dashboard/onboarding` (STUB): Client-side regex CV parsing; persists exclusively to `sessionStorage`.
  3. `/dashboard/courses` (STUB): Operates on in-memory React `useState` mock items (`INITIAL_COURSES`); no DB persistence.
  4. `/institution/profile` (STUB): Renders hardcoded `DEFAULT_PROFILE` and simulates saving with a 600ms `setTimeout`.

---

## 3. API & Server Action Completeness
- **Profile Save / Submit**: Client-only in `app/dashboard/profile/page.tsx`.
- **CV Upload**: Client-only `FileReader` parser in `cv-upload-parser.tsx`.
- **Inquiry Submit**: `POST /api/inquiries` is fully implemented and wired to `StructuredInquiryModal`.
- **Review Decision**: `POST /api/admin/reviews/[id]` is fully implemented and wired to `ReviewActionPanel`.
- **Applicant Status Update**: `PATCH /api/inquiries/[id]` is fully implemented and wired to `PostingApplicantMatrix`.
- **Licensing Signing**: `POST /api/dashboard/licensing/[id]/sign` and `POST /api/institution/licensing` are fully implemented.
- **Orphaned Handlers & Unlinked Actions**:
  1. `POST /api/institution/contracts`: Endpoint exists, but no UI form in `/institution/contracts` calls it.
  2. `CourseLicensingModal`: Component is fully implemented in `components/licensing/course-licensing-modal.tsx`, but unlinked—never mounted on `/courses/[slug]`.

---

## 4. Link Consistency & Shell Anomalies
1. **Cross-Shell Leak**: In `/dashboard/contracts`, "Inspect Agreement" directs scholars to `/institution/contracts/${id}`. Its back button returns to `/institution/contracts`, dropping scholars into the institution shell.
2. **Native Form Navigation**: `/dashboard/licensing` uses native `<form action="/api/dashboard/licensing/[id]/sign" method="POST">`, navigating the browser directly to raw JSON output upon countersigning.
3. **Link Integrity**: Zero broken links; all hardcoded navigation links resolve to existing routes.

---

## 5. Summary Table

| Route | Shell | Page Status | Notes |
| :--- | :--- | :--- | :--- |
| `/` | Public | **EXISTS** | Landing page with universal search. |
| `/scholars` | Public | **EXISTS** | Directory with taxonomies and filters. |
| `/courses` | Public | **EXISTS** | Syllabi catalog; lacks modal licensing trigger. |
| `/opportunities` | Public | **EXISTS** | Marketplace with applicant modal integration. |
| `/speakers` | Public | **EXISTS** | Bureau with JSON-LD schema metadata. |
| `/dashboard` | Scholar | **EXISTS** | Workspace overview with metric cards. |
| `/dashboard/profile` | Scholar | **STUB** | Drafts persist to `sessionStorage` only. |
| `/dashboard/onboarding` | Scholar | **STUB** | CV parsing persists to `sessionStorage` only. |
| `/dashboard/courses` | Scholar | **STUB** | In-memory `useState` mock courses only. |
| `/dashboard/availability` | Scholar | **EXISTS** | Speaker topics persist to DB; dates in storage. |
| `/dashboard/contracts` | Scholar | **EXISTS** | DB query; links out to institution shell. |
| `/dashboard/licensing` | Scholar | **EXISTS** | Active royalties; raw POST form on countersign. |
| `/institution` | Institution | **EXISTS** | Institution overview and verification status. |
| `/institution/saved` | Institution | **EXISTS** | Shortlist manager with CSV export. |
| `/institution/contracts` | Institution | **EXISTS** | Lists contracts; lacks drafting form. |
| `/institution/contracts/[id]` | Institution | **EXISTS** | Milestone inspector. |
| `/institution/licensing` | Institution | **EXISTS** | Active curriculum licenses and ATS badges. |
| `/institution/profile` | Institution | **STUB** | Mock `useState` profile; mock save timer. |
| `/admin/reviews` | Admin | **EXISTS** | Trust & moderation queue with status tabs. |
| `/dev/status` | Dev | **EXISTS** | System diagnostics checking Supabase connectivity. |
