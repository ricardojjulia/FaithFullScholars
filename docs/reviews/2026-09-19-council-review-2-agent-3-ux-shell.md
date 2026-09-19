# Council Review 2 — Agent 3: UX, Visual Design System & LinkedIn Paradigm Audit

**Review Date:** 2026-09-19  
**Agent:** Council Agent 3 (UX & Shell Designer)  
**Status:** Read-Only Audit Pass  
**Repo Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. LinkedIn Visual Paradigm Adapted for Theological Academia

Modern LinkedIn's interface succeeds because of its clean visual hierarchy, card-based content chunking, persistent identity anchoring, and scannable credentialing. For theological higher education, where academic rigor and doctrinal alignment are paramount, this layout must be elevated with academic dignity.

### Core Layout Patterns

```
+-----------------------------------------------------------------------------------+
|  [FS]  [ 🔍 Universal Search: Scholars, Syllabi, Confessions... ]   Home  Network  Courses  Me  |
+-----------------------------------------------------------------------------------+
|   LEFT COLUMN (25%)    |           CENTER COLUMN (50%)          |   RIGHT COLUMN (25%)    |
|                        |                                        |                         |
| +--------------------+ | +------------------------------------+ | +---------------------+ |
| | Mini Profile Card  | | | HERO PROFILE CARD                  | | | Institutional Calls | |
| | - Avatar & Name    | | | [ Academic Cover Banner          ] | | | - Adjunct Openings  | |
| | - Primary Field    | | | (Avatar)                           | | | - Modular Intensives| |
| | - Doctrinal Badge  | | | Dr. Calvin Edwards, Ph.D.          | | +---------------------+ |
| +--------------------+ | | Professor of Historical Theology   | |                         |
|                        | | Westminster Theological Seminary   | | +---------------------+ |
| +--------------------+ | | [ Inquire ] [ Shortlist ] [ Share ]| | | Trending Fields     | |
| | Multi-Criteria     | | +------------------------------------+ | | - Reformed Dogmatics| |
| | Filter Rail        | |                                        | | - New Testament Greek| |
| | - Discipline       | | +------------------------------------+ | | - Patristics        | |
| | - Confession       | | | ABOUT / BIOGRAPHY CARD             | | +---------------------+ |
| | - Availability     | | +------------------------------------+ |                         |
| +--------------------+ | | EDUCATION & TERMINAL DEGREES       | | +---------------------+ |
|                        | +------------------------------------+ | | Trust & Accreditation| |
|                        | | DOCTRINAL STATEMENT & CONFESSIONS  | | | - ATS Compliant     | |
|                        | +------------------------------------+ | | - Verified Faculty  | |
|                        | | PUBLICATIONS & RESEARCH            | | +---------------------+ |
|                        | +------------------------------------+ |                         |
|                        | | COURSE SHOWCASE & SYLLABI          | |                         |
|                        | +------------------------------------+ |                         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Canonical Profile Specification (LinkedIn Profile Parity)

A modern scholar profile page (`/scholars/[slug]`) must implement the standard LinkedIn card structure:

1. **Cover Banner & Anchor Header**:
   - High-resolution cover image container (aspect ratio 4:1) with subtle library or historic parchment motifs.
   - 120px circular academic avatar with prominent border overlapping the bottom-left of the cover banner.
   - Active status indicator: Pulsing emerald badge for *"Open to Adjunct Teaching"*.
2. **Identity & Action Header**:
   - Scholar full name with terminal degrees (`Dr. Calvin Edwards, Ph.D., Th.M.`).
   - Headline / Current Institutional Appointment (`Professor of Historical Theology at Westminster Theological Seminary`).
   - Location, Timezone, and Academic Social Links (ORCID, Google Scholar, PhilPeople).
   - Primary Action Bar:
     - **Primary:** `Send Institutional Inquiry` (Indigo brand button with mail icon).
     - **Secondary:** `Save to Shortlist` (Bookmark button with count).
     - **Tertiary:** `Share Profile` / `Download Public Summary`.
3. **Modular Section Cards**:
   - **About / Academic Summary Card**: Concise research overview and academic trajectory.
   - **Doctrinal Alignment & Confessional Stance Card (ADR 0001)**:
     - Prominent callout box featuring the scholar's personal affirmed faith statement.
     - Interactive chips displaying affirmed historic standards (Westminster, 1689 Baptist, Nicene) with verified subscription levels (*Full Subscription*, *Strict Agreement*).
   - **Experience & Academic Appointments Card**: Sequential timeline of current and prior professorships, visiting scholar roles, and department chair positions.
   - **Education & Terminal Degrees Card**: Degree type, institution name, graduation year, and dissertation title with supervisory committee.
   - **Publications & Scholarly Monographs Card**: Books, peer-reviewed journal articles, book reviews, and conference presentations with standard APA/Chicago academic citation formatting.
   - **Course Showcase & Syllabi Previews Card**: Available course modules, syllabi previews, reading lists, and delivery options (Modular, Synchronous, Asynchronous).

---

## 3. UI Tokens & Styling Guidelines

- **Palette**:
  - Background Canvas: `bg-slate-100/60 dark:bg-slate-950`
  - Card Surfaces: `bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm`
  - Brand Primary: `indigo-900 dark:indigo-700` (dignified academic navy)
  - Accent Gold: `amber-500` (for academic terminal degree badges and honors)
  - Success Green: `emerald-600` (for availability and verified indicators)
- **Typography**:
  - UI Labels & Controls: Inter font family (`font-sans`, tracking-tight)
  - Academic Titles & Doctrinal Statements: Merriweather or Georgia (`font-serif`) for literary legibility.
- **Accessibility**:
  - Minimum contrast ratio 4.5:1 on all text.
  - Proper ARIA attributes (`role="search"`, `aria-label`, `aria-expanded`) on dropdowns and search suggestions.

---

## 4. Top 3 UX Pain Points to Address Immediately

1. **Lack of Cover Banner & Professional Hero**: Profiles currently look like basic document lists rather than rich LinkedIn academic profiles.
2. **Missing Universal Search in App Shell**: Search is currently only a hero input on the landing page rather than a persistent global search utility.
3. **Absence of 3-Column Balanced Layout on Large Screens**: Directory page feels sparse on wide monitors; adding institutional highlights and trending academic specialties will increase engagement.
