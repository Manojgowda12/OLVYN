import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "openlearner_fallback_secret_must_be_overridden_in_production_32chars"
);

const LEGACY_COOKIE_NAME = "openlearner_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always refresh Supabase session cookies first
  const { supabaseResponse, user: supabaseUser } = await updateSession(request);

  // 2. Protected paths check
  const isAdminPath = pathname.startsWith("/admin");
  const isContributorPath = pathname.startsWith("/contributor");
  const isLearnerPath = pathname.startsWith("/dashboard");

  if (!isAdminPath && !isContributorPath && !isLearnerPath) {
    return supabaseResponse;
  }

  // 3. Resolve active identity (either Supabase Auth or Legacy Cookie)
  let isAuthenticated = Boolean(supabaseUser);
  let resolvedRole: string = (supabaseUser?.user_metadata?.role as string) || "LEARNER";

  if (!isAuthenticated) {
    const legacyToken = request.cookies.get(LEGACY_COOKIE_NAME)?.value;
    if (legacyToken) {
      try {
        const { payload } = await jwtVerify(legacyToken, JWT_SECRET);
        isAuthenticated = true;
        resolvedRole = (payload.role as string) || "LEARNER";
      } catch {
        isAuthenticated = false;
      }
    }
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Role-based path gating (Defense-in-depth: pages also enforce DB roles)
  if (isAdminPath && resolvedRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isContributorPath && resolvedRole !== "CONTRIBUTOR" && resolvedRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/contributor/:path*",
    "/dashboard/:path*",
    "/api/nova/:path*",
    "/api/user/:path*",
  ],
};
