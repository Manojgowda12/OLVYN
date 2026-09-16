import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { Role } from "./constants";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "openlearner_fallback_secret_must_be_overridden_in_production_32chars"
);

const SESSION_COOKIE_NAME = "openlearner_session";
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

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
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

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
}

export async function ensurePermanentAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@openlearner.ai").toLowerCase();
  const adminRawPassword = process.env.ADMIN_PASSWORD || "AdminSecure2026!";

  try {
    const existing = await db.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existing) {
      const passwordHash = await hashPassword(adminRawPassword);
      return await db.user.create({
        data: {
          email: adminEmail,
          normalizedEmail: adminEmail.toLowerCase(),
          passwordHash,
          name: "Platform Administrator",
          role: "ADMIN",
          bio: "Chief editorial lead and platform moderator.",
        },
      });
    } else if (existing.role !== "ADMIN") {
      return await db.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      });
    }
    return existing;
  } catch (err) {
    console.error("Error ensuring permanent admin:", err);
    return null;
  }
}


