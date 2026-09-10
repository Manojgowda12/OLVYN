import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "openlearner_fallback_secret_must_be_overridden_in_production_32chars"
);

const SESSION_COOKIE_NAME = "openlearner_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected paths
  const isAdminPath = pathname.startsWith("/admin");
  const isContributorPath = pathname.startsWith("/contributor");
  const isLearnerPath = pathname.startsWith("/dashboard");

  if (!isAdminPath && !isContributorPath && !isLearnerPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    if (isAdminPath && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (isContributorPath && role !== "CONTRIBUTOR" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/contributor/:path*", "/dashboard/:path*"],
};
