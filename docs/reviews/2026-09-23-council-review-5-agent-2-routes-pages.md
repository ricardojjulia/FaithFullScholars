# Council Review 5 — Agent 2: Routes & Pages Audit

**Date**: 2026-09-23  
**Auditor**: Council Agent 2 (Routes & Pages Auditor)  
**Scope**: App router pages, navigation consistency, route coverage, and candidate feature routes.

---

### 1. Shell & Navigation Inventory
- **Public Navigation**: `/scholars`, `/courses`, `/speakers`, `/opportunities`, `/disciplines`, `/traditions`.
- **Scholar Workspace**: `/dashboard`, `/dashboard/profile`, `/dashboard/courses`, `/dashboard/endorsements`, `/dashboard/speaking`, `/dashboard/contracts`.
- **Institution Portal**: `/institution`, `/institution/inquiries`, `/institution/postings`, `/institution/endorsements`, `/institution/saved`, `/institution/contracts`, `/institution/subscription`, `/institution/consortium`, `/institution/profile`.
- **Admin Shell**: `/admin/reviews`.
- **System Health**: `/dev/status`.

### 2. Candidate Feature Routes Implemented
- Page: `/institution/consortium` (`app/(institution)/institution/consortium/page.tsx`).
- API Routes:
  - `GET /api/institution/consortium`
  - `POST /api/institution/consortium`
  - `POST /api/institution/consortium/members`
  - `DELETE /api/institution/consortium/members`
- Nav Integration:
  - Added "Consortium" tab to `InstitutionNav`.
  - Added "Seminary Consortium" menu item to `UserMenu`.
  - Added "Seminary Consortia & Systems" link to `PublicFooter`.

### 3. Route Verification & Parity
- 100% of defined routes resolve to valid server/client pages with zero broken internal links.
- E2E journey test added in `tests/e2e/subscriptions-and-contracts.spec.ts` asserting consortium workspace rendering and header verification.
