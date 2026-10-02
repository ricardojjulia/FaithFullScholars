# Council Review #11 — Agent 3: UX & Shell Quality Audit

**Auditor:** Council Agent 3 (UX & Shell Quality Auditor)  
**Date:** 2026-10-02  
**Status:** Complete (READ-ONLY)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Accessibility (ARIA) Correctness
- **Missing Modal Dialog Semantics:** Modals in `components/opportunities/express-interest-modal.tsx`, `components/institution/issue-endorsement-modal.tsx`, and `components/licensing/course-licensing-modal.tsx` lack `role="dialog"`, `aria-modal={true}`, and `aria-labelledby`.
- **String vs. Boolean Attributes:** String literals `aria-modal="true"` are passed instead of JSX booleans (`aria-modal={true}`) in `components/inquiries/structured-inquiry-modal.tsx`, `components/search/ai-faculty-matcher-modal.tsx`, and `components/institution/posting-applicant-matrix.tsx`.
- **Missing Input Labels:** In `components/forms/scholar-profile-form.tsx`, `<label>` elements omit `htmlFor` and inputs omit `id`. In `components/forms/doctrinal-statement-form.tsx` and `components/forms/confessional-standards-selector.tsx`, `<textarea>`, adherence `<select>`, and exception `<input>` elements lack any `aria-label` or `<label>`.
- **Table Accessibility:** `components/institution/posting-applicant-matrix.tsx` lacks `aria-label`/`<caption>`, and column headers lack `scope="col"`.

---

## 2. Loading and Empty States
- **Zero `loading.tsx` & Zero Skeletons:** Not a single `loading.tsx` exists in the entire `app/` tree. Heavy server-rendered routes (`app/scholars/page.tsx`, `app/courses/page.tsx`, `app/(admin)/admin/reviews/page.tsx`, and `app/(institution)/institution/saved/accreditation/page.tsx`) block synchronously without streaming skeletons or loading indicators.
- **Empty States:** Gracefully handled for empty searches in `app/scholars/page.tsx`, `app/courses/page.tsx`, and `components/institution/ats-compliance-matrix-table.tsx`.
- **Pending Profile States:** `app/scholars/[slug]/page.tsx` triggers `notFound()` if a profile is unapproved, providing no explanatory pending status for scholars or authorized evaluators.

---

## 3. Styling Completeness & Typography
- **Print Leaks:** Shell headers (`components/shell/public-nav.tsx`, `components/admin/admin-nav.tsx`, `components/institution/institution-nav.tsx`, and `components/shell/public-footer.tsx`) completely omit `print:hidden`. Printing dossiers or ATS matrices includes full web navigation bars.
- **Academic Citation Typography:** Font definitions in `app/globals.css` lack specialized unicode font fallbacks for polytonic Greek and pointed Hebrew exegesis citations commonly used in theological profiles.

---

## 4. Nav Active-State Consistency
- **Public Shell:** `components/shell/public-nav.tsx` has NO active route checking (`usePathname` omitted), NO visual active indication, and NO `aria-current="page"`.
- **Scholar & Institution Shells:** `components/scholar/scholar-dashboard-nav.tsx` and `components/institution/institution-nav.tsx` implement consistent active state with `aria-current="page"` and `bg-indigo-900 text-white`.
- **Admin Shell:** `components/admin/admin-nav.tsx` lacks `aria-current="page"` and uses an inconsistent visual treatment.

---

## 5. Error Handling & Data Leakage
- **Error Boundaries:** `app/error.tsx`, `app/global-error.tsx`, and `app/not-found.tsx` are configured at the root, but no nested route-level `error.tsx` exists under `dashboard/`, `(institution)/`, or `(admin)/`.
- **Database Error Leakage:** Raw Postgres error messages leak directly to clients in `lib/inquiries/actions.ts` (`error: insertError?.message`) and `lib/admin/actions.ts` (`error: reqErr.message`).

---

## 6. Top 3 UX Pain Points
1. **Dossier & ATS Matrix Print Deficiencies:** Deans printing faculty dossiers or ATS Standard 3 matrices for search committee meetings face printouts contaminated with the global navigation bar and footer because shell components omit `print:hidden`.
2. **Screen Reader Inaccessibility on Profile Forms:** Visually impaired scholars configuring academic identity and confessional exceptions face unassociated `<label>` and `<input>` tags.
3. **Frozen UI Perception from Missing Loading Skeletons:** With zero `loading.tsx` routes, slow database queries cause sluggish page transitions with no perceptual feedback, while the unstyled active state in `PublicNav` leaves users disoriented about their current location.
