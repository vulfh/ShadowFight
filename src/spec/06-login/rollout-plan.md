# Rollout Plan — SFT-DEV → SFT (Continuous Deployment)

## Overview

This document describes how to run a continuous, repeatable pipeline from local development through the **SFT-DEV** Supabase environment to the **SFT** production environment. The goal is that every merged change to `main` automatically lands in production after passing the gate stages, with zero manual steps beyond reviewing a pull request.

---

## Environment Summary

| Environment | Supabase Project | Purpose | URL |
|---|---|---|---|
| **Local** | SFT-DEV | Developer machine, hot-reload | `http://localhost:5173` |
| **Staging / Preview** | SFT-DEV | PR preview, QA testing | Auto-generated per PR (e.g. Netlify/Vercel) |
| **Production** | SFT | Live users | Your production domain |

The only thing that changes between environments is the pair of Vite env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Vite selects the correct `.env` file at build time — no code branching ever.

---

## The Pipeline

```
Developer laptop
  │  git push → feature branch
  │
  ├── GitHub Pull Request
  │     ├── CI: lint + type-check + unit tests       (automatic)
  │     ├── Preview deploy → SFT-DEV Supabase         (automatic)
  │     └── Manual review / QA on preview URL
  │
  └── Merge to main
        ├── CI: lint + type-check + unit tests       (automatic)
        ├── DB migration → SFT-DEV (smoke-test)      (automatic)
        ├── Build with production env vars            (automatic)
        ├── DB migration → SFT (production)          (automatic)
        └── Deploy built bundle → production host    (automatic)
```

---

## Stage 1: Local Development

Everything points at **SFT-DEV**.

```
# .env.development  (gitignored — never committed)
VITE_SUPABASE_URL=https://<sft-dev-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<sft-dev-anon-key>
```

Run locally:
```bash
npm run dev          # vite picks up .env.development automatically
npm run type-check   # fast type safety check
npm run test:run     # vitest single-pass
```

The Supabase CLI is used to apply migrations to SFT-DEV during local development:
```bash
supabase db push --db-url <sft-dev-db-url>
```

---

## Stage 2: Pull Request — CI Gate + Preview Deploy

Every pull request triggers two things automatically:

### 2a. CI Gate (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:run
```

The CI job uses **no Supabase credentials** — unit tests are isolated (mock the `IAuthProvider` and `IUserRepository` interfaces defined in the design). The build step is not included in CI — it runs only on merge to `main`.

### 2b. Preview Deploy (Netlify or Vercel)

Connect the repository to Netlify or Vercel. Configure the preview environment to use **SFT-DEV** credentials:

```
# In Netlify/Vercel environment variable settings (not committed):
VITE_SUPABASE_URL     = <sft-dev-project-url>
VITE_SUPABASE_ANON_KEY = <sft-dev-anon-key>
```

Each PR gets a unique preview URL (e.g. `https://pr-42--shadowfight.netlify.app`). QA and the reviewer test against SFT-DEV on this URL before approving the PR.

**No DB migrations run automatically on preview deploys.** Migrations are applied manually to SFT-DEV during development with `supabase db push`. The preview deploy just builds and hosts the frontend bundle.

---

## Stage 3: Merge to `main` — Production Pipeline

When a PR is merged to `main`, the production pipeline runs:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production      # GitHub environment — requires approval if configured
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      # ── Gate: must pass before any deploy ─────────────────────────────────
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:run

      # ── Apply DB migration to SFT-DEV first (smoke-test) ─────────────────
      - name: Migrate SFT-DEV
        run: npx supabase db push --db-url ${{ secrets.SFT_DEV_DB_URL }}

      # ── Apply DB migration to SFT (production) ────────────────────────────
      - name: Migrate SFT (production)
        run: npx supabase db push --db-url ${{ secrets.SFT_DB_URL }}

      # ── Build with production env vars ────────────────────────────────────
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SFT_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SFT_SUPABASE_ANON_KEY }}

      # ── Deploy built dist/ to production host ─────────────────────────────
      - name: Deploy
        uses: netlify/actions/cli@master        # or vercel/action, or any host
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

### GitHub Secrets Required

| Secret | Contains |
|---|---|
| `SFT_DEV_DB_URL` | Supabase direct DB connection string for SFT-DEV |
| `SFT_DB_URL` | Supabase direct DB connection string for SFT |
| `SFT_SUPABASE_URL` | Production Supabase project URL (for Vite build) |
| `SFT_SUPABASE_ANON_KEY` | Production anon key (for Vite build) |
| `NETLIFY_SITE_ID` | Netlify site ID |
| `NETLIFY_AUTH_TOKEN` | Netlify deploy token |

---

## Database Migration Strategy

### Migrations are code — committed and version-controlled

Every schema change is a new timestamped SQL file in `supabase/migrations/`:

```
supabase/
  migrations/
    20261021120000_create_users_roles_permissions.sql   ← Feature 06
    20261105093000_add_fight_list_ownership.sql         ← Future feature
  seed.sql
```

### Migration ordering and idempotency

- Migrations run in **timestamp order** — always additive, never destructive.
- Every migration uses `CREATE TABLE IF NOT EXISTS`, `INSERT ... ON CONFLICT DO NOTHING`, etc., so running the same migration twice is safe.
- Dropping or renaming a column is a **new migration file**, never an edit to an existing one.

### The SFT-DEV smoke-test step

The pipeline applies the migration to **SFT-DEV first**. If the migration fails on SFT-DEV, the pipeline stops before touching production. This catches issues like:
- SQL syntax errors
- Constraint violations against existing SFT-DEV data
- Missing referenced tables

Only after SFT-DEV migration succeeds does the pipeline continue to SFT.

---

## Continuous Process — Day-to-Day Flow

```
1. Create feature branch from main
         git checkout -b feature/07-share-fight-list

2. Develop locally against SFT-DEV
         npm run dev
         (write code, write tests, add migration file if needed)
         supabase db push --db-url <sft-dev-db-url>   ← apply schema changes locally

3. Open Pull Request
         → CI runs: lint + type-check + tests
         → Preview deploy builds against SFT-DEV
         → QA reviews on preview URL

4. PR approved → merge to main
         → CI gate runs again
         → Migration applied to SFT-DEV (smoke-test)
         → Migration applied to SFT (production)
         → Vite builds with SFT production env vars
         → Built dist/ deployed to production host

5. Done — production is updated
```

---

## Rollback Strategy

Because migrations are additive and the frontend is a static bundle:

| What broke | Rollback action |
|---|---|
| **Frontend bug** | Redeploy previous bundle from Netlify/Vercel deploy history (one click) |
| **Migration caused DB issue** | Write a new migration that reverts the change (e.g. `DROP COLUMN IF EXISTS`) — never edit the original migration |
| **Bad release on SFT** | Revert the merge commit on `main` → pipeline re-runs → previous bundle re-deployed + rollback migration applied |

---

## Prerequisites Checklist

Before the pipeline is active, the following one-time setup is needed:

- [ ] Create `.env.development` and `.env.production` locally (gitignored).
- [ ] Add `.env.development` and `.env.production` to `.gitignore` (not yet present — current `.gitignore` only covers `.env` variants with `.local` suffix).
- [ ] Add all GitHub Secrets listed above to the repository settings.
- [ ] Connect the repository to Netlify/Vercel and configure SFT-DEV env vars for preview deploys.
- [ ] Enable Google OAuth provider in both SFT-DEV and SFT Supabase projects (Auth → Providers → Google), with the correct redirect URLs for each environment.
- [ ] Apply the initial migration (`20261021120000_create_users_roles_permissions.sql`) manually to SFT-DEV and SFT to bootstrap the schema before the first automated pipeline run.
- [ ] Install Supabase CLI: `npm install --save-dev supabase` (or global install).
- [ ] Add `npm run migrate:dev` and `npm run migrate:prod` convenience scripts to `package.json`:

```json
"scripts": {
  "migrate:dev":  "supabase db push --db-url $SFT_DEV_DB_URL",
  "migrate:prod": "supabase db push --db-url $SFT_DB_URL"
}
```
