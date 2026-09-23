# OLVYN — Production Continuous Deployment (CD) Architecture & Runbook

> **Author**: DevOps & SRE Team  
> **Target Environment**: Vercel (Edge & Serverless Node.js Runtime) + Supabase (PostgreSQL 15, Auth, Storage) + GitHub Actions (CI)  
> **Last Updated**: September 2026  
> **Status**: Production-Ready Deployment Foundation

---

## 1. Executive Summary & Architecture

OLVYN utilizes an enterprise-grade, decoupled Continuous Delivery architecture designed for zero-downtime releases, cryptographic session integrity, automated security gates, and resilient database connection pooling.

```
Developer Feature Branch
          ↓
  [Pull Request]
          ↓
  [GitHub Actions CI] (Quality & Security Gate)
    ├── npm ci & audit
    ├── npx prisma validate & generate
    ├── npx tsc --noEmit (Typecheck: 0 errors)
    ├── Automated Test Suites (141 isolated assertions)
    └── Next.js 15 Production Build Verification
          ↓
   [Merge to main]
          ↓
  [Vercel Git Integration] (Zero-Config CD)
    ├── Serverless & Edge Compilation
    ├── Atomic Immutable Deployment
    └── Production Domain Alias (e.g. olvyn.ai / olvyn.vercel.app)
          ↓
  [Post-Deploy Health Smoke Check]
    └── GET https://[DEPLOYMENT_URL]/api/health
          ├── HTTP 200 OK
          ├── application: "ok"
          └── database: "ok" (Supabase PostgreSQL SELECT 1 probe)
```

### Responsibility Matrix

| Infrastructure Layer | Technology | Ownership & Responsibility |
|---|---|---|
| **Edge & Web Compute** | Vercel | Next.js 15 App Router, Edge Middleware, Static Asset CDN, Serverless Functions. |
| **Relational Database** | Supabase PostgreSQL | Managed PostgreSQL, pgvector extension, Supavisor connection pooling. |
| **Object Storage** | Supabase Storage | Educational file assets, curriculum PDFs, video media storage. |
| **Authentication Provider** | Supabase Auth + jose | Google OAuth (PKCE flow) and native encrypted JWT session cookies. |
| **Data Schema & ORM** | Prisma ORM (v6) | Declarative schema, client generation, deterministic migration tracking. |
| **Continuous Integration** | GitHub Actions | Automated security audit, type checking, schema validation, isolated unit tests. |

---

## 2. Vercel Configuration & Integration Strategy

### Zero-Config Architecture Decision
Vercel is the creator and canonical platform for Next.js. Next.js 15 App Router applications are natively zero-config on Vercel:
- **Build Command**: Automatically detects `npm run build` (`next build`).
- **Output Directory**: Automatically maps `.next`.
- **Edge Middleware**: Next.js `src/middleware.ts` automatically compiles and executes across Vercel’s global Edge network.
- **Headers & Caching**: Cache policies defined in `next.config.mjs` (such as immutable asset caching for `/logo.jpg`) are natively honored.
- **Decision**: A manual `vercel.json` is **not required** and intentionally omitted to prevent brittle configuration drift and conflicting build overrides.

### Vercel Git Integration
To avoid the race conditions and competing deployment triggers that occur when both a GitHub Action and Vercel CLI deploy simultaneously, OLVYN uses **Native Vercel Git Integration**:
1. Connect the GitHub repository in the Vercel Dashboard (`Import Project`).
2. Framework Preset: `Next.js`.
3. Root Directory: `./`.
4. Production Branch: `main` (or `master`).
5. Configure Production Environment Variables as specified in Section 4.

---

## 3. Supabase Configuration

### Connection Topologies
Supabase provides two distinct connection endpoints that must be configured:

1. **Transaction Pooler (Supavisor — Port 6543)**:
   - Form: `postgresql://postgres.[REF]:[PASS]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Use Case: Serverless Next.js API routes and server actions (`DATABASE_URL`).
   - Advantage: Prevents PostgreSQL connection exhaustion when serverless lambdas scale out rapidly.

2. **Direct / Session Connection (Port 5432)**:
   - Form: `postgresql://postgres.[REF]:[PASS]@[REGION].pooler.supabase.com:5432/postgres` (or `db.[REF].supabase.co:5432`)
   - Use Case: Prisma CLI migrations (`DIRECT_URL`).
   - Advantage: Direct TCP session required for DDL schema migrations, transaction-level advisory locks, and enum alterations.

---

## 4. Production Environment Variable Contract

Every production environment must have the following variables explicitly configured in the **Vercel Project Settings ➔ Environment Variables**.

> [!CAUTION]
> **STRICT SECURITY RULES**:
> - NEVER put real production secrets into source control or documentation.
> - NEVER commit `.env`, `.env.local`, or `.env.production`.
> - NEVER expose `SUPABASE_SERVICE_ROLE_KEY` or `AUTH_SECRET` to client-side code (no `NEXT_PUBLIC_` prefix).

### A. Server-Only Secrets (Never Exposed to Browser)

| Environment Variable | Required | Minimum Security Constraint | Description |
|---|:---:|---|---|
| `DATABASE_URL` | **Yes** | Valid PostgreSQL URL with Port 6543 and `?pgbouncer=true` | Transaction-pooled connection string used by runtime Prisma Client. |
| `DIRECT_URL` | **Yes** | Valid PostgreSQL URL with Port 5432 | Direct session connection string used by Prisma migration engine (`prisma migrate deploy`). |
| `AUTH_SECRET` | **Yes** | Minimum **32 characters**, high-entropy cryptographic string | Secret key for signing and verifying application session JWTs. Fails closed if missing in production. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | High-entropy Supabase service role JWT | Privileged server-side key for storage bucket administration and secure backend uploads. |
| `GEMINI_API_KEY` | **Yes** | Valid Google AI Studio / Gemini API key | Powers Nova AI grounded learning assistant and curriculum embeddings. |
| `ADMIN_EMAIL` | **Yes** | Valid email address | Canonical permanent platform administrator identity. |
| `ADMIN_PASSWORD` | **Yes** | Minimum 12 characters, complex password | Default initial password for administrative initialization fallback. |
| `GEMINI_EMBEDDING_MODEL` | No | Default: `gemini-embedding-2` | Embedding model identifier for RAG indexing. |
| `GEMINI_EMBEDDING_DIMENSIONS` | No | Default: `768` | Vector dimension size for pgvector embeddings. |

### B. Public Variables (Safe for Browser Bundle)

| Environment Variable | Required | Example Format | Description |
|---|:---:|---|---|
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://olvyn.ai` or `https://olvyn.vercel.app` | Canonical public origin used for OAuth redirect validation and cookie security rules. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | `https://[REF].supabase.co` | Public Supabase HTTPS endpoint for client-side Auth and storage links. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Public anonymous JWT string | Browser-safe Supabase public key for client-side session hydration. |

---

## 5. Production Database Migration Process

### Deterministic Migration Command
In production, schema changes must be applied strictly using:

```bash
npx prisma migrate deploy
```

> [!WARNING]
> **PROHIBITED COMMANDS IN PRODUCTION**:
> - `npx prisma db push` — **STRICTLY PROHIBITED** (bypasses migration history and risks unrecoverable data loss).
> - `npx prisma migrate dev` — **STRICTLY PROHIBITED** (prompts interactively and creates new migration files).
> - `npx prisma migrate reset` — **STRICTLY PROHIBITED** (drops and deletes the entire database).

### Migration Execution Procedure
1. Verify current migration sync state against the database:
   ```bash
   npx prisma migrate status
   ```
2. Apply pending migrations using the direct port 5432 connection (`DIRECT_URL`):
   ```bash
   npx prisma migrate deploy
   ```
3. Verify that all migrations report `Database schema is up to date!`.

---

## 6. GitHub Configuration & CI Quality Gate

### Branch Protection Rules on `main` / `master`
To ensure unverified code never reaches production:
1. Navigate to **GitHub Repository ➔ Settings ➔ Branches ➔ Branch protection rules**.
2. Target branch: `main` (or `master`).
3. Enable **Require a pull request before merging**.
4. Enable **Require status checks to pass before merging**:
   - Check required: `validate-and-build` (the GitHub Actions CI job).
5. Enable **Require branches to be up to date before merging**.
6. Enable **Do not allow bypassing the above settings**.

### CI Pipeline Verification Summary
Every Pull Request automatically executes `.github/workflows/ci.yml`:
1. `npm ci` (reproducible dependency tree)
2. `npm audit --audit-level=high` (vulnerability audit)
3. `npx prisma validate` & `npx prisma generate` (schema integrity)
4. `npx tsc --noEmit` (strict TypeScript validation, 0 errors allowed)
5. Automated test suites (306 total assertions):
   - `scripts/test-chunking.ts`
   - `scripts/test-nova-routing.ts`
   - `scripts/test-health.ts`
   - `scripts/test-auth-security.ts`
6. `npm run build` (Next.js production build verification)

---

## 7. Post-Deployment Verification & Health Smoke Test

Once Vercel finishes deploying to production, execute the automated smoke test:

```bash
npx tsx scripts/smoke-health.ts https://[YOUR_PRODUCTION_DOMAIN]
```

### Health Check Verification Contract
The smoke test queries `GET /api/health` and verifies:
1. **HTTP Status**: Exactly `200 OK`.
2. **Payload Top-Level**: `status === "ok"`.
3. **Application Subsystem**: `checks.application === "ok"`.
4. **Database Subsystem**: `checks.database === "ok"` (verified via live non-destructive `SELECT 1` probe with a 3000ms timeout).
5. **Payload Safety**: Confirms zero leaking of secrets, connection strings, or internal paths.

### Handling a Degraded Health Check (HTTP 503)
If `/api/health` returns `503 Service Unavailable`:
- The database probe failed or timed out.
- The smoke test outputs a clear failure report and exits with code `1`.
- Follow the Rollback Procedure in Section 8 immediately.

---

## 8. Rollback Strategy & Schema Safety

### A. Application Rollback (Instant)
Because Vercel creates immutable, atomic deployments for every commit:
1. Open the **Vercel Dashboard ➔ Deployments**.
2. Locate the previously healthy production deployment.
3. Click the three dots `...` ➔ Select **Rollback to this Deployment** (or **Promote to Production**).
4. Vercel instantly points traffic to the previous healthy bundle in < 2 seconds.

### B. Database Schema Evolution: Expand / Contract Pattern
Prisma ORM does **not** support automated rollback of arbitrary SQL migrations. To guarantee safe zero-downtime database changes:
1. **Phase 1 (Expand)**: Add new nullable columns, new tables, or new enums. Deploy application code that reads new fields while continuing to write old fields if needed.
2. **Phase 2 (Migrate Data)**: Backfill data in the background without locking tables.
3. **Phase 3 (Contract)**: Deploy application code that exclusively uses the new schema. In a subsequent migration, safely remove deprecated columns or tables.

> [!IMPORTANT]
> Never write destructive migrations (e.g. `DROP COLUMN`, `RENAME COLUMN`) in the same release as application code changes that depend on them.

---

## 9. First Production Deployment Checklist

Before triggering the first production release:

- [ ] **Supabase PostgreSQL Provisioned**: Ensure database is active in target region.
- [ ] **Supabase Storage Buckets Created**: Ensure storage is configured and accessible.
- [ ] **Prisma Migrations Applied**: Run `npx prisma migrate deploy` using `DIRECT_URL`.
- [ ] **Vercel Project Connected**: GitHub repository imported into Vercel with Next.js preset.
- [ ] **Environment Variables Configured**: All 11 variables from Section 4 configured in Vercel settings.
- [ ] **AUTH_SECRET Generated**: High-entropy 32+ character string configured in Vercel.
- [ ] **GitHub Branch Protection Enabled**: `main` protected, requiring `validate-and-build` CI job.
- [ ] **Production Health Checked**: `npx tsx scripts/smoke-health.ts https://[DEPLOYMENT_URL]` passes with HTTP 200.
