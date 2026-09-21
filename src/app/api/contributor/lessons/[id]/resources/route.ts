import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorLessonAccess } from "@/lib/contributor-guard";
import { resourceSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lessonId } = await params;

  // Verify authentication, ownership, and DRAFT/REJECTED course status
  const auth = await verifyContributorLessonAccess(lessonId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  try {
    const body = await req.json();
    const result = resourceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid resource payload." },
        { status: 400 }
      );
    }

    const { title, resourceType, url, description, isInternal } = result.data;

    const resource = await db.resource.create({
      data: {
        lessonId,
        title,
        resourceType,
        url,
        description: description || null,
        isInternal,
      },
    });

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error: any) {
    console.error("Resource creation error:", error);
    return NextResponse.json({ error: "Failed to attach resource." }, { status: 500 });
  }
}
