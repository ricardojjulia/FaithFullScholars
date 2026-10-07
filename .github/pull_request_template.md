## Summary

<!-- One paragraph: what changed and why. Link the story/spec and ADR if any. -->

## Type of change

- [ ] New feature
- [ ] Bug fix
- [ ] Database migration
- [ ] Refactor (no behavior change)
- [ ] Documentation
- [ ] Security fix

## Security & Data-Isolation Checklist (AGENTS.md)

- [ ] No secrets committed (no `.env*`, no hardcoded keys)
- [ ] No RLS bypass (no service-role client in user-facing code, no `SET row_security = off`)
- [ ] Authorization enforced at the data layer (RLS keyed on `auth.uid()` and ownership), not only in app code
- [ ] Identity derived from the session; no client-supplied id used for an authorization decision
- [ ] External input validated at system boundaries
- [ ] No raw database errors, stack traces or special-category data in responses or logs

## Database (if a migration is included)

- [ ] New migration file only (no edits to merged migrations)
- [ ] RLS enabled + forced; policies added; `tests/integration/policy-matrix.json` updated
- [ ] Trust columns guarded by a fail-closed trigger
- [ ] Guard proven: tests fail when it is removed
- [ ] Production runbook (preflight → apply → verify grants) noted in CHANGELOG

## Verification Gate

- [ ] Targeted tests pass
- [ ] `npm run verify` passes (lint, typecheck, test, test-surface, audit:rls, audit:security, build)
- [ ] E2E passes (`npm run test:e2e`) if UI or auth changed
- [ ] New surfaces carry `covers()` tags (no new exemptions without an expiry)

## Review Gates

- [ ] `pr-review` gate run; Critical/Important findings resolved
- [ ] Council + Documenter close-out (non-trivial changes), synthesis linked
- [ ] Copilot review comments triaged

## Changelog

<!-- Add user-visible changes under [Unreleased] in CHANGELOG.md -->

```
### Added / Changed / Fixed / Removed / Security
- ...
```

## Screenshots / Evidence (if UI changed)

<!-- Before / after screenshots or test evidence -->
