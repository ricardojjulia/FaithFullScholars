# Council Review 4 — Agent 2: Route & Page Audit

> **Date:** September 22, 2026  
> **Auditor:** Council Agent 2 (Route & Navigation Specialist)  
> **Status:** READ-ONLY AUDIT COMPLETE  
> **Target Scope:** Item 1 (Live Pilot Launch Readiness) & Item 2 (Tiered Subscriptions & Booking Contracts Workflow)

---

## 1. Shell & Navigation Inventory

Current shells operating in `app/`:
- **Public Shell:** Persistent universal app bar with search typeahead, scope selectors, `/scholars`, `/courses`, `/opportunities`, `/speakers`, `/disciplines`, `/traditions`.
- **Scholar Workspace:** Sub-navigation bar across `/dashboard`, `/dashboard/profile`, `/dashboard/courses`, `/dashboard/availability`, `/dashboard/inquiries`, `/dashboard/analytics`, `/dashboard/preview`.
- **Institution Portal:** Sub-navigation bar across `/institution`, `/institution/postings`, `/institution/endorsements`, `/institution/inquiries`, `/institution/saved`, `/institution/profile`.
- **Admin Console:** Sub-navigation bar across `/admin/reviews`, `/admin/institutions`, `/admin/reports`, `/admin/triage`.

---

## 2. Route Existence & Status Check for New Capabilities

| Route | Shell | Page Status | Purpose / Actions |
| :--- | :--- | :--- | :--- |
| `/institution/subscription` | Institution | **NEW** | Subscription tier dashboard, quota usage, upgrade modal |
| `/institution/contracts` | Institution | **NEW** | Dean contract manager (draft, send offer, track milestones) |
| `/institution/contracts/[id]` | Institution / Shared | **NEW** | Contract detail view with milestone sign-off and terms |
| `/dashboard/contracts` | Scholar | **NEW** | Scholar engagement inbox (review terms, sign agreements) |

---

## 3. Link & Navigation Consistency

- Add `Contracts` and `Subscription` navigation tabs to `InstitutionSubNav` (`components/institution/institution-sub-nav.tsx`).
- Add `Contracts` navigation tab to `DashboardSubNav` (`components/dashboard/dashboard-sub-nav.tsx`).
- Update inquiry response modals to offer 1-click "Generate Engagement Contract" when an inquiry is marked accepted.
