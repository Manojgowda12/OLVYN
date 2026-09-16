import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface CourseFilterParams {
  query?: string;
  category?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
}

export async function getPublishedCourses(params: CourseFilterParams = {}) {
  const { query, category, difficulty, page = 1, limit = 12 } = params;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
  };

  if (category && category !== "all") {
    whereClause.category = {
      slug: category,
    };
  }

  if (difficulty && difficulty !== "all") {
    whereClause.difficulty = difficulty as any;
  }

  if (query && query.trim().length > 0) {
    const q = query.trim();
    whereClause.OR = [
      { title: { contains: q } },
      { shortSummary: { contains: q } },
      { description: { contains: q } },
      {
        tags: {
          some: {
            tag: {
              name: { contains: q },
            },
          },
        },
      },
    ];
  }

  const [total, courses] = await Promise.all([
    db.course.count({ where: whereClause }),
    db.course.findMany({
      where: whereClause,
      include: {
        category: true,
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        tags: {
          include: { tag: true },
        },
        modules: {
          select: {
            id: true,
            lessons: {
              select: { id: true, durationMinutes: true },
            },
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const formattedCourses = courses.map((course) => {
    const totalLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.length,
      0
    );
    const calculatedMinutes = course.modules.reduce(
      (acc, m) =>
        acc +
        m.lessons.reduce((lAcc, l) => lAcc + (l.durationMinutes || 0), 0),
      0
    );

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      shortSummary: course.shortSummary,
      difficulty: course.difficulty,
      language: course.language,
      estimatedHours: course.estimatedHours || Math.round((calculatedMinutes / 60) * 10) / 10,
      thumbnailUrl: course.thumbnailUrl,
      category: course.category,
      author: course.author,
      tags: course.tags.map((t) => t.tag),
      totalModules: course.modules.length,
      totalLessons,
      publishedAt: course.publishedAt,
    };
  });

  return {
    courses: formattedCourses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCourseBySlug(slug: string, userId?: string) {
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      category: true,
      author: {
        select: { id: true, name: true, bio: true, avatarUrl: true },
      },
      tags: {
        include: { tag: true },
      },
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: {
              resources: true,
            },
          },
        },
      },
    },
  });

  if (!course) return null;

  // If user is logged in, check enrollment and lesson progress
  let enrollment = null;
  let progress: Record<string, boolean> = {};
  let courseProgress = null;

  if (userId) {
    [enrollment, courseProgress] = await Promise.all([
      db.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
      }),
      db.courseProgress.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
      }),
    ]);

    const lessonProgressRecords = await db.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          module: { courseId: course.id },
        },
      },
    });

    lessonProgressRecords.forEach((lp) => {
      progress[lp.lessonId] = lp.isCompleted;
    });
  }

  const totalLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  );

  return {
    ...course,
    isEnrolled: !!enrollment,
    progress,
    courseProgress,
    totalLessons,
  };
}
