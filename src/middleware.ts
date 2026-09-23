import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { jwtVerify } from "jose";

function getMiddlewareJwtSecret(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.trim().length === 0 || secret.length < 32) {
      return null; // Missing or weak secret in production fails closed safely
    }
    return new TextEncoder().encode(secret);
  }
  // Local development / testing only
  if (!secret || secret.trim().length === 0) {
    return new TextEncoder().encode("local_development_only_insecure_auth_secret_minimum_32chars");
  }
  return new TextEncoder().encode(secret);
}

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
    const jwtSecret = getMiddlewareJwtSecret();
    if (legacyToken && jwtSecret) {
      try {
        const { payload } = await jwtVerify(legacyToken, jwtSecret);
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

  const isContributorCourseMutation = pathname.startsWith("/contributor/courses");
  if (isContributorCourseMutation && resolvedRole !== "CONTRIBUTOR" && resolvedRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/contributor", request.url));
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
