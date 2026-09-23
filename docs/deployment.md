# OLVYN — Production Deployment Runbook

> **Author**: DevOps & SRE Team  
> **Target Environment**: Render (Node.js Web Service) + Supabase (PostgreSQL 15, Auth, Storage) + GitHub Actions (CI)  
> **Last Updated**: September 2026  
> **Status**: Production-Ready

---

## 1. Architecture Overview

```
Local Development
       ↓
   [Git Push]
       ↓
   [GitHub — Manojgowda12/Olvyn — branch: master]
       ↓
   [GitHub Actions CI] (Quality & Security Gate)
     ├── npm ci & audit
     ├── npx prisma validate & generate
     ├── npx tsc --noEmit (TypeScript: 0 errors)
     ├── Automated Test Suites (306 isolated assertions)
     └── Next.js 15 Production Build Verification
       ↓
   [Render Web Service] (Auto-Deploy on push)
     ├── npm ci
     ├── npx prisma generate
     ├── npm run build (next build)
     └── npm start (next start — listens on $PORT)
       ↓
   [Supabase PostgreSQL]
   [Supabase Auth]
   [Supabase Storage]
       ↓
   [Production OLVYN]
     └── GET /api/health → 200 OK
```

### Responsibility Matrix

| Infrastructure Layer | Technology | Responsibility |
|---|---|---|
| **Web Compute** | Render Web Service | Next.js 15 App Router, API routes, server-side rendering |
| **Relational Database** | Supabase PostgreSQL | Managed PostgreSQL, pgvector, Supavisor connection pooling |
| **Object Storage** | Supabase Storage | Educational file assets, curriculum PDFs, media |
| **Authentication** | Supabase Auth + jose JWT | Google OAuth (PKCE) + native encrypted JWT session cookies |
| **ORM** | Prisma v6 | Declarative schema, client generation, deterministic migrations |
| **Continuous Integration** | GitHub Actions | Security audit, type checking, schema validation, isolated tests |

---

## 2. Render Web Service Configuration

### Service Settings

| Setting | Value |
|---|---|
| **Service Type** | Web Service |
| **Environment** | Node |
| **Region** | Choose closest to Supabase project region |
| **Branch** | `master` |
| **Root Directory** | `./` |
| **Node Version** | `20` |
| **Build Command** | `npm ci && npx prisma generate && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

> [!IMPORTANT]
> **Why `npm start`?** The `package.json` `start` script runs `next start`, which automatically respects the `PORT` environment variable injected by Render. Do NOT use `node server.js` — there is no custom server.

> [!NOTE]
> Render automatically sets the `PORT` environment variable. Next.js 15 `next start` reads `$PORT` and binds to it by default.

### Auto-Deploy

Connect the GitHub repository `Manojgowda12/Olvyn` to the Render service. Render will automatically redeploy on every push to the `master` branch after CI passes (configure the auto-deploy trigger in Render settings).

---

## 3. Environment Variables

Configure ALL variables below in **Render Dashboard → Your Service → Environment**.

> [!CAUTION]
> **STRICT SECURITY RULES**:
> - NEVER put real credentials into source control.
> - NEVER commit `.env`, `.env.local`, or `.env.production`.
> - NEVER use `NEXT_PUBLIC_` prefix for `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, `GEMINI_API_KEY`, or any secret.

### A. Server-Only Secrets (Never Exposed to Browser)

| Variable | Required | Minimum Constraint | Purpose |
|---|:---:|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL URL — port **6543**, `?pgbouncer=true` | Runtime Prisma Client (transaction pooler) |
| `DIRECT_URL` | ✅ | PostgreSQL URL — port **5432** | Prisma migration engine only |
| `AUTH_SECRET` | ✅ | **≥ 32 characters**, high-entropy | JWT session signing — fails closed if missing/short in production |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role JWT | Server-side storage admin, secure backend ops |
| `GEMINI_API_KEY` | ✅ | Valid Google AI Studio key | Nova AI assistant + RAG embeddings |
| `ADMIN_EMAIL` | Optional | Valid email | Platform admin identity (fallback: `admin@openlearner.ai`) |
| `ADMIN_PASSWORD` | Optional | ≥ 12 chars, complex | Admin initialization fallback password |
| `GEMINI_EMBEDDING_MODEL` | Optional | String | Embedding model ID (default: `gemini-embedding-2`) |
| `GEMINI_EMBEDDING_DIMENSIONS` | Optional | Integer string | pgvector dimensions (default: `768`) |

### B. Public Variables (Safe for Browser Bundle)

| Variable | Required | Example | Purpose |
|---|:---:|---|---|
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://olvyn.onrender.com` | Canonical origin — controls cookie `Secure` flag |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://[REF].supabase.co` | Supabase HTTPS endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon JWT | Client-side Supabase Auth session hydration |

> [!WARNING]
> Set `NEXT_PUBLIC_APP_URL` to your actual Render URL (e.g. `https://olvyn.onrender.com`). This variable controls whether session cookies use the `Secure` flag. If set to a localhost URL in production, cookies will NOT be secure.

### Generating AUTH_SECRET

```bash
# Generate a secure 64-character random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Supabase Configuration

### Database Connection Topology

Supabase provides two connection endpoints. Both are required:

**1. Transaction Pooler (Supavisor — Port 6543)** → `DATABASE_URL`
```
postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```
Use Case: Runtime Prisma Client (all API routes, server components).

**2. Direct Session Connection (Port 5432)** → `DIRECT_URL`
```
postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```
Use Case: Prisma migration engine (`prisma migrate deploy`). DDL operations require direct TCP.

### Required Supabase Auth Dashboard Settings

In **Supabase Dashboard → Authentication → URL Configuration**:

| Setting | Value |
|---|---|
| **Site URL** | `https://olvyn.onrender.com` (your Render URL) |
| **Additional Redirect URLs** | `https://olvyn.onrender.com/auth/callback` |

> [!IMPORTANT]
> The redirect URL must exactly match what the OAuth callback receives. The application derives `origin` dynamically from `request.url` — it does NOT use hardcoded localhost in production.

### Google Cloud OAuth Configuration

In **Google Cloud Console → APIs & Services → Credentials → Your OAuth 2.0 Client**:

Add the following **Authorized redirect URI** (this is Supabase's callback — NOT the OLVYN app URL):
```
https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
```

The full OAuth flow:
```
OLVYN /api/auth/google
  → supabase.auth.signInWithOAuth(redirectTo: https://olvyn.onrender.com/auth/callback)
  → Google (redirects to Supabase)
  → Supabase /auth/v1/callback (exchanges code, redirects to OLVYN)
  → OLVYN /auth/callback (exchanges Supabase code for session, sets cookies)
  → Application dashboard
```

---

## 5. Database Migration Procedure

### Production Migration Command

```bash
npx prisma migrate deploy
```

> [!WARNING]
> **PROHIBITED IN PRODUCTION:**
> - `prisma db push` — bypasses migration history, risks data loss
> - `prisma migrate dev` — interactive, creates new migration files
> - `prisma migrate reset` — **DROPS AND DESTROYS THE DATABASE**

### Current Migrations (as of September 2026)

| Migration | Status |
|---|---|
| `20260910000000_initial_schema` | Applied |
| `20260916000000_production_postgresql_schema` | Applied |
| `20260918000000_add_rag_document_models` | Applied |
| `20260919000000_add_supabase_auth_and_user_memory` | Applied |

### Running Migrations Against Production Supabase

```bash
# Set env vars locally pointing at production Supabase
export DATABASE_URL="..."
export DIRECT_URL="postgresql://postgres.[REF]:[PASS]@...supabase.com:5432/postgres"

# Check migration status first (non-destructive)
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy
```

> [!NOTE]
> The Render build command does NOT run `prisma migrate deploy` — migrations must be applied manually or via a separate Render pre-deploy job before the first deployment.

---

## 6. GitHub Actions CI

The CI pipeline (`.github/workflows/ci.yml`) runs on every push to `master` and on pull requests targeting `master`.

**Pipeline Steps:**
1. `npm ci` — reproducible dependency install
2. `npm audit --audit-level=high` — vulnerability audit
3. `npx prisma validate` + `npx prisma generate` — schema integrity
4. `npx tsc --noEmit` — TypeScript strict validation (0 errors)
5. Automated test suites (306 assertions):
   - `scripts/test-chunking.ts`
   - `scripts/test-nova-routing.ts`
   - `scripts/test-health.ts`
   - `scripts/test-auth-security.ts`
6. `npm run build` — Next.js production build verification

**CI uses placeholder secrets only** — it does NOT connect to production Supabase or modify the database.

---

## 7. Health Check

```
GET /api/health
```

**Healthy:** HTTP `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-09-23T...",
  "version": "0.1.0",
  "uptime": 42,
  "checks": {
    "application": "ok",
    "database": "ok"
  }
}
```

**Degraded:** HTTP `503 Service Unavailable`
```json
{ "checks": { "database": "unhealthy" } }
```

The endpoint is **unauthenticated**, performs a non-destructive `SELECT 1` with a 3-second timeout, and exposes no secrets.

### Post-Deployment Smoke Test

```bash
npx tsx scripts/smoke-health.ts https://olvyn.onrender.com
```

---

## 8. First Production Deployment Checklist

- [ ] Supabase PostgreSQL project provisioned and accessible
- [ ] Supabase Storage bucket `course-assets` created
- [ ] `npx prisma migrate deploy` run against production database (using `DIRECT_URL`)
- [ ] GitHub repository `Manojgowda12/Olvyn` connected to Render service
- [ ] All environment variables configured in Render (Section 3)
- [ ] `AUTH_SECRET` is a high-entropy string ≥ 32 characters
- [ ] `NEXT_PUBLIC_APP_URL` set to actual Render URL (NOT localhost)
- [ ] Supabase Auth: Site URL and Redirect URL configured (Section 4)
- [ ] Google Cloud Console: Supabase redirect URI added (Section 4)
- [ ] Render build succeeds and `/api/health` returns `200 OK`
- [ ] Google OAuth tested end-to-end in production browser

---

## 9. Rollback Procedure

### Application Rollback

Render keeps a deployment history. To roll back:

1. Go to **Render Dashboard → Your Service → Deploys**
2. Find the previous healthy deployment
3. Click **Rollback to this deploy**

Render atomically re-points traffic in seconds.

### Database Rollback

Prisma does NOT support automatic migration rollback. Follow the **Expand/Contract pattern**:

1. **Expand**: Add new nullable columns/tables. Deploy code that supports both old and new schema.
2. **Migrate**: Backfill data with no table locks.
3. **Contract**: In a subsequent release, remove deprecated schema with a new migration.

> [!CAUTION]
> Never write destructive migrations (`DROP COLUMN`, `DROP TABLE`) in the same commit as code that depends on them.

---

## 10. Troubleshooting

| Symptom | Likely Cause | Action |
|---|---|---|
| `/api/health` returns 503 | Database unreachable | Verify `DATABASE_URL`, check Supabase status |
| Google OAuth redirects to login with error | Supabase redirect URL mismatch | Verify Site URL + Redirect URL in Supabase Dashboard |
| `AUTH_SECRET is not configured in production` | Missing `AUTH_SECRET` in Render env | Add `AUTH_SECRET` in Render environment settings |
| Prisma client not found | `prisma generate` not in build command | Verify build command includes `npx prisma generate` |
| Build fails: TypeScript errors | Uncommitted type regression | Run `npx tsc --noEmit` locally and fix errors before pushing |
| Session lost on page refresh | `NEXT_PUBLIC_APP_URL` set to localhost in production | Update `NEXT_PUBLIC_APP_URL` to production Render URL |
| Cookies not set (secure=false in prod) | `NEXT_PUBLIC_APP_URL` includes `localhost` | Set `NEXT_PUBLIC_APP_URL` to the actual production HTTPS URL |
