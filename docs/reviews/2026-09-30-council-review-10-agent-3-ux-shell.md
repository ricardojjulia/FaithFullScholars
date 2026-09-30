# Council Agent 3: UX & Shell Quality Audit (Council Review #10)

**Date:** 2026-09-30  
**Auditor:** Council Agent 3 (UX & Shell Quality Audit)  
**Status:** Complete (READ-ONLY)  
**Target Repository:** `/Users/rjulia/programs/FaithFullScholars`

---

### 1. Accessibility Correctness
- **Missing Label Associations**: Primary forms throughout the platform lack explicit `htmlFor` and `id` bindings. Screen readers encounter detached inputs in `components/forms/scholar-profile-form.tsx:164–280` (9 unlinked fields including Name, Title, Institution, ORCID), `components/forms/doctrinal-statement-form.tsx:17–41` (textarea), `components/forms/confessional-standards-selector.tsx:166–192` (`<select>` and exception text field lack labels/`aria-label`), and `components/institution/new-posting-form.tsx:113–160`.
- **Search & Shell Controls**: `components/shell/universal-search-bar.tsx:86–95` uses placeholder text with no `<label>` or `aria-label`; the clear button (`line 98`) provides `title` but no accessible name.
- **ARIA Roles & States**:
  - Toggle buttons in `scholar-profile-form.tsx:298–312` omit `aria-pressed`.
  - Tabs in `components/forms/cv-upload-parser.tsx:96–120` lack `role="tablist"`, `role="tab"`, `aria-selected`, and `role="tabpanel"`.
  - `components/shell/user-menu.tsx:92–309` applies `role="menu"` but omits `role="menuitem"`, arrow key roving navigation, and Escape dismissal.
  - Modals (`components/inquiries/structured-inquiry-modal.tsx:180`, `components/opportunities/express-interest-modal.tsx:60`, `components/institution/issue-endorsement-modal.tsx:75`) lack focus trapping and Escape key handlers.

---

### 2. Loading & Empty States
- **Slow Load Freezing**: Not a single `loading.tsx` exists in `app/` (0 instances repo-wide). Multi-table queries (`app/scholars/page.tsx:43`, `app/courses/page.tsx:26`, `app/(institution)/institution/saved/accreditation/page.tsx:35`) cause unstyled browser hangs without skeletons.
- **Empty States**: Well-implemented with dedicated messaging and iconography for search (`app/scholars/page.tsx:98–112`), courses (`app/courses/page.tsx:94–105`), review queue (`app/(admin)/admin/reviews/page.tsx:66–77`), and shortlists.
- **Pending/Draft Profiles**: `getPublicScholarBySlug` filters strictly on `profile_status = 'approved'` (`lib/domain/queries.ts:296–300`). Non-approved or pending profiles trigger a cold `notFound()` (`app/scholars/[slug]/page.tsx:58`) rather than an informative "Pending Review" status banner.

---

### 3. Styling Completeness & Print Quality
- **Dossier Print (`/scholars/[slug]/dossier`)**: Excellent execution in `app/scholars/[slug]/dossier/page.tsx:54–165`. Correctly hides navigation (`print:hidden`), uses `print:bg-white print:text-black`, and applies `print:break-inside-avoid` across credentials and doctrinal affirmations.
- **Accreditation Print Failure (`/institution/saved/accreditation`)**: `app/(institution)/institution/layout.tsx:8–9` renders `PublicNav` and `InstitutionNav` without `print:hidden`. Both persistent navigation bars print atop formal ATS/ABHE board dossiers. Furthermore, `components/institution/ats-compliance-matrix-table.tsx:203` wraps tables in `overflow-x-auto` without print overflow overrides, truncating columns on letter paper.
- **Typography**: Legible hierarchy using `font-literary` (`Iowan Old Style / Charter`) for academic citations (`app/scholars/[slug]/page.tsx:214`) and serif dossier headers.

---

### 4. Nav Active-State Consistency
- **Public Shell (`components/shell/public-nav.tsx:40–93`)**: Omits `usePathname()` checks entirely; links lack active styling and `aria-current="page"`.
- **Scholar Dashboard (`app/dashboard/layout.tsx:22–74`)**: Server layout uses static links with no active indicators. "Draft Preview" (`lines 68–73`) is statically hardcoded with active styling (`bg-indigo-50 text-indigo-700`), misleading users across all dashboard tabs.
- **Admin Shell (`components/admin/admin-nav.tsx:57–69`)**: Highlights active links visually but misses `aria-current="page"`. The navigation bar is hidden on mobile (`hidden md:flex`) with no responsive menu fallback.
- **Institution Shell (`components/institution/institution-nav.tsx:85`)**: Correctly implements both active styling and `aria-current="page"`.

---

### 5. Error Handling & Database Leakage
- **Error Boundaries**: `app/error.tsx` and `app/not-found.tsx` exist, but `app/global-error.tsx` is missing, leaving root layout failures unhandled.
- **Database Leaks (AGENTS.md Violation)**: Raw Supabase PostgREST error messages are returned directly to client consumers instead of generic user-safe strings:
  - `lib/inquiries/actions.ts:335` (`updateInstitutionProfile`)
  - `lib/admin/actions.ts:200, 226` (`verifyInstitutionAction`, `processContentReport`)
  - `lib/contracts/contract-service.ts:177, 203` (`updateContractStatus`, `updateMilestoneStatus`)
  - `lib/licensing/licensing-service.ts:162, 194, 238`

---

### 6. Top UX Pain Points
1. **Academic Dean**: Printing the ATS Compliance Matrix contaminates formal board dossiers with unsuppressed website navigation and clipped columns.
2. **Scholar**: Visiting their public URL while under editorial review produces an alarming 404 page rather than a review status screen, exacerbated by broken active states in `/dashboard`.
3. **Screen Reader / Keyboard User**: Form inputs lack accessible labels across profile creation and job postings; major modal dialogs trap focus or fail to close on Escape.
