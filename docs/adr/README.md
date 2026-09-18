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

Each ADR must define:
- **Status:** Proposed / Accepted / Superseded
- **Context:** The problem, constraints, and driving factors.
- **Decision:** The chosen architecture or approach.
- **Consequences:** Positive and negative tradeoffs.
