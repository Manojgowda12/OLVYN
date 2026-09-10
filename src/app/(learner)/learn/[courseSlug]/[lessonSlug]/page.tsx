import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlayerView } from "./player-view";

interface LearnPageProps {
  params: Promise<{
    courseSlug: string;
    lessonSlug: string;
  }>;
}

export const revalidate = 0;

export default async function LearnLessonPage({ params }: LearnPageProps) {
  const session = await getSession();

  if (!session) {
    const { courseSlug, lessonSlug } = await params;
    redirect(`/login?redirect=/learn/${courseSlug}/${lessonSlug}`);
  }

  const { courseSlug, lessonSlug } = await params;

  // 1. Fetch course with full modules and lessons
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              title: true,
              slug: true,
              durationMinutes: true,
              orderIndex: true,
              contentType: true,
            },
          },
        },
      },
    },
  });

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  // 2. Fetch specific lesson
  const currentLesson = await db.lesson.findFirst({
    where: {
      slug: lessonSlug,
      module: { courseId: course.id },
    },
    include: {
      module: { select: { id: true, title: true } },
      resources: true,
    },
  });

  if (!currentLesson) {
    notFound();
  }

  // 3. Ensure user is enrolled (auto-enroll if accessing lesson directly)
  const existingEnrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId: course.id,
      },
    },
  });

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

  if (!existingEnrollment) {
    await db.enrollment.create({
      data: {
        userId: session.userId,
        courseId: course.id,
      },
    });

    await db.courseProgress.create({
      data: {
        userId: session.userId,
        courseId: course.id,
        completedLessons: 0,
        totalLessons,
        percentage: 0.0,
        isCompleted: false,
      },
    });
  }

  // 4. Fetch user's lesson progress and overall course progress
  const [lessonProgressList, courseProgress] = await Promise.all([
    db.lessonProgress.findMany({
      where: {
        userId: session.userId,
        lesson: { module: { courseId: course.id } },
      },
    }),
    db.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
    }),
  ]);

  const progressMap: Record<string, boolean> = {};
  lessonProgressList.forEach((lp) => {
    progressMap[lp.lessonId] = lp.isCompleted;
  });

  return (
    <PlayerView
      course={course}
      currentLesson={currentLesson}
      initialProgress={progressMap}
      initialCourseProgress={courseProgress}
    />
  );
}
