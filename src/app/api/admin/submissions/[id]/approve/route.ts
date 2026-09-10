import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin privileges required." }, { status: 403 });
  }

  const { id: courseId } = await params;

  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (course.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "Course is not pending review." }, { status: 400 });
  }

  const [updatedCourse] = await db.$transaction([
    db.course.update({
      where: { id: courseId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        rejectionReason: null,
      },
    }),
    db.courseReview.create({
      data: {
        courseId,
        reviewerId: session.userId,
        action: "PUBLISHED",
        comments: "Course approved and published to public catalog.",
      },
    }),
  ]);

  return NextResponse.json({
    message: "Course successfully approved and published!",
    course: updatedCourse,
  });
}
