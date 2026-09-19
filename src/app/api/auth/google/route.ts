import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Initiates Google OAuth flow via Supabase Auth.
 * Redirects the user directly to Google's consent screen.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const origin = requestUrl.origin;

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
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error?.message || "Failed to initiate Google sign in")}`,
          origin
        )
      );
    }

    return NextResponse.redirect(data.url);
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message || "OAuth initialization error")}`, origin)
    );
  }
}
