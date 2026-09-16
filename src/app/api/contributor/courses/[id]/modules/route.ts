import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { moduleSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: courseId } = await params;

  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (course.authorId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = moduleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid module data." },
        { status: 400 }
      );
    }

    const { title, description, orderIndex } = result.data;

    const moduleItem = await db.module.create({
      data: {
        courseId,
        title,
        description: description || null,
        orderIndex,
      },
    });

    return NextResponse.json({ module: moduleItem }, { status: 201 });
  } catch (error: any) {
    console.error("Module creation error:", error);
    return NextResponse.json({ error: "Failed to create module." }, { status: 500 });
  }
}
