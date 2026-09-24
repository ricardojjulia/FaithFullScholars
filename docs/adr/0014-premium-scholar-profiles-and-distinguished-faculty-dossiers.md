# ADR 0014: Premium Scholar Profiles & Distinguished Faculty Dossiers

## Status
Accepted (Phase 13 / Post-MVP Backlog)

## Date
2026-09-24

## Context & Motivation
Following the deployment of institutional marketplace features (consortia, course licensing, speaking bureau, institutional subscriptions, and accreditation badges), FaithFull Scholars evaluated the needs of senior faculty, endowed chairs, independent scholars, and theological search committees:

1. **Academic Portfolio Fragmentation**: Senior faculty, endowed chairs, and independent theological scholars frequently maintain disjointed web presences (personal blogs, fragmented PDF CVs, unindexed academic articles, and uncurated lecture recordings).
2. **Search Committee Friction**: Seminary search committees, provosts, and ATS accreditation visiting teams review candidate dossiers in physical binders or printable PDF portfolios. Existing standard PDF CV uploads are visually inconsistent, poorly formatted for printing, and lack verifiable links to institutional confessional affirmations and peer commendations.
3. **Spoken Pedagogy & Homiletics Evaluation**: Theological institutions place exceptional weight on classroom pedagogy, orthodox demeanor, and clarity in public disputation and preaching. Written publication lists alone do not demonstrate teaching presence.
4. **Preserving Academic Integrity against "Pay-to-Win" Anti-Patterns**: In conservative, Reformed, and confessional higher education, commercialized "pay-to-win" models (e.g. paying to rank higher in searches) destroy credibility. Search discovery MUST remain strictly merit-, relevance-, and credential-based.

## Decision
We implement **Phase 13: Premium Scholar Profiles & Distinguished Faculty Dossiers**:

### 1. Data Model & Privilege Escalation Defense
- **Schema Extensions on `public.scholars`**:
  - `profile_tier TEXT NOT NULL CHECK (profile_tier IN ('standard', 'distinguished_fellow')) DEFAULT 'standard'`
  - `orcid_id TEXT CHECK (orcid_id IS NULL OR orcid_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$')`
  - `google_scholar_url TEXT CHECK (google_scholar_url IS NULL OR google_scholar_url ~ '^https:\/\/scholar\.google\.[a-z.]+\/citations\?.*user=')`
  - Index: `CREATE INDEX idx_scholars_profile_tier ON public.scholars (profile_tier);`
- **Schema Extensions on `public.media_links`**:
  - `is_featured BOOLEAN NOT NULL DEFAULT false`
  - `thumbnail_url TEXT`
  - `duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0)`
  - Index: `CREATE INDEX idx_media_links_featured ON public.media_links (scholar_id, display_order) WHERE is_featured = true;`
- **Anti-Privilege Escalation Trigger (`prevent_scholar_tier_escalation`)**:
  - Even though scholars have UPDATE privileges on their own `scholars` row (`account_id = auth.uid()`), they cannot escalate `profile_tier` to `'distinguished_fellow'`.
  - A PostgreSQL trigger raises an exception if `OLD.profile_tier != NEW.profile_tier` unless `public.is_admin() = true`.
- **ADR 0005 Revision Isolation Compliance**:
  - `orcid_id` and `google_scholar_url` are validated and stored in `scholar_profile_revisions.snapshot_data`, diffed in admin review (`computeRevisionDiff`), and promoted upon admin approval.

### 2. Search Neutrality Invariant
- `profile_tier` introduces **zero** ranking boost in directory search queries (`/scholars`), course discovery, or AI Faculty Matcher algorithms.
- Search ordering remains strictly relevance-, discipline-, credential-, and alphabetical-based.

### 3. Restrained Academic Design & Badges
- Rejection of commercial marketing tags ("VIP", "Featured", "Premium").
- Adoption of dignified Oxford navy / burnished gold academic seals:
  - `<DistinguishedBadge />` with `<ShieldCheck />` or `<Award />` icons and subtle micro-typography (`text-[10px] font-mono uppercase tracking-wider`).
  - Rendered inline with terminal doctoral degrees in scholar hero cards.

### 4. Zero-CLS Click-to-Play Multimedia Showcase
- Responsive `aspect-video` facade wrappers with skeleton loaders to prevent layout reflow.
- High-resolution poster preview with accessible play button; mounts iframe/audio only on user action.
- Strict No-Autoplay rule.
- Strict URL whitelist: YouTube (`youtube.com`, `youtu.be`), Vimeo (`vimeo.com`), Spotify (`open.spotify.com`), and SoundCloud (`soundcloud.com`).

### 5. High-Fidelity Print-Ready Dossier (`/scholars/[slug]/dossier`)
- Server-rendered academic portfolio structured according to SBL Handbook of Style (2nd ed.) / Chicago Manual of Style (17th ed.).
- Print stylesheet (`@media print`):
  - Hides navigation shells, action buttons, footers (`print:hidden`).
  - Strips backgrounds and shadows to conserve toner (`print:bg-white print:text-black print:shadow-none`).
  - Enforces `print:break-inside-avoid` on credential cards, doctrinal affirmations, and bibliography blocks.
  - Formats monographs, articles, courses, endorsements, and speaking topics into a cohesive board packet.

### 6. Scholar Dashboard Media Manager
- Dedicated media showcase manager (`/dashboard/media`), accessible from `UserMenu` and Profile Dashboard, enabling scholars to curate lecture links with thumbnail previews and featured highlights.

## Consequences
- **Positive**: Senior and independent faculty gain an authoritative, enduring institutional dossier; seminary search committees can instantly generate board-ready packets; students and provosts can review spoken lectures.
- **Negative / Operational**: SBL citation parser requires maintenance; YouTube/Vimeo embed players require periodic security whitelist audit.
- **Security & RLS**: All 35 tables retain 100% RLS enforcement; privilege escalation is blocked at the database trigger layer.
