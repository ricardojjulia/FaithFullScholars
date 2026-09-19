# Council Review 2 — Agent 2: Route, Navigation & Page Architecture Audit

**Review Date:** 2026-09-19  
**Agent:** Council Agent 2 (Route & Page Architect)  
**Status:** Read-Only Audit Pass  
**Repo Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. LinkedIn-Grade Application Shell & Route Hierarchy

Modern professional networks (e.g., LinkedIn) utilize a persistent, universally accessible top application shell that unifies search, network navigation, context switching, and identity management across all viewport sizes.

### Target Route Architecture

```
app/
├── (public)/
│   ├── page.tsx                           # Homepage / Value Proposition
│   ├── scholars/
│   │   ├── page.tsx                       # Network Directory (LinkedIn "My Network" style)
│   │   └── [slug]/
│   │       └── page.tsx                   # Canonical Academic Profile (LinkedIn Profile style)
│   ├── courses/
│   │   ├── page.tsx                       # Course Showcase Catalog
│   │   └── [slug]/
│   │       └── page.tsx                   # Course & Syllabus Detail
│   ├── institutions/
│   │   ├── page.tsx                       # Seminary & College Directory
│   │   └── [slug]/
│   │       └── page.tsx                   # Institution Profile & Open Faculty Calls
│   └── opportunities/
│       └── page.tsx                       # Academic Teaching Openings (LinkedIn Jobs style)
├── (auth)/
│   ├── login/page.tsx                     # Sign In (Email / Magic Link / SSO)
│   ├── signup/page.tsx                    # Registration (Scholar vs Institutional Rep)
│   └── reset-password/page.tsx
├── (dashboard)/                           # Protected Workspace
│   ├── dashboard/
│   │   ├── profile/page.tsx               # Scholar Profile Editor & Revision Staging (ADR 0005)
│   │   ├── onboarding/page.tsx            # Assisted CV Upload & Auto-Extraction
│   │   ├── courses/page.tsx               # Syllabi & Lecture Showcase Management
│   │   ├── availability/page.tsx          # Adjunct Terms & Delivery Preference Toggle
│   │   └── inquiries/page.tsx             # Structured Institutional Inquiry Inbox
├── (admin)/
│   ├── admin/reviews/page.tsx             # Doctrinal & Profile Revision Moderation (Diff Engine)
│   └── admin/triage/page.tsx              # Error Telemetry & Feedback Triage (ADR 0006)
└── dev/
    └── status/page.tsx                    # System Architecture & Diagnostics Dashboard
```

---

## 2. Global Universal App Bar Design (LinkedIn-Style)

The header shell must transition from a static public marketing navbar to an interactive, unified application navigation bar:

1. **Embedded Universal Search Box**:
   - Centered or left-aligned search input with immediate keyboard shortcut (`/` or `Cmd+K`).
   - Integrated dropdown providing scoped search targets: *Faculty*, *Disciplines*, *Confessions*, *Courses*, and *Institutions*.
2. **Persistent Primary Nav Items with Active State Badging**:
   - 🏠 **Home / Feed** (`/`)
   - 👥 **Network / Directory** (`/scholars`)
   - 📖 **Courses** (`/courses`)
   - 🏛️ **Institutions** (`/institutions`)
   - 💼 **Teaching Calls** (`/opportunities`)
   - ✉️ **Inquiries** (`/dashboard/inquiries` - authenticated)
3. **User Profile / "Me" Dropdown**:
   - Quick glance: Avatar, Name, Institutional Affiliation, Live Profile link.
   - Action list: *View Public Profile*, *Edit Draft Revision*, *Teaching Availability*, *Settings & Privacy*, *Sign Out*.

---

## 3. SEO-Safe Public Profiles vs. Auth-Gated Deep Actions

To balance search engine indexability with user data protection:

| Page / Component | Public Viewable | Auth-Gated (Requires Sign-In) |
|---|---|---|
| **Scholar Profile** (`/scholars/[slug]`) | Name, Title, Institution, Bio, Degrees, Publications, Course Outlines, Confessional Standards, Public Doctrinal Statement. | Direct email/phone disclosure, full unredacted CV PDF download, structured inquiry dispatch form, bookmarking / saving candidate to lists. |
| **Faculty Directory** (`/scholars`) | First 18 candidate profiles matching criteria, aggregate discipline taxonomy counts. | Deep pagination beyond page 3, advanced bulk filtering (e.g. cross-referencing multiple rare confessions with geographic radius). |
| **Course Details** (`/courses/[slug]`) | Course overview, instructor name, modular delivery options, lecture topics. | Full downloadable syllabus document with proprietary reading lists and grading rubrics. |

---

## 4. Route Audit Summary Table

| Route | Shell | Current Status | Recommended Action |
|---|---|---|---|
| `/` | Public | EXISTS | Upgrade search bar to universal typeahead; add LinkedIn-style feed/recent updates card layout. |
| `/scholars` | Public / Network | EXISTS | Redesign layout to 3-column feed with left-hand filters card and right-hand recommended scholars card. |
| `/scholars/[slug]` | Profile | EXISTS | Redesign to full LinkedIn profile card architecture: cover banner, overlapping avatar, action bar, section cards. |
| `/courses` | Public / Catalog | EXISTS | Modernize cards with syllabi tags and instructor chips. |
| `/courses/[slug]` | Course Detail | EXISTS | Add auth gate for proprietary full syllabus download. |
| `/institutions` | Institutions | MISSING | Add directory for ATS/ABHE accredited seminaries & Bible colleges. |
| `/opportunities` | Opportunities | MISSING | Add board for institutional calls for adjunct professors. |
| `/dashboard/profile` | Scholar Workspace | IN PLAN | Build in Phase 3 with assisted CV extraction. |
