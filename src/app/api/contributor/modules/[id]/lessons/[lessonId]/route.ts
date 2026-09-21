import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorModuleAccess } from "@/lib/contributor-guard";
import { updateLessonSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  const { id: moduleId, lessonId } = await params;

  // 1. Verify contributor access through parent module and course
  const auth = await verifyContributorModuleAccess(moduleId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  // 2. Verify lesson exists and belongs to this module
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson || lesson.moduleId !== moduleId) {
    return NextResponse.json(
      { error: "Lesson not found in this module." },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const result = updateLessonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid lesson data." },
        { status: 400 }
      );
    }

    const { title, description, contentType, textContent, mediaUrl, durationMinutes, isRequired } = result.data;

    // Handle slug update safely if title changed
    let finalSlug = lesson.slug;
    if (title.trim().toLowerCase() !== lesson.title.trim().toLowerCase()) {
      const baseSlug = slugify(title);
      finalSlug = baseSlug;
      let counter = 1;

      while (
        await db.lesson.findFirst({
          where: {
            slug: finalSlug,
            module: { courseId: auth.course.id },
            NOT: { id: lessonId },
          },
        })
      ) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const updated = await db.lesson.update({
      where: { id: lessonId },
      data: {
        title,
        slug: finalSlug,
        description: description || null,
        contentType,
        textContent: textContent || null,
        mediaUrl: mediaUrl || null,
        durationMinutes: durationMinutes || null,
        isRequired,
      },
    });

    return NextResponse.json({ lesson: updated });
  } catch (error: any) {
    console.error("Lesson update error:", error);
    return NextResponse.json({ error: "Failed to update lesson." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  const { id: moduleId, lessonId } = await params;

  // 1. Verify contributor access through parent module and course
  const auth = await verifyContributorModuleAccess(moduleId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  // 2. Verify lesson exists and belongs to this module
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson || lesson.moduleId !== moduleId) {
    return NextResponse.json(
      { error: "Lesson not found in this module." },
      { status: 404 }
    );
  }

  try {
    await db.$transaction(async (tx) => {
      // 3. Clean up associated Document & DocumentChunk indexing records
      const docs = await tx.document.findMany({
        where: { lessonId },
        select: { id: true },
      });

      if (docs.length > 0) {
        const docIds = docs.map((d) => d.id);
        await tx.documentChunk.deleteMany({
          where: { documentId: { in: docIds } },
        });
        await tx.document.deleteMany({
          where: { id: { in: docIds } },
        });
      }

      // 4. Delete lesson (Prisma cascades to resources and progress)
      await tx.lesson.delete({
        where: { id: lessonId },
      });

      // 5. Fetch remaining sibling lessons in order
      const remainingLessons = await tx.lesson.findMany({
        where: { moduleId },
        orderBy: { orderIndex: "asc" },
      });

      // 6. Collision-safe 2-pass re-indexing to maintain 1, 2, 3... sequence
      for (let i = 0; i < remainingLessons.length; i++) {
        await tx.lesson.update({
          where: { id: remainingLessons[i].id },
          data: { orderIndex: -(i + 1) },
        });
      }

      for (let i = 0; i < remainingLessons.length; i++) {
        await tx.lesson.update({
          where: { id: remainingLessons[i].id },
          data: { orderIndex: i + 1 },
        });
      }
    });

    return NextResponse.json({
      message: "Lesson deleted successfully.",
      success: true,
    });
  } catch (error: any) {
    console.error("Lesson deletion error:", error);
    return NextResponse.json({ error: "Failed to delete lesson." }, { status: 500 });
  }
}
