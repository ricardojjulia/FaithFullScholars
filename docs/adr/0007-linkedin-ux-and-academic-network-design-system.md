# ADR 0007: LinkedIn-Grade UI/UX and Academic Network Design System

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Council (Data, Routes, UX, Feature Agents) & Core Engineering
- **Consulted:** Product Roadmap, Theological Domain Stakeholders

---

## Context

FaithFull Scholars connects theological faculty, seminaries, Bible colleges, and universities for academic appointments, adjunct teaching, modular courses, and scholarly collaboration. 

Generic academic sites often look dated, sparse, or difficult to navigate. The user mandate requires that FaithFull Scholars look, feel, and function with the modern, high-polish user interface and user experience that modern LinkedIn users expect today, while preserving the dignified aesthetic suitable for Christ-centered academic theology.

---

## Decision

We adopt a **LinkedIn-Grade Academic Network Design System** across all routes and views:

### 1. Global Universal Application Bar
- A persistent, sticky top application bar featuring:
  - Brand identity with instant home navigation.
  - An embedded universal search bar with keyboard activation (`/` or `Cmd+K`), scoped filters (*Faculty*, *Courses*, *Disciplines*, *Confessions*), and typeahead quick results.
  - Primary navigation tabs with icon badges and active-state indicators: **Feed/Home**, **Faculty Directory** (Network), **Courses**, **Institutions**, and **Teaching Calls**.
  - User identity dropdown ("Me") providing rapid access to the scholar profile, draft revision staging, and settings.

### 2. Modern 3-Column Desktop Feed & Directory Architecture
On desktop viewports (`lg` and `xl`), directory and discovery pages follow LinkedIn's balanced 3-column grid:
- **Left Column (25%)**: Sticky Identity & Filter Rail (Scholar mini-profile badge, quick filter toggles by discipline and tradition, search reset).
- **Center Column (50%)**: Main Content Stream (Faculty cards, course showcases, academic announcements, and detailed search results).
- **Right Column (25%)**: Contextual Recommendations & Trust Rail (Open institutional teaching calls, trending theological fields, ATS/ABHE accreditation highlights, and review standards).

### 3. Canonical Scholar Profile Card Layout
Scholar profiles (`/scholars/[slug]`) implement the modern LinkedIn card hierarchy:
1. **Academic Cover Banner**: High-ratio header image with dignified scholarly parchment/library motifs.
2. **Anchor Identity Header**: Overlapping 120px circular avatar with verified badge, full academic name, terminal degrees (Ph.D., Th.D.), institutional headline, and active teaching availability indicator.
3. **Primary Action Bar**: Prominent "Send Institutional Inquiry", "Save to Shortlist", "Share Profile", and "More Actions".
4. **Card-Based Section Stack**:
   - *About / Academic Biography*
   - *Doctrinal Alignment & Historic Confessions (ADR 0001)*
   - *Education & Terminal Degrees*
   - *Publications & Scholarly Monographs*
   - *Course Showcase & Inspectable Syllabi*
   - *Institutional Teaching Preferences & Modular Availability*

---

## Consequences

### Positive
- Delivers an immediately familiar, premium, and intuitive experience for faculty and academic deans.
- Significantly increases user engagement and scannability of dense academic credentials.
- Distinguishes FaithFull Scholars from clunky academic portals and commercial job boards.

### Negative / Trade-offs
- Requires maintaining responsive layout adaptations for mobile/tablet where the 3-column desktop layout collapses into a single streamlined column.
- Demands disciplined component separation between shared shell components and domain views.
