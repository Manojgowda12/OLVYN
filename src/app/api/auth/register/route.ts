import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { authRegisterRateLimiter, extractClientIp } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  // 1. Rate Limiting Check
  const clientIp = extractClientIp(req);
  const rateCheck = authRegisterRateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many registration attempts. Please try again later.",
        retryAfter: rateCheck.resetSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateCheck.resetSeconds.toString(),
          "X-RateLimit-Limit": rateCheck.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input data." },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Do not expose whether the account already exists to prevent user enumeration
      logger.warn("registration_duplicate_suppressed", { route: "/api/auth/register" });
      return NextResponse.json(
        { error: "Unable to complete registration. Please check your details or try signing in." },
        { status: 400 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        normalizedEmail,
        passwordHash,
        name,
        role: "LEARNER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Create session cookie
    const token = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    });

    const response = NextResponse.json(
      { message: "Registration successful", user },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return response;
  } catch (error: any) {
    logger.apiError("/api/auth/register", "POST", 500, error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}

