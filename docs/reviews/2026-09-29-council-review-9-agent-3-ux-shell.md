# Council Review #9 — Agent 3: UX & Shell Quality Audit

**Date:** September 29, 2026  
**Auditor:** Council Agent 3 (UX & Shell Quality Auditor)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`  
**Status:** Conditional Sign-Off — High Visual Dignity & Print Fidelity; Shell & Error Boundary Refinements Queued  

---

### 1. Accessibility Correctness (ARIA & Forms)
- **Interactive Shell Controls**: `<LanguageSwitcher />`, `<UserMenu />`, and `<FeedbackButton />` correctly manage dynamic states via `aria-expanded` and `aria-haspopup`. Modals (`StructuredInquiryModal`, `AIFacultyMatcherModal`, `EndorseColleagueModal`) declare `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
- **Identified Deficits**:
  - *Missing `aria-current="page"`*: Public navigation (`<PublicNav />`), institutional sub-nav (`<InstitutionNav />`), admin tabs (`<AdminNav />`), and scholar dashboard (`DashboardLayout`) omit `aria-current` on active routes.
  - *Tab Semantics & `aria-selected`*: Tab switches in `ScholarInquiryInbox`, `CvUploadParser`, and `TriageWorkspace` use plain `<button>` elements lacking `role="tablist"`, `role="tab"`, and `aria-selected`.
  - *Form & Search Labels*: The `UniversalSearchBar` input and clear button lack explicit `aria-label` or `<label>` bindings. Modal form controls in `StructuredInquiryModal` and `BoardDocketSummary` lack programmatic `htmlFor`/`id` pairings.

---

### 2. Loading, Empty States & Responsive Design
- **Empty States**: Well-implemented across public discovery. `ScholarDirectory` renders an empty search card with clear filter actions, `CoursesPage` displays a themed `BookX` state, and `SpeakersPage` presents a dedicated reset prompt.
- **Loading Boundaries**: Absence of `loading.tsx` route boundaries across routes; data fetching relies on client spinners or streaming suspense without skeleton fallbacks.
- **Responsive Architecture**: The LinkedIn-style 3-column grid (`col-span-3` / `col-span-6` / `col-span-3`) collapses cleanly on tablet and mobile viewports. Sticky rails and table wrappers (`overflow-x-auto` in `BoardDocketSummary`) prevent layout clipping on small screens.

---

### 3. Styling & Design System Completeness
- **Tailwind Tokens**: Clean Tailwind v4 `@theme inline` configuration in `globals.css` with Aptos/Aptos Display (`--font-sans`), Iowan Old Style/Charter (`--font-serif`), and micro-elevation classes (`.card-crisp`).
- **Academic Layout (ADR 0007)**: High-ratio cover banner, overlapping 120px avatar, verified badges, and quick-action bar (Inquiry, Dossier, Shortlist, Share) maintain executive academic polish.
- **Citations & Print CSS**: Dossier view (`/scholars/[slug]/dossier`) renders SBL Handbook of Style (2nd ed.) / Chicago (17th ed.) citations in classic serif typography. Print stylesheets (`@media print`, `print:hidden`, `print:border-black`) flawlessly suppress navigation bars and replace interactive select widgets with static rating badges for physical board dockets.

---

### 4. Bilingual UX & Internationalization (i18n)
- **Client Switching**: `I18nProvider` with `useSyncExternalStore` provides tear-free runtime switching between English and Spanish, persisting across `localStorage` and `fs_locale` cookies.
- **Key Parity**: 28 namespaces (including `doctoral`, `confessional_lens`, `board_docket`) maintain 100% symmetric key mapping.
- **Server Component Opportunity**: Server-rendered routes (`/courses`, `/speakers`, `/scholars/[slug]/dossier`) can be enriched by reading `fs_locale` cookie for initial server-side hydration.

---

### 5. Error Handling & Route Boundaries
- **Missing Boundaries**: The repository currently lacks root `app/not-found.tsx`, `app/error.tsx`, and `app/global-error.tsx`.
- **User Impact**: 10 dynamic routes calling `notFound()` (e.g., `/scholars/[slug]`, `/scholars/[slug]/dossier`, `/courses/[slug]`) fall back to unstyled Next.js default error pages, abandoning platform branding, dark mode, and recovery links.

---

### 6. Key UX Refinements & Agent 3 Sign-Off
1. **Implement Root Error Boundaries**: Add branded `not-found.tsx`, `error.tsx`, and `global-error.tsx`.
2. **Elevate Accessible Navigation**: Inject `aria-current="page"` into shell links and associate form labels with inputs.
3. **Server i18n Hydration**: Read `fs_locale` cookie in Server Components to ensure localized headers and empty states.

**Agent 3 Sign-Off:** ✅ **APPROVED (CONDITIONAL)** — Visual presentation, typography hierarchy, and candidate dossiers are distinguished and production ready. Action items are queued for Council synthesis.
