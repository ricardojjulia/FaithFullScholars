# ADR 0017: SabbaticalSwap Visiting Scholar & Sabbatical Exchange Network

## Status
Accepted (Phase 12 / Council Review #7 Deliverable)

## Context
Seminaries face frequent challenges covering advanced specialized courses (Hebrew, Systematic Theology, Church History) when senior faculty take research sabbaticals. Finding qualified, confessionally aligned adjuncts on short notice is difficult, while scholars seeking semester-long visiting appointments lack a unified network to find funded residencies.

## Decision
1. Extended `OpportunityType` in `lib/postings/postings-service.ts` to support `sabbatical_exchange`.
2. Integrated dedicated filter tabs on `/opportunities` allowing scholars to search exclusively for reciprocal faculty exchange appointments and sabbatical coverage calls.
3. Created a **SabbaticalSwap & Visiting Exchange Hub** on `/institution/consortium` allowing consortium member institutions to cross-list sabbatical vacancies and coordinate split-salary milestone contracts (`institution_contracts`).

## Consequences
- **Positive**: Solves a perennial administrative and academic bottleneck for deans and department chairs.
- **Positive**: Gives scholars funded teaching and research sabbatical opportunities across sister institutions.
- **Data Model**: Hooks into existing `institution_postings`, `consortiums`, and `institution_contracts` without requiring schema breaking changes.
