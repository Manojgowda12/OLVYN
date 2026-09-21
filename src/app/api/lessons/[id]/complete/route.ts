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

  const { id: lessonId } = await params;

  // Find lesson and its course
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              modules: {
                include: {
                  lessons: { select: { id: true, isRequired: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  const course = lesson.module.course;
  const courseId = course.id;

  // Course visibility security check: only PUBLISHED courses can have progress updated by learners
  const isAuthorOrAdmin = session.role === "ADMIN" || course.authorId === session.userId;
  if (course.status !== "PUBLISHED" && !isAuthorOrAdmin) {
    return NextResponse.json({ error: "Course is not published." }, { status: 404 });
  }

  // Ensure enrollment exists
  await db.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId,
      },
    },
    create: {
      userId: session.userId,
      courseId,
    },
    update: {
      lastAccessedAt: new Date(),
    },
  });

  // Toggle completion
  const existingProgress = await db.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId: session.userId,
        lessonId,
      },
    },
  });

  const nextCompletedState = existingProgress ? !existingProgress.isCompleted : true;

  await db.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: session.userId,
        lessonId,
      },
    },
    create: {
      userId: session.userId,
      lessonId,
      isCompleted: true,
      completedAt: new Date(),
    },
    update: {
      isCompleted: nextCompletedState,
      completedAt: nextCompletedState ? new Date() : null,
    },
  });

  // Calculate total required lessons and completed lessons
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;

  const completedCount = await db.lessonProgress.count({
    where: {
      userId: session.userId,
      isCompleted: true,
      lesson: {
        module: { courseId },
      },
    },
  });

  const rawPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const percentage = Math.min(100, Math.max(0, rawPercentage));
  const isCourseCompleted = percentage >= 100;

  const updatedCourseProgress = await db.courseProgress.upsert({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId,
      },
    },
    create: {
      userId: session.userId,
      courseId,
      completedLessons: completedCount,
      totalLessons,
      percentage,
      isCompleted: isCourseCompleted,
      lastLessonId: lessonId,
      completedAt: isCourseCompleted ? new Date() : null,
    },
    update: {
      completedLessons: completedCount,
      totalLessons,
      percentage,
      isCompleted: isCourseCompleted,
      lastLessonId: lessonId,
      completedAt: isCourseCompleted ? new Date() : null,
    },
  });

  return NextResponse.json({
    lessonId,
    isCompleted: nextCompletedState,
    courseProgress: updatedCourseProgress,
  });
}
