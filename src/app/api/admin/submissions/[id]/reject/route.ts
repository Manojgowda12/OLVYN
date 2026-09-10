import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { reviewSchema } from "@/lib/validations";

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

  try {
    const body = await req.json();
    const result = reviewSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid review feedback." },
        { status: 400 }
      );
    }

    const { comments } = result.data;

    const [updatedCourse] = await db.$transaction([
      db.course.update({
        where: { id: courseId },
        data: {
          status: "REJECTED",
          rejectionReason: comments,
        },
      }),
      db.courseReview.create({
        data: {
          courseId,
          reviewerId: session.userId,
          action: "REJECTED",
          comments,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Course rejected with feedback.",
      course: updatedCourse,
    });
  } catch (error: any) {
    console.error("Course rejection error:", error);
    return NextResponse.json({ error: "Failed to reject course." }, { status: 500 });
  }
}
