import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    // If user is not logged in, redirect to login page with return url
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.headers.get("referer") || "/explore");
    return NextResponse.redirect(loginUrl, 303);
  }

  const { id: courseId } = await params;

  // Verify course exists and is published
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: {
          lessons: { select: { id: true } },
        },
      },
    },
  });

  if (!course || course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Course not found or not published." }, { status: 404 });
  }

  const totalLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  );

  // Check existing enrollment
  const existing = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId,
      },
    },
  });

  if (!existing) {
    await db.$transaction([
      db.enrollment.create({
        data: {
          userId: session.userId,
          courseId,
        },
      }),
      db.courseProgress.create({
        data: {
          userId: session.userId,
          courseId,
          completedLessons: 0,
          totalLessons,
          percentage: 0.0,
          isCompleted: false,
        },
      }),
    ]);
  }

  // Redirect to first lesson or course page
  const firstLesson = course.modules[0]?.lessons[0];
  const targetUrl = firstLesson
    ? `/learn/${course.slug}/${course.modules[0].lessons[0].id}`
    : `/courses/${course.slug}`;

  return NextResponse.redirect(new URL(targetUrl, req.url), 303);
}
