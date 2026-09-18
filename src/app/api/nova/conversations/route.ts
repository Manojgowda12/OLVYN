import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AIMode } from "@prisma/client";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access conversation history." },
        { status: 401 }
      );
    }

    const conversations = await db.aIConversation.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
        course: {
          select: { id: true, title: true, slug: true },
        },
        lesson: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
        courseId: c.courseId,
        courseTitle: c.course?.title,
        courseSlug: c.course?.slug,
        lessonId: c.lessonId,
        lessonTitle: c.lesson?.title,
        lessonSlug: c.lesson?.slug,
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching conversations." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to create a conversation." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { title, mode, courseId, lessonId } = body;

    let validCourseId: string | null = null;
    let validLessonId: string | null = null;

    // Validate course access if attached
    if (courseId && typeof courseId === "string") {
      const course = await db.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }

      // Ensure course is either published, or user is author/admin
      if (
        course.status !== "PUBLISHED" &&
        course.authorId !== session.userId &&
        session.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "Forbidden. You do not have permission to access this course context." },
          { status: 403 }
        );
      }

      validCourseId = course.id;
    }

    // Validate lesson access if attached
    if (lessonId && typeof lessonId === "string") {
      const lesson = await db.lesson.findUnique({
        where: { id: lessonId },
        include: { module: { include: { course: true } } },
      });

      if (!lesson) {
        return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
      }

      const parentCourse = lesson.module.course;
      if (
        parentCourse.status !== "PUBLISHED" &&
        parentCourse.authorId !== session.userId &&
        session.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "Forbidden. You do not have permission to access this lesson context." },
          { status: 403 }
        );
      }

      validLessonId = lesson.id;
      validCourseId = parentCourse.id;
    }

    const conversationMode: AIMode =
      mode && Object.values(AIMode).includes(mode) ? mode : AIMode.DISCOVERY;

    const conversation = await db.aIConversation.create({
      data: {
        userId: session.userId,
        title: typeof title === "string" && title.trim() ? title.trim().slice(0, 100) : "Learning Session",
        mode: conversationMode,
        courseId: validCourseId,
        lessonId: validLessonId,
      },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        lesson: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        mode: conversation.mode,
        courseId: conversation.courseId,
        courseTitle: conversation.course?.title,
        courseSlug: conversation.course?.slug,
        lessonId: conversation.lessonId,
        lessonTitle: conversation.lesson?.title,
        lessonSlug: conversation.lesson?.slug,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error creating conversation." },
      { status: 500 }
    );
  }
}
