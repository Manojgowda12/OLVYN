import { db } from "./db";
import { Role } from "./constants";
import { createClient as createServerSupabaseClient } from "./supabase/server";
import {
  getAuthenticatedUser,
  requireAuthenticatedUser,
  requireRole,
  resolveOrCreateUser,
  AuthenticatedUserContext,
} from "./auth-service";
import {
  createSession as createLegacySession,
  signSessionToken,
  getLegacySession,
  clearLegacySession,
  hashPassword,
  verifyPassword,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  SessionPayload,
} from "./auth-legacy";

export {
  getAuthenticatedUser,
  requireAuthenticatedUser,
  requireRole,
  resolveOrCreateUser,
  createLegacySession,
  signSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  hashPassword,
  verifyPassword,
};
export type { SessionPayload, AuthenticatedUserContext };

/**
 * Returns the current authenticated session payload.
 * Authoritative: checks Supabase Auth first, then legacy session for backward compatibility.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const context = await getAuthenticatedUser();
  if (!context) return null;

  return {
    userId: context.user.id,
    email: context.user.email,
    name: context.user.name,
    role: context.role,
  };
}

/**
 * Returns the full current user record from the database.
 */
export async function getCurrentUser() {
  const context = await getAuthenticatedUser();
  if (!context) return null;

  return context.user;
}

/**
 * Creates an application session cookie (used by password login).
 */
export async function createSession(payload: SessionPayload): Promise<string> {
  return createLegacySession(payload);
}

/**
 * Clears both Supabase auth session and application session cookies.
 */
export async function clearSession(): Promise<void> {
  // Clear Supabase session if configured
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    // Ignore signOut errors during clearSession
  }

  // Clear legacy cookie
  await clearLegacySession();
}

/**
 * Initializes permanent admin user if not present.
 */
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
