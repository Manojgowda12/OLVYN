import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Role } from "./constants";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "openlearner_fallback_secret_must_be_overridden_in_production_32chars"
);

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
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);

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

    const { payload } = await jwtVerify(token, JWT_SECRET);
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
