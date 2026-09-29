# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for **FaithFull Scholars**.

## When is an ADR Required?

Per `AGENTS.md` and `improve-software.md`, an ADR must be written before introducing:
1. A new boundary, service layer, or external integration contract.
2. A new role-access, authorization, or data-isolation pattern.
3. A data-exposure rule or public vs. draft visibility change.
4. Any non-standard or unusual third-party dependency.

## Decision Format & Numbering

ADRs are sequentially numbered 4-digit markdown files:
- `0001-scholar-profile-network-first.md`: Start as profile network, not full marketplace.
- `0002-external-media-hosting.md`: External media embeds (YouTube) rather than self-hosting video.
- `0003-admin-reviewed-publication.md`: Admin-reviewed public profiles prior to listing.
- `0004-vercel-supabase-platform.md`: Next.js on Vercel backed by Supabase platform baseline.
- `0005-draft-published-profile-revisions.md`: Decouple live profiles from in-review changes via Draft & Published Revisions.
- `0006-pilot-feedback-error-triage.md`: Distributed telemetry, rate limiting, and staff error-triage workspace.
- `0007-linkedin-ux-and-academic-network-design-system.md`: Modern LinkedIn UI/UX paradigm, universal app bar, 3-column layout, and canonical profile card hierarchy.
- `0008-search-abuse-gating-anti-scraping-and-pii-protection.md`: Token-bucket search rate limiting, 3-page anonymous discovery cap, input sanitization, and PII segregation.
- `0009-theological-speaker-directory-and-speaking-bureau.md`: Dedicated theological speaker directory, keynote topics architecture, and 1-click booking inquiries.
- `0010-tiered-institutional-subscriptions.md`: Three-tier institutional membership (Basic, Verified Seminary, Premier Partner) with automated quota meters.
- `0011-institutional-engagement-contracts.md`: Bilateral academic engagement contracts, milestone deliverables, and scholar signing workspace.
- `0012-seminary-consortium-and-multi-campus-accounts.md`: Confessional consortia and multi-campus federation hierarchy with shared candidate pools.
- `0013-course-licensing-and-syllabus-distribution.md`: Bilateral course licensing, syllabus access agreements, and ATS/ABHE accreditation badges.
- `0014-distinguished-faculty-fellow-dossiers-and-media-showcase.md`: Distinguished Fellow honors, Chicago/SBL citation bibliography, ORCID/Google Scholar badges, zero-CLS media facade, and board-ready dossiers.
- `0015-board-of-trustees-search-committee-docket-generator.md`: Board of Trustees Search Committee Docket Generator, executive candidate comparison, and RFC-4180 CSV export.
- `0016-confessional-lens-doctrinal-alignment-matrix.md`: Confessional Lens Doctrinal Alignment Matrix, weighted adherence scoring, and seminary doctrinal compatibility.
- `0017-sabbaticals-swap-visiting-scholar-network.md`: SabbaticalSwap visiting scholar network, reciprocal housing/office exchange, and institutional hosting clearance.
- `0018-doctoral-dissertation-supervision-and-external-reader-exchange.md`: Doctoral dissertation supervision exchange, external committee reader registry, and theological specialization matching.
- `0019-ats-abhe-accreditation-self-study-faculty-credentials-matrix.md`: ATS Standard 3 & ABHE Standard 11 faculty credentials self-study matrix, terminal doctorate ratio calculator, and RFC-4180 audit export.


Each ADR must define:
- **Status:** Proposed / Accepted / Superseded
- **Context:** The problem, constraints, and driving factors.
- **Decision:** The chosen architecture or approach.
- **Consequences:** Positive and negative tradeoffs.
