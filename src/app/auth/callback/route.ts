import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveOrCreateUser } from "@/lib/auth-service";
import { logger } from "@/lib/logger";
import { authOAuthRateLimiter, extractClientIp } from "@/lib/rate-limiter";

/**
 * Handles Supabase PKCE OAuth callback for Google sign-in.
 * Exchanges the authorization code for a session and synchronizes
 * the user record into OpenLearnerAI PostgreSQL.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  // Rate Limiting Check
  const clientIp = extractClientIp(request);
  const rateCheck = authOAuthRateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
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
    !rawNext.includes(":") &&
    !rawNext.includes("\\")
  );

  if (code) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
          // Resolve or link OpenLearnerAI application user
          const appUser = await resolveOrCreateUser(data.user);

          // Synchronize database role into session metadata for Edge middleware performance
          if (data.user.user_metadata?.role !== appUser.role) {
            await supabase.auth.updateUser({ data: { role: appUser.role } }).catch(() => {});
          }

          // Role-based redirection:
          // If no specific lesson/course page requested, route each user to their authoritative role dashboard
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

          return NextResponse.redirect(new URL(destination, origin));
        }

        if (error) {
          logger.apiError("/auth/callback", "GET", 400, error);
          return NextResponse.redirect(
            new URL("/login?error=Authentication+failed.+Please+try+again.", origin)
          );
        }
      }
    } catch (err: any) {
      logger.apiError("/auth/callback", "GET", 500, err);
      return NextResponse.redirect(
        new URL("/login?error=Authentication+failed.+Please+try+again.", origin)
      );
    }
  }

  // Return to login if no code was provided
  return NextResponse.redirect(new URL("/login", origin));
}
