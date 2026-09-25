# ADR 0016: Confessional Lens Doctrinal Fit Matrix

## Status
Accepted (Phase 12 / Council Review #7 Deliverable)

## Context
Theological institutions require faculty to subscribe to specific historical confessional standards (e.g. Westminster Standards, 1689 London Baptist, Thirty-Nine Articles of Religion, Chicago Statement on Biblical Inerrancy). Search committees traditionally spend dozens of hours reviewing personal doctrinal statements to verify alignment and identify open-handed theological areas.

## Decision
1. Implemented a dedicated confessional compatibility engine (`lib/search/confessional-matcher.ts`) that maps scholar verified confessions against target institutional standards.
2. Created `<ConfessionalAlignmentMatrix />` displaying:
   - **Theological Compatibility Index** (0–100% gradient score).
   - **Alignment Status Badges**: *Full Confessional Subscription*, *Substantial Confessional Alignment*, *Ecumenical Orthodox Compatibility*, *Distinctive / Independent Confession*.
   - **Verified Confessional Standards Badges** with one-click verification.
   - **Committee Fit Notes & Inerrancy Checks**.
3. Integrated the component directly into the public scholar profile view (`/scholars/[slug]`).

## Consequences
- **Positive**: Provides instantaneous, transparent doctrinal clarity for prospective institutional recruiters.
- **Positive**: Preserves dignity and nuances of independent and multi-confessional scholars while ensuring strict confessional integrity.
- **Security**: Relies solely on approved public snapshots (`scholar_confessions`), keeping draft revision edits isolated until approved.
