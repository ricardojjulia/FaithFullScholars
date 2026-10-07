# FaithFull Scholars Documentation

This is the documentation hub for **FaithFull Scholars**, a trusted professional network for theological and biblical higher education.

> **Reading order for AI workers and implementation agents:** [`AGENTS.md`](../AGENTS.md), then the [Master Plan](FAITHFULL_SCHOLARS_FULL_PLAN.md), then [`improve-software.md`](../improve-software.md), then the [Agent Ingestion Brief](factory/agent-ingestion-brief.md).

---

## Quick Navigation

### Core Developer & Operational Guides
- [Repository README](../README.md): platform overview, diagrams and tech stack
- [HOWTO](../HOWTO.md): local development, environment, test personas and commands
- [VERSIONING](../VERSIONING.md): semantic versioning policy and release lifecycle
- [CONTRIBUTING](../CONTRIBUTING.md): branching, commits, migrations and the review workflow
- [SECURITY](../SECURITY.md): vulnerability reporting and data-isolation invariants
- [SUPPORT](../SUPPORT.md): how to file issues and feature requests
- [CHECK_IN_POLICY](../CHECK_IN_POLICY.md): what may and may not be committed

---

## Architecture & System Design

- [`architecture.md`](architecture.md): topology, request lifecycle, trust boundaries, data model and directory layout, with diagrams
- [`architecture/architecture-review.md`](architecture/architecture-review.md): the original architecture review
- [`FAITHFULL_SCHOLARS_FULL_PLAN.md`](FAITHFULL_SCHOLARS_FULL_PLAN.md): master roadmap and architecture source of truth
- [`feature-catalog.md`](feature-catalog.md): what each phase built, verification history and the known-broken list

---

## Product (`docs/product/`)

- [`master-plan.md`](product/master-plan.md): the product master plan
- [`roadmap.md`](product/roadmap.md): phases, exit criteria and current position
- [`MVP_AND_COMPETITIVE_STATUS.md`](product/MVP_AND_COMPETITIVE_STATUS.md): MVP completeness and competitive position
- [`superpowers/specs/`](superpowers/specs/): feature specs and approved stories
- [`superpowers/plans/`](superpowers/plans/): execution plans

---

## Architecture Decision Records (`docs/adr/`)

- [`adr/README.md`](adr/README.md): the decision log index, with every ADR from 0001 onward
- Security baseline: [ADR 0022](adr/0022-session-derived-identity-and-rls-helper-isolation.md) (session-derived identity and RLS helper isolation) and [ADR 0023](adr/0023-trust-guards-phase2-and-policy-matrix.md) (trust guards and the policy matrix)

---

## Deployment (`docs/deployment/`)

- [`vercel-supabase.md`](deployment/vercel-supabase.md): Vercel and Supabase deployment
- [`staging-verification-protocol.md`](deployment/staging-verification-protocol.md): remote staging and production verification gates
- [`release-readiness-checklist.md`](deployment/release-readiness-checklist.md): pre-release checklist
- [`github-setup.md`](github-setup.md): repository rulesets, required checks and CI setup

---

## Testing (`docs/testing/`)

- [`TESTING_GUIDELINES.md`](testing/TESTING_GUIDELINES.md): test strategy, real-role RLS tests and E2E personas
- [`test-surface.md`](testing/test-surface.md): the test-surface gate and how exemptions work

---

## Software Factory & Council (`docs/factory/`, `docs/reviews/`)

- [`factory/software-factory.md`](factory/software-factory.md): the agent workflow from idea to merge
- [`factory/review-personas.md`](factory/review-personas.md): the Council seats and domain personas
- [`factory/agent-ingestion-brief.md`](factory/agent-ingestion-brief.md): briefing for new agents
- [`factory/daily-scheduler-protocol.md`](factory/daily-scheduler-protocol.md): scheduled factory runs
- [`reviews/`](reviews/): Council syntheses, per-agent reports and [run reports](reviews/run-reports/)

---

## Playbooks (`docs/playbooks/`)

- [`pilot-feedback-error-triage.md`](playbooks/pilot-feedback-error-triage.md): pilot feedback and automatic error triage
