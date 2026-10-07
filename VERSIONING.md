# Versioning

FaithFull Scholars uses semantic versioning for development milestones while the product is pre-GA.

Current version: `0.1.0`

`package.json` and the latest released entry in [`CHANGELOG.md`](CHANGELOG.md) must agree. CI enforces this with `npm run version:check`.

## Version Format

```text
MAJOR.MINOR.PATCH
```

## Current Pre-GA Rule

Before general availability:

- `0.x.0` **minor** releases mark meaningful pilot milestones: a complete persona workflow, a new trust or data-isolation capability, or a release-readiness package.
- `0.x.y` **patch** releases mark focused fixes, RLS or guard corrections, documentation, test expansion or small operational hardening.
- `1.0.0` is reserved for general availability. It must not be used until a Council release review approves production readiness, including:
  - persisted scholar self-service;
  - live data in every portal;
  - a persistent rate limiter;
  - GDPR controls;
  - field-level encryption.

## Release Classes

### Minor Milestone

Examples:
- the persisted scholar revision lifecycle with atomic admin review;
- institution invitations and team membership;
- GDPR consent, export and erasure;
- targeted field-level encryption of special-category data.

### Patch Fix

Examples:
- an RLS policy or guard-trigger correction;
- UI polish, accessibility or responsive-layout fixes;
- documentation, runbook or test-suite expansion;
- dependency security bumps.

## Changelog Policy

Every release updates [`CHANGELOG.md`](CHANGELOG.md) with:
1. a user-visible summary of features, fixes and security changes;
2. schema or environment-variable changes, including any production migration and its deploy runbook;
3. verification results: CI run, test gates and known residual risk.

Unreleased work accumulates under `## [Unreleased]` until a version is cut.
