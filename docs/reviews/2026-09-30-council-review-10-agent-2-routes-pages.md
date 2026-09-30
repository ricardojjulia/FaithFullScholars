# Council Agent 2: Route & Page Audit Report (Council Review #10)

**Date:** 2026-09-30  
**Auditor:** Council Agent 2 (Routes & Pages)  
**Status:** Complete (READ-ONLY)  
**Target Repository:** `/Users/rjulia/programs/FaithFullScholars`

---

### 1. Shell & Navigation Inventory
- **Public Shell (`public-nav.tsx`, `public-footer.tsx`, `user-menu.tsx`):**
  - Header: `/`, `/scholars`, `/courses`, `/opportunities`, `/speakers`, `/scholars?available=true`.
  - Me/Account Dropdown: `/login`, `/signup`, `/dashboard`, `/dashboard/contracts`, `/dashboard/media`, `/dashboard/licensing`, `/institution`, `/institution/contracts`, `/institution/licensing`, `/institution/subscription`, `/institution/consortium`, `/admin/reviews`, `/dev/status`.
  - Footer: Hubs (`/disciplines`, `/traditions`), confessional filters (`?confession=westminster-confession`, `?confession=1689-london-baptist`).
- **Scholar Dashboard Shell (`app/dashboard/layout.tsx`):**
  - Sub-nav: `/dashboard`, `/dashboard/profile`, `/dashboard/courses`, `/dashboard/availability`, `/dashboard/inquiries`, `/dashboard/contracts`, `/dashboard/analytics`, `/dashboard/preview`.
  - *Omission:* `/dashboard/media` and `/dashboard/licensing` are absent from the dashboard sub-header nav (only discoverable via UserMenu/Footer).
- **Institution Shell (`components/institution/institution-nav.tsx`):**
  - Sub-nav: `/institution`, `/institution/inquiries`, `/institution/postings`, `/institution/endorsements`, `/institution/saved`, `/institution/contracts`, `/institution/subscription`, `/institution/consortium`, `/institution/profile`.
  - Sub-views: `/institution/saved/accreditation`, `/institution/saved/dossier`, `/institution/postings/new`.
  - *Omission:* `/institution/licensing` is omitted from the institution sub-nav bar.
- **Admin Shell (`components/admin/admin-nav.tsx`):**
  - Sub-nav: `/admin/reviews`, `/admin/institutions`, `/admin/reports`, `/admin/triage`.
- **Dev Shell (`components/dev/dev-toolbar.tsx`):** `/dev/status`.

---

### 2. Page Existence Check & Status Audit
All 21 audited destinations have corresponding `page.tsx` files. None are missing, but 3 are stubs:

| Route | Shell | Page Status | Notes |
| :--- | :--- | :--- | :--- |
| `/` | Public | **EXISTS** | Full marketing landing page with live search form and discipline filters. |
| `/scholars` | Public | **EXISTS** | Directory view with faceted taxonomies, confessional filters, and recommendations. |
| `/scholars/[slug]` | Public | **EXISTS** | Canonical academic profile with doctrinal, endorsement, and speaker topic cards. |
| `/courses` | Public | **EXISTS** | Searchable syllabus catalog with level/discipline filters. |
| `/speakers` | Public | **EXISTS** | Speaker bureau with target audience filters and Schema.org JSON-LD. |
| `/opportunities` | Public | **EXISTS** | Academic marketplace for adjunct and modular calls. |
| `/dashboard/profile` | Scholar | **STUB** | UI exists, but draft saving and review submission persist solely to client `sessionStorage`. |
| `/dashboard/onboarding` | Scholar | **STUB** | CV parser extracts client-side text but saves only to `sessionStorage` (no DB persistence). |
| `/dashboard/courses` | Scholar | **STUB** | Course manager runs on local React `useState` dummy data; lacks DB persistence. |
| `/dashboard/availability` | Scholar | **EXISTS** | Hybrid: Speaker topics persist via API/DB; availability preferences cache in `sessionStorage`. |
| `/dashboard/media` | Scholar | **EXISTS** | Full CRUD wired to `/api/scholars/media` and PostgreSQL. |
| `/dashboard/contracts` | Scholar | **EXISTS** | Displays active contracts from DB, but links out to `/institution/contracts/[id]`. |
| `/dashboard/licensing` | Scholar | **EXISTS** | Displays active royalties; countersign form posts to `/api/dashboard/licensing/[id]/sign`. |
| `/institution/saved` | Institution | **EXISTS** | Shortlist and bookmark manager with export links and inquiry trigger. |
| `/institution/saved/accreditation` | Institution | **EXISTS** | Dynamic ATS/ABHE Standards 3 & 11 compliance roster from DB. |
| `/institution/saved/dossier` | Institution | **EXISTS** | Print-optimized committee docket powered by JSON export API. |
| `/institution/contracts` | Institution | **EXISTS** | Institutional contract list with status badges and milestone drilldown. |
| `/institution/licensing` | Institution | **EXISTS** | Curriculum licensing manager with accreditation badges. |
| `/institution/consortium` | Institution | **EXISTS** | Consortium network and multi-campus management view. |
| `/admin/reviews` | Admin | **EXISTS** | Moderation queue with status tabs and reviewer routing. |
| `/dev/status` | Dev | **EXISTS** | Diagnostic health screen checking live Supabase connectivity and ports. |

---

### 3. API & Server Action Completeness
- **Profile Save / Submit**: Client-only in `app/dashboard/profile/page.tsx` (`sessionStorage`). No Server Action or API endpoint exists.
- **CV Upload**: Client-only `FileReader` regex parser in `components/forms/cv-upload-parser.tsx`. No backend upload route or Supabase Storage bucket integration.
- **Inquiry Submit**: `POST /api/inquiries` is fully implemented and wired to `StructuredInquiryModal`.
- **Review Decision**: `POST /api/admin/reviews/[id]` is fully implemented and wired to `ReviewActionPanel`.
- **Licensing Sign & Create**: `POST /api/institution/licensing` and `POST /api/dashboard/licensing/[id]/sign` are fully implemented.
- **Orphaned Handlers**:
  1. `POST /api/institution/contracts`: Endpoint exists, but no UI form in the institution portal calls it to draft a contract.
  2. `POST /api/dashboard/contracts/[id]/accept`: Endpoint exists, but no UI button in `/dashboard/contracts` calls it.
  3. `PATCH /api/institution/contracts/[id]`: Endpoint exists, but is unreferenced by the UI.
  4. `GET /api/dashboard/contracts` & `GET /api/dashboard/licensing`: Endpoints exist, but pages query database services directly via React Server Components.

---

### 4. Link Consistency & Shell Anomalies
1. **Cross-Shell Leak**: In `app/dashboard/contracts/page.tsx`, the "Inspect Agreement" button links scholars directly to `/institution/contracts/${contract.id}` rather than a dedicated scholar contract view.
2. **Missing Subnav Entries**: `/dashboard/media` and `/dashboard/licensing` are missing from `app/dashboard/layout.tsx`. `/institution/licensing` is missing from `components/institution/institution-nav.tsx`.
3. **Raw Form Navigation**: `app/dashboard/licensing/page.tsx` uses `<form action="/api/dashboard/licensing/[id]/sign" method="POST">`, causing native navigation to raw JSON on countersign.
4. **Link Integrity**: All hardcoded links across navigation shells point to implemented pages; zero broken internal links were detected.
