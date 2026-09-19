import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-service";
import { getUserMemories, clearUserMemories, setUserMemoryEnabled } from "@/lib/memory";

/**
 * GET /api/user/memories - Lists durable memories for the authenticated user.
 */
export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memories = await getUserMemories(auth.user.id, { limit: 50 });
  return NextResponse.json({
    memories,
    memoryEnabled: auth.user.memoryEnabled,
  });
}

/**
 * DELETE /api/user/memories - Purges all memories for the authenticated user.
 */
export async function DELETE() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedCount = await clearUserMemories(auth.user.id);
  return NextResponse.json({
    message: "All personal memories cleared successfully.",
    count: deletedCount,
  });
}

/**
 * PATCH /api/user/memories - Toggles memoryEnabled state for the authenticated user.
 */
export async function PATCH(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.memoryEnabled !== "boolean") {
    return NextResponse.json(
      { error: "Invalid request. 'memoryEnabled' boolean is required." },
      { status: 400 }
    );
  }

  const updated = await setUserMemoryEnabled(auth.user.id, body.memoryEnabled);
  return NextResponse.json({
    message: `Personal memory ${updated.memoryEnabled ? "enabled" : "disabled"}.`,
    memoryEnabled: updated.memoryEnabled,
  });
}
