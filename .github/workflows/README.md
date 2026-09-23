# OLVYN CI/CD Pipeline Documentation

## 1. Overview & Purpose
This directory contains the GitHub Actions Continuous Integration (CI) configuration for **OLVYN**.

The pipeline serves as the first automated quality and security gate for the platform. It enforces type-safety, dependency security, schema correctness, algorithmic validation, and clean production builds before any code can be merged into production branches.

---

## 2. Pipeline Execution Triggers
The CI workflow (`.github/workflows/ci.yml`) automatically triggers on:
- **Pull Requests** targeting `main` or `master`.
- **Direct Pushes** to `main` or `master`.
- **Concurrency Control**: Subsequent pushes to the same open branch or pull request automatically cancel obsolete in-progress runs to conserve CI runner compute hours.

---

## 3. Workflow Stages & Exact Commands

| Stage # | Stage Name | Exact Command Executed | Purpose & Success Criteria |
|---|---|---|---|
| **1** | **Repository Checkout** | `actions/checkout@v4` | Checks out the branch commit with read-only permissions. |
| **2** | **Node.js Setup** | `actions/setup-node@v4` | Configures Node.js 20.x runtime and automatically caches the `~/.npm` directory based on `package-lock.json`. |
| **3** | **Clean Installation** | `npm ci` | Installs exact reproducible dependencies from `package-lock.json`. Fails if lockfile is out of sync. |
| **4** | **Security Audit** | `npm audit --audit-level=high` | Evaluates dependencies for high and critical CVEs. Logs warnings for upstream transitive advisories without corrupting the local tree. |
| **5** | **Prisma Validation** | `npx prisma validate` | Verifies the declarative Prisma schema syntax, models, enums, relations, and datasource configuration. |
| **—** | **Client Generation** | `npx prisma generate` | Generates `@prisma/client` types required for typechecking and compilation. |
| **6** | **TypeScript Typecheck** | `npx tsc --noEmit` | Validates strict TypeScript compilation across all 17 App Router routes, components, and server actions. Requires 0 errors. |
| **7** | **Automated Tests** | `npx tsx scripts/test-chunking.ts`<br>`npx tsx scripts/test-nova-routing.ts`<br>`npx tsx scripts/test-health.ts` | Runs 102 automated domain test assertions validating educational content chunking, token estimation, code fence preservation, Nova AI query intent classification, and health endpoint degradation handling. |
| **8** | **Production Build** | `npm run build` | Compiles optimized Next.js 15 production bundle, verifies page data collection, and validates static/dynamic route generation. |

---

## 4. What the CI Pipeline Intentionally Does NOT Do

To maintain security, database isolation, and deployment safety, this CI pipeline explicitly enforces the following guardrails:

1. **NO Production Database Connection**:
   - CI **never** connects to the live production Supabase PostgreSQL instance.
   - All build and test stages run with hermetic environment placeholders.
2. **NO Destructive Database Commands**:
   - `prisma db push` is **strictly prohibited** in CI.
   - `prisma migrate dev` is **strictly prohibited** in CI.
   - Automatic seeding is **strictly prohibited** in CI.
3. **NO Production Deployment (Continuous Delivery Disabled)**:
   - CD is decoupled from CI. Merging code verifies that it is deployable, but does not deploy automatically until a dedicated deployment pipeline with approval gates is activated.
4. **NO Secret Leakage**:
   - No `.env` files are committed or ingested.
   - No production API keys, service role keys, or database credentials are used or exposed in CI logs.

---

## 5. Security & Environment Variable Handling

During the build and validation steps, Next.js requires certain environment variables for configuration resolution. The CI workflow supplies **safe, dummy placeholders**:

```yaml
DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/ci_placeholder?pgbouncer=true"
DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/ci_placeholder"
AUTH_SECRET: "ci_dummy_auth_secret_minimum_32_characters_long_for_build"
NEXT_PUBLIC_APP_URL: "http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL: "https://ci-placeholder.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY: "ci-placeholder-anon-key"
SUPABASE_SERVICE_ROLE_KEY: "ci-placeholder-service-key"
GEMINI_API_KEY: "ci-placeholder-gemini-key"
```

### Known Transitive Dependency Advisories
`npm audit` currently reports 5 advisories (1 moderate, 4 high) originating from upstream packages:
- `postcss` (bundled inside `next` 15.2.0)
- `deepmerge-ts` (bundled inside `@prisma/config` via `prisma` 6.4.1)

Resolving these requires breaking major version bumps (`next@16`). The security step explicitly targets high/critical levels and surfaces actionable warnings while upstream releases non-breaking patches.

---

## 6. Future Continuous Deployment (CD) Connection Plan

When Continuous Delivery is implemented in the next phase, it will attach as a downstream job that runs **only after all CI checks pass**:

```
[Pull Request Merged into `main`]
                 ↓
  [CI Pipeline: Validate & Build] (Passing)
                 ↓
  [CD Pipeline: Production Deployment]
    Step 1: Run `npx prisma migrate deploy` via GitHub Secret `DIRECT_URL` (Port 5432)
    Step 2: Trigger Vercel / Cloud Run production deploy via Webhook or CLI
    Step 3: Run Post-Deploy Health Check against `GET /api/health`
    Step 4: Rollback deployment if health check returns non-200 within 60 seconds
```
