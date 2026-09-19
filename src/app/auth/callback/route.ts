import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveOrCreateUser } from "@/lib/auth-service";

/**
 * Handles Supabase PKCE OAuth callback for Google sign-in.
 * Exchanges the authorization code for a session and synchronizes
 * the user record into OpenLearnerAI PostgreSQL.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirect");

  // Prevent open redirect attacks by ensuring path starts with / and not //
  const hasCustomRedirect = Boolean(rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//"));

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
          let destination = hasCustomRedirect ? rawNext! : null;
          if (!destination || destination === "/dashboard") {
            if (appUser.role === "ADMIN") {
              destination = "/admin";
            } else if (appUser.role === "CONTRIBUTOR") {
              destination = "/contributor";
            } else {
              destination = "/dashboard";
            }
          }

          return NextResponse.redirect(new URL(destination, requestUrl.origin));
        }

        if (error) {
          console.error("Supabase OAuth code exchange error:", error.message);
          return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
          );
        }
      }
    } catch (err: any) {
      console.error("Unexpected error in auth callback:", err);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`, requestUrl.origin)
      );
    }
  }

  // Return to login if no code was provided
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
