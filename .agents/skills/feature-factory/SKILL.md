---
name: feature-factory
description: Use when building a non-trivial FaithFull Scholars feature end to end — product rules, architecture, backend, frontend, tests, and validation all involved.
---

# Feature Factory

Run structured feature work through focused agents and approval gates.

## Chain

1. Invoke `codebase-researcher` with the feature idea and area of code.
2. Invoke `story-writer` with the idea and research findings.
3. Ask the human to approve, revise, or reject the story.
4. Invoke `spec-writer` with the approved story and research findings.
5. Ask the human to approve, revise, or reject the technical brief.
6. Invoke `backend-builder` when backend/server/data work is in scope.
7. Invoke `frontend-builder` when UI/client work is in scope.
8. Invoke `test-verifier` with the story, brief, and builder summaries.
9. Invoke `implementation-validator` with the story, brief, test report, and diff.
10. If critical findings exist, route back to the relevant builder, then rerun `test-verifier` and `implementation-validator`.
11. Ask the human before PR creation, merge, or launch claims.

## Rules

- Never skip human approval after the story or brief.
- Read-only agents may run in parallel; writing agents run in sequence.
- Builders never widen scope beyond the approved brief.
- If an agent reports a blocker, stop and surface it.
- Keep each feature one coherent vertical slice; split oversized work at the story level.
- End with verification evidence: targeted tests, full lint (`npm run lint`), RLS audit (`npm run audit:rls`), full build (`npm run build`), and any known residual failures.
