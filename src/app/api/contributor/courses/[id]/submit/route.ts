import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (course.authorId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. You are not the author." }, { status: 403 });
  }

  if (course.status === "PENDING_REVIEW") {
    return NextResponse.json({ error: "Course is already awaiting editorial review." }, { status: 400 });
  }

  if (course.status === "PUBLISHED") {
    return NextResponse.json({ error: "Course is already published." }, { status: 400 });
  }

  // Verification criteria
  if (!course.modules || course.modules.length === 0) {
    return NextResponse.json(
      { error: "Course must have at least one module before submitting for review." },
      { status: 400 }
    );
  }

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  if (totalLessons === 0) {
    return NextResponse.json(
      { error: "Course must contain at least one lesson before submitting for review." },
      { status: 400 }
    );
  }

  const updatedCourse = await db.course.update({
    where: { id: courseId },
    data: {
      status: "PENDING_REVIEW",
      rejectionReason: null, // Clear any prior rejection reason upon resubmission
    },
  });

  return NextResponse.json({
    message: "Course submitted for editorial review successfully.",
    course: updatedCourse,
  });
}
