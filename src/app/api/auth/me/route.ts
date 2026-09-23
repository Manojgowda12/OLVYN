import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Sanitize user object to strictly exclude sensitive credentials such as passwordHash
  const sanitizedUser = {
    id: user.id,
    authUserId: user.authUserId,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    memoryEnabled: user.memoryEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return NextResponse.json({ user: sanitizedUser });
}
