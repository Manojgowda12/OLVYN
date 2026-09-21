import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorCourseAccess } from "@/lib/contributor-guard";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  // Verify authentication, ownership, and DRAFT/REJECTED status
  const auth = await verifyContributorCourseAccess(courseId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


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

  if (course.status === "PENDING_REVIEW") {
    return NextResponse.json({ error: "Course is already awaiting editorial review." }, { status: 400 });
  }

  if (course.status === "PUBLISHED") {
    return NextResponse.json({ error: "Course is already published." }, { status: 400 });
  }

  // Verification criteria: must have modules and lessons
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

  const reviewAction = course.status === "REJECTED" ? "RESUBMITTED" : "SUBMITTED";

  const [updatedCourse] = await db.$transaction([
    db.course.update({
      where: { id: courseId },
      data: {
        status: "PENDING_REVIEW",
        rejectionReason: null, // Clear active rejection reason upon resubmission
      },
    }),
    db.courseReview.create({
      data: {
        courseId,
        reviewerId: auth.session.userId,
        action: reviewAction,
        comments: reviewAction === "RESUBMITTED" ? "Course revisions submitted for review." : "Course submitted for editorial review.",
      },
    }),
  ]);

  return NextResponse.json({
    message: "Course submitted for editorial review successfully.",
    course: updatedCourse,
  });
}
