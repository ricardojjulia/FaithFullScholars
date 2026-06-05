# FaithFull Scholars Software Factory

## Purpose

The software factory is the operating model for turning product ideas into reviewable, testable, AI-executable work. It prevents the platform from becoming a collection of ad hoc features by requiring every meaningful change to pass through product framing, architecture review, implementation planning, verification, and closeout.

## Factory Principles

- Docs first for strategic and architectural work.
- Small implementation slices.
- One active branch per live implementation worker.
- Every feature has a spec, plan, tests, and closeout notes.
- Architecture decisions are captured as ADRs.
- AI-generated output must be reviewable by a human engineer.
- Public trust, privacy, and authorization are release gates, not cleanup tasks.
- Supabase schema, storage, and RLS changes must be migration-backed and tested.
- Vercel preview deployments are the default review environment for UI and workflow slices.

## Artifact Stack

```text
docs/product/master-plan.md
  Governing product vision, audiences, MVP boundaries, future ideas.

docs/architecture/architecture-review.md
  System shape, data model, security review, integration boundaries, risks.

docs/adr/*.md
  Durable architecture and product decisions.

docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
  Feature design package for one coherent slice.

docs/superpowers/plans/YYYY-MM-DD-<topic>.md
  Step-by-step execution plan with files, tests, commands, and commits.
```

## Roles

### Product Strategist

Owns product boundaries, user journeys, MVP scope, and prioritization.

Outputs:

- Product notes.
- Feature brief.
- Success criteria.
- Out-of-scope list.

### Architect

Owns system boundaries, data model, security posture, integration choices, and ADRs.

Outputs:

- Architecture review updates.
- ADRs.
- Data model notes.
- Risk register updates.

### Implementation Agent

Owns one execution-plan task at a time.

Outputs:

- Code changes.
- Tests.
- Migration or seed files when needed.
- Commit-ready diff.

### Test and Review Agent

Owns verification against the plan and product intent.

Outputs:

- Test results.
- Review findings.
- Security and authorization checks.
- Accessibility smoke-check notes.

### Release Manager

Owns closeout.

Outputs:

- Changelog entry.
- Roadmap status update.
- Known limitations.
- Next recommended slice.

## Workflow

### 1. Intake

Every meaningful product request starts with:

- Problem statement.
- Target user.
- Expected outcome.
- Explicit non-goals.
- Existing docs affected.

For this product, intake must ask whether the request affects:

- Scholar trust or verification.
- Public profile visibility.
- Institution outreach.
- CV or credential claims.
- Course content ownership.
- Theological tradition or denomination metadata.

### 2. Design Spec

Create or update a spec in `docs/superpowers/specs/`.

The spec must include:

- Goal.
- User journeys.
- Domain model changes.
- Permissions.
- Error and abuse handling.
- Testing strategy.
- Open decisions with selected defaults.

### 3. Architecture Review

Update `docs/architecture/architecture-review.md` when the change affects:

- Data boundaries.
- Authentication or authorization.
- Supabase RLS policies or storage policies.
- Public/private fields.
- Search behavior.
- External integrations.
- AI behavior.
- Admin review or verification.

Create an ADR when the decision should persist beyond one feature.

### 4. Execution Plan

Create a plan in `docs/superpowers/plans/`.

The plan must:

- Break work into small tasks.
- Name exact files to create or modify.
- Include tests before implementation where code exists.
- Include verification commands.
- Include commit boundaries.
- Avoid vague placeholders.

### 5. Implementation

Implementation agents must:

- Work from the plan.
- Keep diffs scoped.
- Preserve unrelated user changes.
- Add or update tests.
- Run relevant verification before handoff.

Branch rule:

- Use one live implementation worker per branch.
- Use branch names like `codex/profile-mvp-foundation`.
- Do not let multiple agents edit the same branch at the same time.

### 6. Verification

Before claiming completion:

- Run unit tests.
- Run integration tests for affected flows.
- Run lint and type checks when the stack exists.
- Verify public/private authorization boundaries.
- Verify Supabase RLS and Storage policies for affected records.
- Verify admin-only review actions.
- Verify profile visibility rules.
- Verify accessibility for major UI forms and profile pages.

### 7. Closeout

Every completed slice updates:

- The execution plan checklist.
- The product master plan if scope or status changed.
- The architecture review if system shape changed.
- ADRs if decisions changed.
- README if user-facing setup or entry points changed.

## Definition of Ready

A slice is ready for implementation when:

- It has one clear user outcome.
- Its non-goals are explicit.
- The data model is named.
- Permission boundaries are known.
- Tests are described.
- Dependencies and integrations are named.
- The plan names exact files and commands.

## Definition of Done

A slice is done when:

- Code is implemented.
- Tests pass.
- Lint and type checks pass where available.
- Authorization and visibility behavior are verified.
- Docs are updated.
- Known limitations are recorded.
- The next recommended slice is clear.

## Factory Guardrails for AI Agents

AI agents must not:

- Infer credentials, theological tradition, denominational affiliation, or availability without source data.
- Publish AI-generated profile text without scholar approval.
- Add payments, contracts, chat, or LMS features unless a new spec and ADR explicitly approve the scope.
- Treat admin approval as credential verification.
- Expose draft, private, rejected, or hidden profile data through public APIs.
- Put Supabase service-role keys in client-visible code or `NEXT_PUBLIC_` environment variables.
- Use user-editable Supabase metadata for authorization decisions.
- Store or proxy YouTube videos as if the platform owns them.

AI agents should:

- Prefer structured fields for search-critical data.
- Preserve audit history for review and moderation actions.
- Build coarse availability first.
- Keep inquiry workflows structured and rate-limited.
- Use external media links for MVP.
- Make trust state visible and conservative.
