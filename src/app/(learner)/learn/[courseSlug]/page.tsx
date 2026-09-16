import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface LearnCourseRootProps {
  params: Promise<{ courseSlug: string }>;
}

export const revalidate = 0;

type CourseWithFirstLesson = Prisma.CourseGetPayload<{
  select: {
    id: true;
    slug: true;
    status: true;
    modules: {
      select: {
        lessons: {
          select: { id: true; slug: true };
        };
      };
    };
  };
}>;

type ModuleWithLessons = CourseWithFirstLesson["modules"][number];

/**
 * /learn/[courseSlug]
 *
 * Entry-point for starting or resuming a course. Redirects to the correct lesson.
 *
 * Rules:
 * - Not authenticated -> redirect to /login?redirect=/learn/[slug]
 * - Course not found or not PUBLISHED -> 404
 * - Course has no lessons -> 404
 * - Not enrolled -> redirect to /courses/[slug] (explicit enrollment required)
 * - Enrolled + has lastLessonId progress -> resume that lesson
 * - Enrolled + no progress -> redirect to first lesson
 */
export default async function LearnCourseRootPage({ params }: LearnCourseRootProps) {
  const { courseSlug } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?redirect=/learn/${courseSlug}`);
  }

  const course: CourseWithFirstLesson | null = await db.course.findUnique({
    where: { slug: courseSlug },
    select: {
      id: true,
      slug: true,
      status: true,
      modules: {
        orderBy: { orderIndex: "asc" },
        select: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, slug: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  const firstLesson = course.modules.find((m: ModuleWithLessons) => m.lessons.length > 0)?.lessons[0];
  if (!firstLesson) {
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
    redirect(`/courses/${courseSlug}`);
  }

  const progress = await db.courseProgress.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId: course.id,
      },
    },
    select: { lastLessonId: true },
  });

  if (progress?.lastLessonId) {
    const lastLesson = await db.lesson.findUnique({
      where: { id: progress.lastLessonId },
      select: { slug: true },
    });
    if (lastLesson) {
      redirect(`/learn/${courseSlug}/${lastLesson.slug}`);
    }
  }

  redirect(`/learn/${courseSlug}/${firstLesson.slug}`);
}