import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { authOAuthRateLimiter, extractClientIp } from "@/lib/rate-limiter";

/**
 * Initiates Google OAuth flow via Supabase Auth.
 * Redirects the user directly to Google's consent screen.
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

  // Prevent open redirect attacks by ensuring internal relative path only
  const rawNext = requestUrl.searchParams.get("next") || "/dashboard";
  const isValidNext = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":");
  const next = isValidNext ? rawNext : "/dashboard";

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(
        new URL("/login?error=Supabase+authentication+is+not+configured", origin)
      );
    }

    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error || !data.url) {
      logger.apiError("/api/auth/google", "GET", 500, error || new Error("Missing OAuth redirect URL"));
      return NextResponse.redirect(
        new URL("/login?error=Failed+to+initiate+Google+sign+in.+Please+try+again.", origin)
      );
    }

    logger.info("oauth_start", {
      route: "/api/auth/google",
      destination: next,
    });

    return NextResponse.redirect(data.url);
  } catch (err: unknown) {
    logger.apiError("/api/auth/google", "GET", 500, err);
    return NextResponse.redirect(
      new URL("/login?error=Failed+to+initiate+Google+sign+in.+Please+try+again.", origin)
    );
  }
}

