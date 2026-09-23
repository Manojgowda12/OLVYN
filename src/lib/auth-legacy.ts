import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Role } from "./constants";

/**
 * Safely resolves the JWT authentication secret key.
 *
 * Security Requirements:
 * - Production: AUTH_SECRET must be explicitly defined and at least 32 characters long.
 *   Missing or weak secrets in production fail safely by throwing an unrecoverable error.
 *   Zero fallback to hardcoded production secrets.
 * - Development/Test: If AUTH_SECRET is omitted in non-production, a clearly isolated local-only
 *   key is used to allow offline and unit test workflows without crashing development.
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.trim().length === 0) {
      throw new Error("AUTH_SECRET is not configured in production environment.");
    }
    if (secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters in production.");
    }
    return new TextEncoder().encode(secret);
  }

  // Local development / testing only
  if (!secret || secret.trim().length === 0) {
    return new TextEncoder().encode("local_development_only_insecure_auth_secret_minimum_32chars");
  }

  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE_NAME = "openlearner_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getSessionCookieOptions() {
  const appUrl = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) || "";
  const isExplicitLocalhost =
    appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

  // In production, enforce Secure cookies UNLESS explicitly running on an unencrypted localhost/127.0.0.1 URL.
  // In development/test (NODE_ENV !== "production"), secure is false so developers can test over plain HTTP.
  const isSecure =
    process.env.NODE_ENV === "production" ? !isExplicitLocalhost : false;

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION,
  };
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  } catch {
    // Outside request context
  }

  return token;
}

export async function getLegacySession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function clearLegacySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Outside request context
  }
}
