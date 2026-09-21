import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface LearnCourseRootProps {
  params: Promise<{ courseSlug: string }>;
}

export const revalidate = 0;


/**
 * /learn/[courseSlug]
 *
 * Entry-point for starting or resuming a course.
 * Deterministically redirects to the learner's first incomplete lesson in course/module order.
 *
 * Rules:
 * - Not authenticated -> redirect to /login?redirect=/learn/[slug]
 * - Course not found or not PUBLISHED -> 404
 * - Course has no lessons -> 404
 * - Not enrolled -> auto-enroll and redirect to first lesson
 * - Enrolled + incomplete lessons exist -> redirect to first incomplete lesson
 * - Enrolled + all lessons completed -> redirect to final lesson with celebratory completion state
 */
export default async function LearnCourseRootPage({ params }: LearnCourseRootProps) {
  const { courseSlug } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?redirect=/learn/${courseSlug}`);
  }

  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    select: {
      id: true,
      slug: true,
      status: true,
      modules: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          orderIndex: true,
          lessons: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, slug: true, orderIndex: true },
          },
        },
      },
    },
  });

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  // Flatten all lessons deterministically: Module orderIndex -> Lesson orderIndex
  const allLessons = course.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) {
    notFound();
  }

  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId: course.id,
      },
    },
    select: { id: true },
  });

  if (!enrollment) {
    await db.enrollment.create({
      data: {
        userId: session.userId,
        courseId: course.id,
      },
    });

    await db.courseProgress.upsert({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        userId: session.userId,
        courseId: course.id,
        completedLessons: 0,
        totalLessons: allLessons.length,
        percentage: 0,
        isCompleted: false,
      },
    });
  }

  // Fetch all completed lessons for this learner
  const completedRecords = await db.lessonProgress.findMany({
    where: {
      userId: session.userId,
      lesson: { module: { courseId: course.id } },
      isCompleted: true,
    },
    select: { lessonId: true },
  });

  const completedSet = new Set(completedRecords.map((lp) => lp.lessonId));

  // Deterministically find the first incomplete lesson
  const firstIncompleteLesson = allLessons.find((l) => !completedSet.has(l.id));

  if (firstIncompleteLesson) {
    redirect(`/learn/${courseSlug}/${firstIncompleteLesson.slug}`);
  }

  // All lessons completed: redirect to final lesson with completed parameter
  const lastLesson = allLessons[allLessons.length - 1];
  redirect(`/learn/${courseSlug}/${lastLesson.slug}?completed=true`);
}