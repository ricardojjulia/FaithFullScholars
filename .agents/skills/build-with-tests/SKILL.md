---
name: build-with-tests
description: Use when implementing or extending FaithFull Scholars features, fixing bugs, or changing behavior in code.
---

# Build With Tests

## Required Context

Read before editing: `CLAUDE.md`, `AGENTS.md`, `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`, relevant ADRs under `docs/adr/`, relevant module docs under `docs/`, and the approved story/brief when available.

## Process

1. Map 2–3 similar existing features and reuse their patterns.
2. Keep the change scoped to the approved module and role boundary.
3. Write or update tests near the changed behavior.
4. Preserve data-isolation, access-control, audit, and any other security-relevant boundaries already established in the codebase (Postgres RLS).
5. Update `README.md`, `CHANGELOG.md`, and relevant docs for meaningful changes.
6. Run targeted tests first, then the project's full lint, test, RLS audit, and build commands before handoff.

## Rules

- No new dependencies without explicit approval and an ADR for unusual choices.
- Do not refactor unrelated code.
- Do not edit already-merged migrations unless the task explicitly requires a corrective migration.
- Never expose raw provider payloads, secrets, payment details, sensitive personal data, or database errors.
- If verification fails, report the exact command and failure — do not claim completion.
