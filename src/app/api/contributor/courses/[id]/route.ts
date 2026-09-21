import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorCourseAccess } from "@/lib/contributor-guard";
import { courseSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  // Verify authentication, ownership, and DRAFT/REJECTED status
  const auth = await verifyContributorCourseAccess(courseId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  try {
    const body = await req.json();
    const result = courseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid course data." },
        { status: 400 }
      );
    }

    const { title, shortSummary, description, difficulty, language, estimatedHours, thumbnailUrl, categoryId } = result.data;

    if (categoryId) {
      const categoryExists = await db.category.findUnique({ where: { id: categoryId } });
      if (!categoryExists) {
        return NextResponse.json({ error: "Selected category does not exist." }, { status: 400 });
      }
    }

    const updated = await db.course.update({
      where: { id: courseId },
      data: {
        title,
        shortSummary,
        description,
        difficulty,
        language,
        estimatedHours: estimatedHours || null,
        thumbnailUrl: thumbnailUrl || null,
        categoryId: categoryId || null,
      },
    });

    return NextResponse.json({ course: updated });
  } catch (error: any) {
    console.error("Course update error:", error);
    return NextResponse.json({ error: "Failed to update course." }, { status: 500 });
  }
}
