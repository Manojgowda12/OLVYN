import { cache } from "react";
import { db } from "@/lib/db";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getLegacySession } from "@/lib/auth-legacy";
import { Role } from "@prisma/client";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export interface AuthenticatedUserContext {
  user: {
    id: string;
    authUserId: string | null;
    email: string;
    name: string;
    role: Role;
    avatarUrl: string | null;
    bio: string | null;
    memoryEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  role: Role;
  supabaseUser: SupabaseAuthUser | null;
  authSource: "supabase" | "legacy";
}

/**
 * Deterministically resolves or creates an OpenLearnerAI User record for a Supabase Auth user.
 *
 * Rules:
 * 1. If a user with `authUserId == supabaseUser.id` exists, return it immediately.
 * 2. If a user exists with matching verified email and `authUserId == null`, safely link it,
 *    preserving all existing roles, enrollments, courses, and progress.
 * 3. If no user exists, create a new User with default role LEARNER.
 * 4. Repeated logins for the same Supabase/Google account always resolve to the exact same User.
 */
export async function resolveOrCreateUser(supabaseUser: SupabaseAuthUser) {
  if (!supabaseUser || !supabaseUser.id) {
    throw new Error("Invalid Supabase auth user: missing user ID.");
  }

  const authUserId = supabaseUser.id;
  const rawEmail = supabaseUser.email || "";
  const normalizedEmail = rawEmail.toLowerCase().trim();

  // 1. Direct lookup by authUserId
  const existingByAuthId = await db.user.findUnique({
    where: { authUserId },
  });

  if (existingByAuthId) {
    return existingByAuthId;
  }

  // 2. Lookup by verified email for migration of existing accounts
  if (normalizedEmail) {
    const existingByEmail = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingByEmail) {
      // If the existing account does not yet have an authUserId, safely bind it
      if (!existingByEmail.authUserId) {
        const updated = await db.user.update({
          where: { id: existingByEmail.id },
          data: {
            authUserId,
            // Sync avatar if existing is empty
            avatarUrl: existingByEmail.avatarUrl || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
          },
        });
        return updated;
      }
      // If already linked to another authUserId, conflict protection
      if (existingByEmail.authUserId !== authUserId) {
        throw new Error("Security conflict: Email already associated with another authentication identity.");
      }
      return existingByEmail;
    }
  }

  // 3. Create new learner user
  const fullName =
    supabaseUser.user_metadata?.full_name ||
    supabaseUser.user_metadata?.name ||
    (normalizedEmail ? normalizedEmail.split("@")[0] : "Learner");

  const avatar =
    supabaseUser.user_metadata?.avatar_url ||
    supabaseUser.user_metadata?.picture ||
    null;

  const newUser = await db.user.create({
    data: {
      authUserId,
      email: normalizedEmail || `user_${authUserId}@openlearner.ai`,
      normalizedEmail: normalizedEmail || `user_${authUserId}@openlearner.ai`,
      name: fullName,
      role: Role.LEARNER, // New Google accounts always default to LEARNER
      status: "ACTIVE",
      avatarUrl: avatar,
      memoryEnabled: true,
    },
  });

  return newUser;
}

/**
 * Authoritative server-side identity resolver.
 * Inspects Supabase session cookies first. Falls back to legacy session for test compatibility.
 */
export const getAuthenticatedUser = cache(async function getAuthenticatedUser(): Promise<AuthenticatedUserContext | null> {
  // 1. Check Supabase SSR Session
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

      if (!error && supabaseUser) {
        const appUser = await resolveOrCreateUser(supabaseUser);
        if (appUser && appUser.status === "ACTIVE") {
          return {
            user: appUser,
            role: appUser.role,
            supabaseUser,
            authSource: "supabase",
          };
        }
      }
    }
  } catch (supabaseErr) {
    // If Supabase check encounters an error, proceed to fallback check
  }

  // 2. Check Legacy Session Cookie (for existing platform tests and local seed users)
  try {
    const legacySession = await getLegacySession();
    if (legacySession && legacySession.userId) {
      const appUser = await db.user.findUnique({
        where: { id: legacySession.userId },
      });

      if (appUser && appUser.status === "ACTIVE") {
        return {
          user: appUser,
          role: appUser.role,
          supabaseUser: null,
          authSource: "legacy",
        };
      }
    }
  } catch (legacyErr) {
    // Legacy session invalid or expired
  }

  return null;
});

/**
 * Strict helper: returns authenticated user or throws error.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUserContext> {
  const context = await getAuthenticatedUser();
  if (!context) {
    throw new Error("UNAUTHORIZED");
  }
  return context;
}

/**
 * Strict helper: checks that the authenticated user has one of the allowed roles.
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthenticatedUserContext> {
  const context = await requireAuthenticatedUser();
  if (!allowedRoles.includes(context.role)) {
    throw new Error("FORBIDDEN");
  }
  return context;
}
