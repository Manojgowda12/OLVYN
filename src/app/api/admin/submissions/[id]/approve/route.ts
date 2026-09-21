import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { indexLessonsBatch, IndexBatchResult } from "@/lib/indexing";

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

  // 1. Commit publication status atomically in DB first
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
        action: "APPROVED",
        comments: "Course approved and published to public catalog.",
      },
    }),
  ]);

  // 2. Safe post-publication indexing: outside DB transaction so locks are not held
  // Publication remains fully intact even if embedding provider is temporarily unavailable
  let indexingResult: IndexBatchResult | null = null;
  try {
    const lessonsToIndex = await db.lesson.findMany({
      where: {
        module: { courseId },
        textContent: { not: null },
      },
      include: {
        module: {
          include: {
            course: {
              select: { title: true },
            },
          },
        },
      },
    });

    const eligible = lessonsToIndex
      .filter((l) => l.textContent && l.textContent.trim().length > 0)
      .map((l) => ({
        id: l.id,
        title: l.title,
        courseTitle: l.module.course.title,
      }));

    if (eligible.length > 0) {
      indexingResult = await indexLessonsBatch(eligible, { concurrency: 2 });
    }
  } catch (indexingError) {
    console.error("Post-publication indexing encountered an error (course remains published):", indexingError);
  }

  return NextResponse.json({
    message: "Course successfully approved and published!",
    course: updatedCourse,
    indexing: indexingResult,
  });
}
