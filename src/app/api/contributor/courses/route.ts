import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { courseSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in to create courses." }, { status: 401 });
  }

  if (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Contributor access required." }, { status: 403 });
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


    let baseSlug = slugify(title);
    let uniqueSlug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (await db.course.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const course = await db.course.create({
      data: {
        title,
        slug: uniqueSlug,
        shortSummary,
        description,
        difficulty,
        language,
        estimatedHours: estimatedHours || null,
        thumbnailUrl: thumbnailUrl || null,
        status: "DRAFT",
        authorId: session.userId,
        categoryId: categoryId || null,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error: any) {
    console.error("Course creation error:", error);
    return NextResponse.json({ error: "Failed to create course." }, { status: 500 });
  }
}
