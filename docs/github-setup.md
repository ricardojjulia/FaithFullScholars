# GitHub Setup & Required Secrets — FaithFull Scholars

This guide documents the environment setup, branch protection, and required secrets to run the CI/CD pipeline for the FaithFull Scholars repository.

## Required Secrets

Configure these secrets in GitHub under **Settings -> Secrets and variables -> Actions**:

| Secret | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (build-time Next.js configuration) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (build-time Next.js configuration) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-side service role key (restricted backend actions) |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI personal access token (deployments) |
| `SUPABASE_PROJECT_REF` | Production Supabase project reference |
| `STAGING_SUPABASE_PROJECT_REF` | Staging Supabase project reference |
| `DEPLOY_WEBHOOK_URL` | Slack/Discord webhook notification URL (optional) |
| `CRON_SECRET` | Secret token for authorized cron executions |

## GitHub Environments

Create two environments in your repository under **Settings -> Environments**:

1. **`staging`**:
   - Deployment branch: `main` only.
   - Secrets: `STAGING_SUPABASE_PROJECT_REF` and environment-specific settings.

2. **`production`**:
   - Deployment branches: no restriction (current setting). The release runbook dispatches from the reviewed PR branch so a migration is applied before its code merges; see `docs/deployment/vercel-supabase.md`.
   - Required reviewers: optional. The owner chose automatic approval for `production` (no required reviewer); enabling `@ricardojjulia` as reviewer adds a manual gate.
   - Secrets: `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, etc.

## Branch Protection

Configure branch protection rules for the `main` branch under **Settings -> Branches**:
- Require a pull request before merging.
- Require status checks to pass before merging:
  - `lint`
  - `typecheck`
  - `unit-tests`
  - `build`
- Require branches to be up to date before merging.
- Dismiss stale pull request approvals when new commits are pushed.
