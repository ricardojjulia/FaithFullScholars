# Council Review 6 — Agent 3: UX & Shell Quality Audit

**Feature Target:** Phase 13 — Premium Scholar Profiles & Distinguished Faculty Dossiers (ADR 0014)  
**Auditor:** Council Agent 3 (UX & Shell Architect)  
**Status:** READ-ONLY AUDIT COMPLETE  
**Design System:** LinkedIn-Grade Academic Network (Aptos / Plus Jakarta Sans, `.card-crisp`, Lucide icons, `.font-literary` serif)

---

### 1. Accessibility Correctness & Shell Audit

A scan of shell navigation and interactive components reveals key focus and ARIA considerations for Phase 13:
- **`PublicNav`**: The `<nav>` element has `aria-label="Main navigation"`. Active route indicators include `aria-current="page"`.
- **Interactive Profile Modals**: `StructuredInquiryModal` and `EndorseColleagueModal` adhere to WAI-ARIA dialog standards with proper focus trapping and backdrop dismissal.
- **Dossier Accessibility**: Printable dossier view (`/scholars/[slug]/dossier`) must retain high contrast, semantic heading hierarchy (`h1` for scholar name, `h2` for major curriculum vitae sections), and screen-reader announcements.

---

### 2. Design & Visual Hierarchy for Premium Badges

In theological academia, commercial "pay-to-win" or flashy marketing badges ("Featured", "VIP", neon ribbons) undermine scholarly credibility.
- **Academic Nomenclature:** Avoid commercial terminology. Use institutional designations: *"Distinguished Fellow"*, *"Endowed Chair / Senior Scholar"*, or *"Verified Research Fellow"*.
- **Restrained Visual Palette:** Use deep Oxford navy (`bg-indigo-950/5 text-indigo-900 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800`) paired with subtle burnished gold accents (`text-amber-700 dark:text-amber-400`).
- **Typography & Geometry:** Minimalist academic seal or laurel vector (`lucide-react` `Award` or `ShieldCheck`, 1.5px stroke) with micro-typography (`text-[10px] font-mono font-bold uppercase tracking-wider`). Place inline alongside terminal degrees in the hero header, never as a floating commercial overlay.

---

### 3. Multimedia Showcase UX (Audio, Video, Podcasts)

- **Zero Cumulative Layout Shift (CLS):** Audio lectures and video embeds (YouTube, Vimeo, Transistor) must use explicit `aspect-video` (16:9) responsive wrappers with skeleton placeholders to prevent layout reflow during load.
- **Facade Click-to-Play Pattern:** Prevent heavy third-party iframe hydration on initial render. Display a high-resolution video poster thumbnail with a centered accessible play button (`aria-label="Play lecture: [Title]"`). Mount the `<iframe>` or HTML5 audio player only upon user interaction.
- **Strict No-Autoplay Mandate:** Audio and video must never autoplay. Deans reviewing candidates during office hours require silent-by-default controls.
- **Scholarly Controls:** Provide playback rate selectors (1x, 1.25x, 1.5x) and transcript drawer availability.

---

### 4. Print-Ready Dossier Layout

Academic search committees frequently review candidates in printed binders or committee PDF packets:
- **Shell Elimination:** Apply strict `@media print` hiding to `PublicNav`, `PublicFooter`, action bars, and shortlist controls (`print:hidden`).
- **Page Break Hygiene:** Add `print:break-inside-avoid` to credential blocks, doctrinal statements, and candidate portfolio cards to eliminate orphan headings across page boundaries.
- **Monochrome Print Fidelity:** Enforce `print:text-black print:bg-white print:border-slate-400 print:shadow-none`, stripping dark mode fills and color gradients to conserve committee printer toner.
- **Citation Standards:** Format monographs and journal articles strictly according to SBL / Chicago 17th edition bibliographies with full publication year, publisher, and DOI.

---

### 5. Top 3 UX Considerations for Deans and Scholars

1. **Information Density for Deans:** Deans demand rapid scannability—terminal degrees, ATS accreditation status, and confessional vows must sit above the fold without extraneous promotional fluff.
2. **Dignified Scholar Identity:** Senior faculty will only adopt premium dossiers if presentation feels scholarly and peer-reviewed rather than advertised.
3. **Seamless Search Committee Sharing:** One-click board-ready PDF generation and confidential candidate link distribution are essential for adoption.

---

### 6. Recommendation

**PROCEED WITH CONDITIONS.** Approve Phase 13 (ADR 0014) from a UX perspective, provided that commercial badge styling is strictly rejected in favor of restrained academic seals, multimedia embeds implement zero-CLS click-to-play facades, and the dossier retains full SBL/Chicago print fidelity.
