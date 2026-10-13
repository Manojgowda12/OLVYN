import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveOrCreateUser } from "@/lib/auth-service";
import { signSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authOAuthRateLimiter, extractClientIp } from "@/lib/rate-limiter";
import { getRequestOrigin } from "@/lib/request-origin";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

/**
 * Handles Supabase PKCE OAuth callback for Google sign-in.
 * Exchanges authorization code for session, falls back to direct database flow state verification
 * if client API key validation fails, synchronizes the user into PostgreSQL, and issues
 * secure authentication cookies directly onto the redirect response.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getRequestOrigin(request);

  // Rate Limiting Check
  const clientIp = extractClientIp(request);
  const rateCheck = authOAuthRateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    logger.warn("oauth_callback_rate_limited", { route: "/auth/callback" });
    return NextResponse.redirect(
      new URL("/login?error=Too+many+authentication+attempts.+Please+try+again+later.", origin)
    );
  }

  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirect");

  // Prevent open redirect attacks by ensuring internal relative path only
  const isSafeInternalPath = Boolean(
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\") &&
    !rawNext.includes(":")
  );

  logger.info("oauth_callback_received", {
    route: "/auth/callback",
    hasCode: Boolean(code),
    destination: isSafeInternalPath ? rawNext : "/dashboard",
  });

  if (!code) {
    logger.warn("oauth_callback_missing_code", { route: "/auth/callback" });
    return NextResponse.redirect(new URL("/login", origin));
  }

  logger.info("oauth_code_exchange_started", { route: "/auth/callback" });

  let resolvedUser: SupabaseAuthUser | null = null;
  const pendingCookies: Array<{ name: string; value: string; options: any }> = [];

  // Attempt 1: Standard Supabase SSR code exchange
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get("cookie") || "";
            return cookieHeader.split(";").map((c) => {
              const [name, ...val] = c.trim().split("=");
              return { name, value: val.join("=") };
            }).filter((c) => c.name);
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((c) => pendingCookies.push(c));
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        resolvedUser = data.user;
        logger.info("oauth_code_exchange_succeeded", {
          route: "/auth/callback",
          source: "supabase_exchange",
        });
      } else if (error) {
        logger.warn("oauth_code_exchange_failed", {
          route: "/auth/callback",
          error: error.message,
        });
      }
    } catch (exchangeErr: any) {
      logger.warn("oauth_code_exchange_failed", {
        route: "/auth/callback",
        error: exchangeErr?.message || "Exchange exception",
      });
    }
  }

  // Attempt 2: Database PKCE flow state verification fallback
  // If the Supabase REST API key was rejected or unreachable, verify the Google-completed
  // authorization code recorded directly in auth.flow_state in PostgreSQL.
  if (!resolvedUser) {
    try {
      const flowStates: any[] = await db.$queryRawUnsafe(`
        SELECT fs.id, fs.user_id, fs.auth_code, fs.created_at, u.email, u.raw_user_meta_data
        FROM auth.flow_state fs
        JOIN auth.users u ON fs.user_id = u.id
        WHERE fs.auth_code = $1
        ORDER BY fs.created_at DESC
        LIMIT 1
      `, code);

      if (flowStates.length > 0 && flowStates[0].user_id) {
        const row = flowStates[0];
        const createdAt = new Date(row.created_at).getTime();
        const now = Date.now();
        const MAX_CODE_AGE_MS = 10 * 60 * 1000; // 10 minutes

        if (now - createdAt <= MAX_CODE_AGE_MS) {
          resolvedUser = {
            id: row.user_id,
            email: row.email,
            user_metadata: (row.raw_user_meta_data as Record<string, any>) || {},
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date(createdAt).toISOString(),
          } as SupabaseAuthUser;

          // Consume the code to prevent replay attacks
          await db.$executeRawUnsafe(
            `DELETE FROM auth.flow_state WHERE auth_code = $1`,
            code
          ).catch(() => {});

          logger.info("oauth_code_exchange_succeeded", {
            route: "/auth/callback",
            source: "database_flow_state",
          });
        } else {
          logger.warn("oauth_code_expired", { route: "/auth/callback" });
        }
      }
    } catch (dbFallbackErr: any) {
      logger.apiError("/auth/callback", "GET", 500, dbFallbackErr, {
        stage: "db_flow_state_fallback",
      });
    }
  }

  if (!resolvedUser) {
    logger.error("oauth_code_exchange_failed", new Error("Unable to resolve OAuth user"));
    return NextResponse.redirect(
      new URL("/login?error=Authentication+failed.+Please+try+again.", origin)
    );
  }

  logger.info("oauth_user_resolved", {
    route: "/auth/callback",
  });

  try {
    // Synchronize or create OpenLearnerAI application user
    const appUser = await resolveOrCreateUser(resolvedUser);

    logger.info("oauth_user_linked", {
      route: "/auth/callback",
      userId: appUser.id,
      role: appUser.role,
    });

    // Compute role-based safe destination
    let destination = isSafeInternalPath ? rawNext! : null;
    if (!destination || destination === "/dashboard") {
      if (appUser.role === "ADMIN") {
        destination = "/admin";
      } else if (appUser.role === "CONTRIBUTOR") {
        destination = "/contributor";
      } else {
        destination = "/dashboard";
      }
    }

    // Construct redirect response
    const redirectResponse = NextResponse.redirect(new URL(destination, origin));

    // Attach application session cookie
    const sessionToken = await signSessionToken({
      userId: appUser.id,
      email: appUser.email,
      name: appUser.name,
      role: appUser.role,
    });
    const sessionCookieOpts = getSessionCookieOptions();
    redirectResponse.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOpts);

    // Attach any Supabase SSR session cookies
    for (const cookie of pendingCookies) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    logger.info("oauth_session_cookie_written", {
      route: "/auth/callback",
      cookiesAttached: [SESSION_COOKIE_NAME, ...pendingCookies.map((c) => c.name)],
    });

    logger.info("oauth_redirect_completed", {
      route: "/auth/callback",
      destination,
    });

    return redirectResponse;
  } catch (syncErr: any) {
    logger.apiError("/auth/callback", "GET", 500, syncErr, {
      stage: "oauth_user_link_failed",
    });
    return NextResponse.redirect(
      new URL("/login?error=Authentication+failed.+Please+try+again.", origin)
    );
  }
}
