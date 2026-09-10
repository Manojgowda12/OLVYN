import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { lessonSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session || (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: moduleId } = await params;

  const moduleItem = await db.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });

  if (!moduleItem) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  if (moduleItem.course.authorId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

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
        orderIndex,
        isRequired,
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error: any) {
    console.error("Lesson creation error:", error);
    return NextResponse.json({ error: "Failed to create lesson." }, { status: 500 });
  }
}
