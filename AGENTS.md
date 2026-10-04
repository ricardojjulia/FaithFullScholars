<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FaithFull Scholars Agent Rules

- Read `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md` (this project's master roadmap and architecture doc) before proposing or implementing changes. This file plus `improve-software.md` are the source of truth for engineering discipline and development standards.
- Keep the repo aligned with its documented directory structure. Do not add ad hoc top-level folders.
- Favor mainstream, well-supported dependencies. Write an ADR under `docs/adr/` before introducing anything unusual.
- Update `README.md`, `CHANGELOG.md`, and relevant docs under `docs/` with every meaningful feature change.
- Document meaningful agent/factory runs transparently: intent, architecture impact, verification commands/results, residual risk, and follow-up work must be captured in committed docs or handoff notes — not only in chat.
- Verify work with `npm run lint`, `npm run test`, `npm run audit:rls`, and `npm run build` before handoff when feasible.
- Do not push directly to `main`. Use a feature branch, push the branch, open a pull request, merge through GitHub after required checks and review, then pull the default branch.
- **The Council runs before every non-trivial merge to the default branch.** This is a mandate, not a suggestion — see `improve-software.md` §0 for scope and exceptions. The Council is 6 read-only audit agents (data/API, routes/pages, UX/shell, feature/competitive, the Wildcard innovation catalyst, and Agent 7 Stakeholder & Trust Lens — see `docs/factory/review-personas.md`) plus Agent 6, write-role **Documenter** agent that closes the loop after verification is clean.
- **The `pr-review` gate runs before every merge, non-trivial or not** — in addition to, not instead of, the Council. `pr-reviewer` is read-only: it ranks findings Critical/Important/Minor and hands them back; it never merges, approves, or closes anything itself.
- **The GitHub Copilot review gate runs on every open PR before merge:** Once a pull request is opened, inspect automated GitHub Copilot review comments and inline line annotations (`gh api repos/:owner/:repo/pulls/<pr_number>/comments`). Triage actionable security, authorization/RLS, schema-conformity, input sanitization, and accessibility findings, address them directly on the feature branch, re-verify all quality gates, and confirm clean resolution before merging.
- Use repo-local skills under `.claude/skills/` (or the equivalent for your agent tool) as the software-factory workflow:
  - `council` — the Council review and Documenter close-out.
  - `feature-factory` — non-trivial feature planning and orchestration (idea → story → spec).
  - `build-with-tests` — implementation work.
  - `pr-review` — the mandatory pre-merge review gate.
- **Security-first discipline (non-negotiable):**
  - Never expose secrets, credentials, PII, payment details, or raw database/stack-trace errors in responses, logs, error messages, or committed files.
  - Enforce authorization at the data layer using PostgreSQL Row Level Security (RLS) in Supabase, keyed on user and owner identifiers — not only in application code. Application-layer-only authorization is a known regression path: one forgotten `WHERE owner_id = ...` clause anywhere leaks data across accounts.
  - Multi-tenant isolation: Scholars own their draft revisions and private files; institutions own their private inquiries and shortlists; public visitors may only access approved snapshots; admins review drafts.
  - **Any automated check that exists to enforce this — the RLS audit script (`npm run audit:rls`), a policy linter, a security test suite — must be verified to actually run against live state in CI, not just exist in the pipeline.** A check with an unmet precondition (no DB connection, a missing env var, `continue-on-error`, a silent early-return) that passes anyway is worse than no check, because it creates false confidence. When adding, reviewing, or auditing such a gate, prove it fails on a genuinely bad state before trusting that it guards anything.
  - Validate all external input at system boundaries. Never trust a client-supplied identifier for an authorization decision.
- **Documentation discipline:** README/CHANGELOG/docs are updated in the same change that needs them, not deferred. `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md` and roadmap-style docs are corrected to match reality every time the Documenter runs — stale status there is a bug, not a note to leave for later.
- **Testing discipline:**
  - *Creation:* new or changed behavior gets a test near the change, sized to the actual risk — a one-line config change doesn't need a new suite; an auth, money, or data-isolation change does.
  - *Execution:* run targeted tests first, then the full lint/test/build suite, before any handoff or PR.
  - *Evolution:* `test-verifier` and `implementation-validator` check tests and implementation against the approved story/brief. A critical finding routes back to the builder and both checks re-run. A red result is a stop condition — never something the Documenter is allowed to paper over or mark done anyway.

Update this file only through the same PR discipline it describes.
