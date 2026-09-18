# Contributing to FaithFull Scholars

Thank you for contributing to FaithFull Scholars! This document outlines our repository workflows, branching conventions, database migration standards, testing guidelines, and review protocols to maintain system integrity and security.

---

## 🌿 Git Workflow & Branching

We use a feature-branch workflow. All changes must be developed on a dedicated branch and verified before being merged into `main`.

### 1. Branch Naming Conventions
*   **Feature branches**: `feat/<phase-or-feature-name>`
*   **Bug fixes**: `fix/<issue-description>`
*   **Documentation updates**: `docs/<topic-name>`
*   **Refactoring**: `refactor/<component-name>`

### 2. Commit Message Guidelines
We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:
*   `feat: ...` for a new user-facing capability or API.
*   `fix: ...` for a bug fix.
*   `docs: ...` for documentation modifications.
*   `style: ...` for formatting or whitespace changes.
*   `refactor: ...` for internal restructuring with no behavior change.
*   `test: ...` for test additions or improvements.
*   `chore: ...` for build scripts, dependency bumps, or tool configurations.

*Example:* `feat(scholars): implement assisted CV onboarding draft parser`

---

## 🔒 Security & Data Isolation Discipline (Non-Negotiable)

1. **Row Level Security (RLS) Mandate**:
   - Every table in PostgreSQL must have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
   - Every exposed table must have explicit policies defined for public, scholar, institution, and admin roles.
   - Run `npm run audit:rls` to verify zero data-isolation leaks against live PostgreSQL.
2. **Multi-Tenant Isolation**:
   - Scholars own their draft revisions and private CV files.
   - Institutions own their saved shortlists and private inquiries.
   - Public visitors only see approved profile snapshots and public course showcases.
   - Admin moderation queues are strictly restricted to admin roles.
3. **No Secret Leaks**:
   - Never commit service keys, passwords, or raw database connection strings.

---

## 🗄️ Database & Migration Guidelines

Any schema changes must be migration-backed in `supabase/migrations/`:
1. Use local Supabase CLI or create timestamped SQL files:
   ```bash
   npx supabase migration new <migration_name>
   ```
2. Include both schema DDL and corresponding RLS policies in the same migration.
3. Verify migrations apply cleanly with `npx supabase db reset`.

---

## 🧪 Testing & Quality Verification

Before committing, merging, or opening a PR, the full verification suite must pass:
```bash
npm run verify
```
This runs:
1. `npm run version:check` — version consistency between `package.json` and `CHANGELOG.md`.
2. `npm run lint` — ESLint validation.
3. `npm run typecheck` — TypeScript compiler checks (`tsc --noEmit`).
4. `npm run test` — Vitest unit & integration test suites.
5. `npm run audit:rls` — PostgreSQL live data-isolation audit.
6. `npm run build` — Next.js production build verification.

A red result is a stop condition.

---

## 🏛️ Governance Gates

Per `improve-software.md` and `AGENTS.md`:
1. **The Council**: Runs before non-trivial merges (4 read-only audit agents + synthesis + Documenter sign-off).
2. **`pr-review` Gate**: The `pr-reviewer` agent must review the full branch diff before any PR opens.
