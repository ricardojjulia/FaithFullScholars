---
name: pr-review
description: Mandatory pre-merge review gate for FaithFull Scholars — runs on every PR, non-trivial or not, in addition to the Council mandate for larger changes.
---

# PR Review

## Chain

1. Read `AGENTS.md`, `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`, relevant ADRs, and the current diff.
2. Invoke `pr-reviewer` (read-only) against the diff.
3. Findings come back ranked Critical / Important / Minor.
4. Critical or Important findings block merge — route back to the author/builder and re-run this gate after fixes.
5. Minor findings are the author's call; note them in the PR description either way.
6. **GitHub Copilot Review Triage Gate**: Once the PR is opened on GitHub, query review comments via `gh api repos/:owner/:repo/pulls/<pr_number>/comments`. Triage all findings (security, RLS policies, schemas, accessibility, assertion strictness). Resolve actionable feedback directly on the branch, re-run `npm run verify`, and confirm clean resolution before merging.

## Rules

- `pr-reviewer` never edits, merges, approves, or closes anything.
- This gate is separate from the Council mandate: it applies to every PR; the Council applies only to non-trivial ones.
- Merging is blocked until both local `pr-reviewer` findings and GitHub Copilot review comments are triaged and resolved.
