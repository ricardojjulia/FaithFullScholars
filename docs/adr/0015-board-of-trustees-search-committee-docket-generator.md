# ADR 0015: Board of Trustees Executive Search Committee Docket Generator

## Status
Accepted (Phase 12 / Council Review #7 Deliverable)

## Context
Seminary search committees, academic deans, and provosts routinely assemble candidate shortlists for review by Presidents and Boards of Trustees. Prior to this ADR, committees manually copied profile data into disparate Word documents or spreadsheets, resulting in inconsistent data presentation, unverified accreditation notes, and lost committee deliberation remarks.

## Decision
1. Implemented `<BoardDocketSummary />` on `/institution/saved/dossier` providing an interactive, unified board presentation matrix.
2. Search committees can assign candidate ranking tiers (*Highly Recommended (Tier 1)*, *Recommended Finalist*, *Alternative Pool*) and record confidential committee evaluation notes directly in the browser.
3. Added dedicated print stylesheets (`@media print`) that format the multi-candidate dossier into a clean, paginated executive board packet suitable for trustee meetings.

## Consequences
- **Positive**: Streamlines search committee presentations to executive leadership, saving dozens of administrative hours per faculty search.
- **Positive**: Ensures board members view standardized, verified ATS/ABHE accreditation badges, publications counts, and confessional alignments.
- **Security**: Confidential committee notes remain client-persisted in local state during active sessions without exposing sensitive deliberations publicly.
