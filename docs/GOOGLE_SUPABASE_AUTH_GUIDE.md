# OpenLearnerAI: Google Auth & Supabase Auth Configuration Guide

This guide documents the complete setup process for Google OAuth via Supabase Auth for OpenLearnerAI across both local development and production deployments (Vercel, Render).

---

## Architecture Overview

```
User Click "Continue with Google"
                ↓
Supabase Auth OAuth Initiation (/api/auth/google)
                ↓
Google OAuth Consent Screen
                ↓
Supabase Auth Callback (https://<PROJECT-REF>.supabase.co/auth/v1/callback)
                ↓
Application Callback (/auth/callback?code=...)
                ↓
Supabase SSR PKCE Code Exchange (cookies set)
                ↓
OpenLearnerAI User Resolution (authUserId mapped, default role LEARNER)
                ↓
Authenticated Redirect (/dashboard or requested path)
```

---

## 1. Google Cloud Console Configuration

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create your project (e.g., `openlearner-ai`).
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   - **User Type**: External
   - **App name**: OpenLearnerAI
   - **User support email**: Your support email
   - **Developer contact information**: Your technical contact email
   - **Scopes**: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
4. Navigate to **APIs & Services** > **Credentials**:
   - Click **Create Credentials** > **OAuth client ID**.
   - **Application type**: Web application.
   - **Name**: OpenLearnerAI Web Client.
   - **Authorized JavaScript origins**:
     - Local: `http://localhost:3000`
     - Production: `https://your-domain.vercel.app` (or custom domain)
   - **Authorized redirect URIs**:
     - Add your Supabase project callback URL:
       `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
5. Save and copy:
   - **Client ID**: `[YOUR-GOOGLE-CLIENT-ID].apps.googleusercontent.com`
   - **Client Secret**: `[YOUR-GOOGLE-CLIENT-SECRET]`

---

## 2. Supabase Auth Configuration

1. Visit your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your OpenLearnerAI project.
3. Navigate to **Authentication** > **Providers**:
   - Select **Google**.
   - Enable **Google enabled**.
   - Paste **Client ID** (from Google Cloud Console).
   - Paste **Client Secret** (from Google Cloud Console).
   - Click **Save**.
4. Navigate to **Authentication** > **URL Configuration**:
   - **Site URL**:
     - Local development: `http://localhost:3000`
     - Production: `https://your-domain.vercel.app` (or custom domain)
   - **Redirect URLs** (Add all applicable URLs):
     - `http://localhost:3000/auth/callback`
     - `https://your-domain.vercel.app/auth/callback`
     - `https://openlearner.ai/auth/callback` (if custom domain configured)

---

## 3. Environment Variables Configuration

In `.env` (or Vercel / Render project environment settings):

```env
# Application base URL
NEXT_PUBLIC_APP_URL="http://localhost:3000" # In production: "https://your-domain.vercel.app"

# Supabase Project Credentials
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR-PROJECT-REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR-ANON-PUBLIC-KEY>"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<YOUR-ANON-PUBLIC-KEY>"
SUPABASE_SERVICE_ROLE_KEY="<YOUR-SERVICE-ROLE-KEY>"

# PostgreSQL Database Connections
DATABASE_URL="postgresql://postgres.<PROJECT-REF>:<DB-PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<PROJECT-REF>:<DB-PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# AI & Assistant Engine
GEMINI_API_KEY="<YOUR-GEMINI-API-KEY>"
GEMINI_EMBEDDING_MODEL="gemini-embedding-2"
GEMINI_EMBEDDING_DIMENSIONS="768"

# Platform RBAC Initial Seed
ADMIN_EMAIL="admin@openlearner.ai"
ADMIN_PASSWORD="<SECURE-ADMIN-PASSWORD>"
```

---

## 4. Production Deployment Checklist (Vercel / Render)

1. Ensure `NEXT_PUBLIC_APP_URL` matches your live domain.
2. In Supabase Dashboard > Authentication > URL Configuration:
   - Add your production URL to `Redirect URLs`: `https://<YOUR-DOMAIN>/auth/callback`.
3. In Google Cloud Console > Credentials:
   - Add your production domain to Authorized JavaScript origins.
   - Verify Supabase Auth callback URI is registered.
4. Ensure cookie policies on the server match:
   - `Secure: true` in production (handled automatically by Next.js and `@supabase/ssr`).
   - `SameSite: "lax"` for OAuth redirection handshakes.
