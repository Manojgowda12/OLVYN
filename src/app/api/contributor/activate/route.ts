import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, createSession, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  // Security Guard: Permanent protection against role downgrade or privilege escalation
  if (session.role === "ADMIN") {
    return NextResponse.json({
      success: true,
      message: "Admin accounts already have complete Creator Studio access.",
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  }

  if (session.role === "CONTRIBUTOR") {
    return NextResponse.json({
      success: true,
      message: "Contributor Studio is already activated.",
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  }

  // Only verified LEARNER accounts may be upgraded to CONTRIBUTOR
  if (session.role !== "LEARNER") {
    return NextResponse.json({ error: "Invalid role transition." }, { status: 400 });
  }

  try {
    // Upgrade user role in database strictly to CONTRIBUTOR (never reads client body for target role or userId)
    const updatedUser = await db.user.update({
      where: { id: session.userId },
      data: { role: "CONTRIBUTOR" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Re-issue session cookie with updated CONTRIBUTOR role
    const token = await createSession({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role as any,
    });

    const response = NextResponse.json({
      success: true,
      message: "Contributor Studio activated successfully.",
      user: updatedUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return response;
  } catch (error: any) {
    console.error("Contributor activation error:", error);
    return NextResponse.json({ error: "Failed to activate Contributor access." }, { status: 500 });
  }
}
