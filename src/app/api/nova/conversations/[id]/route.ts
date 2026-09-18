import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view this conversation." },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;

    const conversation = await db.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
        course: {
          select: { id: true, title: true, slug: true },
        },
        lesson: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    if (!conversation || conversation.userId !== session.userId) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

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
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase() as "user" | "assistant" | "system",
          content: m.content,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching conversation details." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to delete conversations." },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;

    const conversation = await db.aIConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.userId) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    await db.aIConversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error deleting conversation." },
      { status: 500 }
    );
  }
}
