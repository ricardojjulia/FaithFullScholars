# Council Review 3 — Agent 3: UX & Shell Audit

**Review Date:** 2026-09-21  
**Agent:** Council Agent 3 (UX & Shell Quality Audit)  
**Status:** Complete (Read-Only)  
**Repo Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Accessibility Correctness & Standards

- **Modal Dialog Accessibility**:
  - `EndorseColleagueModal` has been upgraded with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="endorse-modal-title"`, Escape key listener, and backdrop click dismiss.
  - `AiFacultyMatcherModal` and `InquiryModal` maintain correct focus trap targets, labelled inputs, and clear dismiss buttons.
- **Form Controls & Labels**:
  - All form controls in `/institution/postings/new`, `/dashboard/profile`, and `/dashboard/onboarding` have explicit `<label>` tags with matching `htmlFor` attributes or nested inputs.
  - Checkboxes in filter sidebars have accessible text associations.
- **Keyboard Navigation**:
  - Universal search bar responds to `/` keyboard shortcut from anywhere on the page without interfering with input elements.
  - Interactive badges and buttons support keyboard Tab navigation and Enter/Space actuation.

---

## 2. Visual Polish, Design System & Typography

- **Modern Clean Sans Standard**:
  - Replaced legacy serif fonts across application dashboards, review consoles, and tables with **Aptos** and **Aptos Display** with `Plus_Jakarta_Sans` variable fallback.
  - Historical confessions and formal doctrinal statements preserve dignified book serif (`Charter`, `Iowan Old Style`, `Palatino Linotype`) via `.font-literary`.
- **Vector Iconography**:
  - Complete elimination of emoji glyphs across all 43+ UI files in favor of uniform 1.75–2px stroke vector SVGs from `lucide-react`.
- **Component Elevation & Contrast**:
  - Implemented `.card-crisp` styling with subtle borders (`border-slate-200/80 dark:border-slate-800`), micro-shadows, and modern border radiuses (`rounded-xl` / `rounded-2xl`).
- **Dark Mode Fidelity**:
  - All shells, cards, modals, and tables support native dark mode with `dark:bg-slate-900` and `dark:text-slate-100`, maintaining WCAG AAA contrast ratios on academic body text.

---

## 3. Error Handling & Edge Runtimes

- Global error boundaries (`app/error.tsx`, `app/global-error.tsx`) capture unexpected runtime errors without leaking PostgreSQL connection strings or database internals to users.
- Not-found boundaries (`app/not-found.tsx`, `app/scholars/[slug]/not-found.tsx`) provide helpful navigational breadcrumbs and search suggestions.
- API error responses return sanitized messages with correlation error IDs for platform triage.

---

## 4. Top 3 UX Pain Points

1. **Conference Speaker Discovery Friction**: Academic conference directors seeking keynote lecturers must navigate to `/scholars`, expand the Availability filter accordion, and select "Guest Lecture" or "Conference Speaking". A dedicated "Find Speakers" hero tab or landing page would drastically reduce time-to-value for event committees.
2. **Postings Quick Apply Feedback**: After a scholar clicks "Express Interest" on an opportunity in `/opportunities/[slug]`, the modal confirms submission, but the opportunity card itself does not display an "Applied" badge when revisiting the directory.
3. **Mobile Filter Drawer Performance**: On mobile viewports (< 768px), filter facets in `/scholars` and `/courses` require scrolling past the directory header; a sticky "Filter & Refine" slide-over drawer would enhance mobile touch ergonomics.
