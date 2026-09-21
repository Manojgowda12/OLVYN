import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorModuleAccess } from "@/lib/contributor-guard";
import { lessonSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: moduleId } = await params;

  // Verify authentication, ownership, and DRAFT/REJECTED status through parent module
  const auth = await verifyContributorModuleAccess(moduleId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  const moduleItem = auth.entity;

  try {
    const body = await req.json();
    const result = lessonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid lesson data." },
        { status: 400 }
      );
    }

    const { title, description, contentType, textContent, mediaUrl, durationMinutes, orderIndex, isRequired } = result.data;

    let finalOrderIndex = orderIndex;
    const existingWithIndex = await db.lesson.findUnique({
      where: {
        moduleId_orderIndex: {
          moduleId,
          orderIndex: finalOrderIndex,
        },
      },
    });

    if (existingWithIndex) {
      const maxAgg = await db.lesson.aggregate({
        where: { moduleId },
        _max: { orderIndex: true },
      });
      finalOrderIndex = (maxAgg._max.orderIndex || 0) + 1;
    }

    const baseSlug = slugify(title);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (
      await db.lesson.findFirst({
        where: { slug: uniqueSlug, module: { courseId: moduleItem.courseId } },
      })
    ) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const lesson = await db.lesson.create({
      data: {
        moduleId,
        title,
        slug: uniqueSlug,
        description: description || null,
        contentType,
        textContent: textContent || null,
        mediaUrl: mediaUrl || null,
        durationMinutes: durationMinutes || null,
        orderIndex: finalOrderIndex,
        isRequired,
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error: any) {
    console.error("Lesson creation error:", error);
    return NextResponse.json({ error: "Failed to create lesson." }, { status: 500 });
  }
}
