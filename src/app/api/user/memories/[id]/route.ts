import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-service";
import { deleteUserMemory } from "@/lib/memory";

/**
 * DELETE /api/user/memories/[id] - Deletes an individual memory with strict ownership check.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Memory ID required" }, { status: 400 });
  }

  const success = await deleteUserMemory(auth.user.id, id);
  if (!success) {
    return NextResponse.json(
      { error: "Memory not found or not authorized to delete." },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Memory deleted successfully." });
}
