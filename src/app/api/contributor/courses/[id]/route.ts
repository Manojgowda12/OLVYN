import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { courseSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session || (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: courseId } = await params;

  // Verify ownership
  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (course.authorId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. You are not the author of this course." }, { status: 403 });
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
