---
name: council
description: Runs the FaithFull Scholars council review — 5 read-only audit agents (including the Wildcard Innovation Catalyst) plus Agent 6 Documenter close-out — per improve-software.md. Use before any non-trivial merge to the default branch.
---

# FaithFull Scholars Council

Entrypoint wiring `improve-software.md` (source of truth) into subagents.

## Chain

1. Read `AGENTS.md`, `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`, and `improve-software.md` §0–2.
2. Spawn the five read-only audit agents in parallel:
   - Agents 1–4: Baseline audits (Data/API, Routes/Pages, UX/Shell, Feature/Competitive)
   - Agent 5: The Wildcard (Innovation & Lateral Thinking Catalyst; activated in Mode A [random callout/provocateur] or Mode B [direct improvement challenge])
3. Synthesize per §3: cross-agent consensus, evaluation of Wildcard proposals, ADR drafts, `docs/reviews/YYYY-MM-DD-council-review-[N]-synthesis.md` plus the five agent reports.
4. Ask the human to approve the synthesis and prompt sequence before implementation.
5. Execute approved prompts via `feature-factory` / `build-with-tests`, sequentially for write phases.
6. Verify: full lint (`npm run lint`), test (`npm run test`), data-isolation (`npm run audit:rls`), and build (`npm run build`) clean. A red result is a stop condition — do not proceed.
7. Invoke the `documenter` subagent (Agent 6) to close the loop.
8. Run `pr-review` against the finished diff.
9. Only after Documenter and `pr-review` sign-off: ask the human before opening the PR, referencing the synthesis and both sign-offs.

## Rules

- Agents 1–5 are read-only; never let them edit files.
- Documenter (Agent 6) is write-role but scoped to docs/changelog/plan/ADRs/memory only — never application code.
- Do not skip step 6 to save time.
- If run against a branch with accumulated, unreviewed history (not a fresh feature branch), or against a branch too small to warrant the full audit, say so explicitly in the synthesis — that's itself a finding.
- Verify factual claims in agent reports against the live repo/CI state before they go into the synthesis; agents can be wrong or stale.
