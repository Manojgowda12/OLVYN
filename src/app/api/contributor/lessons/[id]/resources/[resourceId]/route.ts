import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorLessonAccess } from "@/lib/contributor-guard";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  const { id: lessonId, resourceId } = await params;

  // Verify authentication, ownership, and DRAFT/REJECTED course status
  const auth = await verifyContributorLessonAccess(lessonId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  try {
    const resource = await db.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource || resource.lessonId !== lessonId) {
      return NextResponse.json(
        { error: "Resource not found on this lesson." },
        { status: 404 }
      );
    }

    await db.resource.delete({
      where: { id: resourceId },
    });

    return NextResponse.json({
      message: "Resource deleted successfully.",
      success: true,
    });
  } catch (error: any) {
    console.error("Resource deletion error:", error);
    return NextResponse.json({ error: "Failed to delete resource." }, { status: 500 });
  }
}
