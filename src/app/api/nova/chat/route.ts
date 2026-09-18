import { NextRequest, NextResponse } from "next/server";
import { generateAssistantResponse, ChatMessage, LessonContext } from "@/lib/ai-assistant";
import { searchCurriculum, UserContext, UserRole, RetrievalResult } from "@/lib/retrieval";
import { novaRateLimiter } from "@/lib/rate-limiter";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AIMode } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
    const rateCheck = novaRateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many requests to Nova AI. Please wait ${rateCheck.resetSeconds} seconds before sending another message.`,
          retryAfter: rateCheck.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.resetSeconds.toString(),
            "X-RateLimit-Limit": rateCheck.limit.toString(),
            "X-RateLimit-Remaining": rateCheck.remaining.toString(),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { message, conversationId, history, lessonContext, mode } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: "Message exceeds maximum length of 4000 characters." }, { status: 400 });
    }

    const session = await getSession();
    let activeConversationId: string | null = null;
    let resolvedHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    let resolvedLessonContext: LessonContext | undefined = lessonContext;

    // 2. Persistent Conversation Handling for Authenticated Users
    if (session) {
      if (conversationId && typeof conversationId === "string") {
        // Continue existing conversation
        const conversation = await db.aIConversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 8,
              select: { role: true, content: true },
            },
            course: { select: { id: true, title: true, slug: true, status: true, authorId: true } },
            lesson: { select: { id: true, title: true, slug: true, textContent: true, contentType: true } },
          },
        });

        if (!conversation || conversation.userId !== session.userId) {
          return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
        }

        activeConversationId = conversation.id;

        // Auto-hydrate lesson context from conversation if not explicitly provided
        if (!resolvedLessonContext && conversation.lesson && conversation.course) {
          resolvedLessonContext = {
            courseId: conversation.course.id,
            courseTitle: conversation.course.title,
            courseSlug: conversation.course.slug,
            lessonId: conversation.lesson.id,
            lessonTitle: conversation.lesson.title,
            lessonSlug: conversation.lesson.slug,
            textContent: conversation.lesson.textContent,
            contentType: conversation.lesson.contentType,
          };
        }

        // Hydrate conversation history from DB if not passed by client
        if (resolvedHistory.length === 0 && conversation.messages.length > 0) {
          resolvedHistory = conversation.messages.map((m) => ({
            role: m.role.toLowerCase() as "user" | "assistant" | "system",
            content: m.content,
          }));
        }

        // Persist User Message to AIMessage
        await db.aIMessage.create({
          data: {
            conversationId: conversation.id,
            role: "USER",
            content: message.trim(),
          },
        });

        // Update conversation timestamp
        await db.aIConversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });
      } else {
        // Start a brand new persisted conversation
        const smartTitle = message.trim().slice(0, 50).replace(/\r?\n|\r/g, " ");
        let validCourseId: string | null = null;
        let validLessonId: string | null = null;

        if (lessonContext?.courseId) {
          const course = await db.course.findUnique({
            where: { id: lessonContext.courseId },
          });
          if (
            course &&
            (course.status === "PUBLISHED" ||
              course.authorId === session.userId ||
              session.role === "ADMIN")
          ) {
            validCourseId = course.id;
          }
        }

        if (lessonContext?.lessonId) {
          const lesson = await db.lesson.findUnique({
            where: { id: lessonContext.lessonId },
            include: { module: { select: { courseId: true } } },
          });
          if (lesson) {
            validLessonId = lesson.id;
            if (!validCourseId) validCourseId = lesson.module.courseId;
          }
        }

        const conversationMode: AIMode =
          mode && Object.values(AIMode).includes(mode) ? mode : AIMode.DISCOVERY;

        const newConv = await db.$transaction(async (tx) => {
          const conv = await tx.aIConversation.create({
            data: {
              userId: session.userId,
              title: smartTitle || "Learning Session",
              mode: conversationMode,
              courseId: validCourseId,
              lessonId: validLessonId,
            },
          });

          await tx.aIMessage.create({
            data: {
              conversationId: conv.id,
              role: "USER",
              content: message.trim(),
            },
          });

          return conv;
        });

        activeConversationId = newConv.id;
      }
    } else if (conversationId) {
      // Unauthenticated client attempting to access a conversation ID
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to continue a saved conversation." },
        { status: 401 }
      );
    }

    // 3. Curriculum Retrieval (Phase 3D Hybrid Retrieval Integration)
    const userContext: UserContext | undefined = session
      ? { id: session.userId, role: session.role as UserRole }
      : undefined;

    let retrievalResult: RetrievalResult | null = null;
    try {
      retrievalResult = await searchCurriculum(message.trim(), {
        courseId: resolvedLessonContext?.courseId,
        lessonId: resolvedLessonContext?.lessonId,
        user: userContext,
        topK: 5,
        maxTokens: 2000,
      });
    } catch (retrievalErr) {
      console.error("Nova curriculum retrieval error:", retrievalErr);
      retrievalResult = null;
    }

    // 4. Generate Assistant Response (With Prompt Safety & Grounding intact)
    const response = await generateAssistantResponse({
      message: message.trim(),
      history: resolvedHistory,
      lessonContext: resolvedLessonContext,
      retrievedChunks: retrievalResult?.results || [],
    });

    // 5. Persist Assistant Message if active conversation
    if (activeConversationId) {
      try {
        await db.aIMessage.create({
          data: {
            conversationId: activeConversationId,
            role: "ASSISTANT",
            content: response.reply,
          },
        });
      } catch (saveError) {
        console.error("Failed to persist assistant message:", saveError);
      }
    }

    return NextResponse.json(
      {
        conversationId: activeConversationId,
        reply: response.reply,
        suggestedPrompts: response.suggestedPrompts,
        referencedCourses: response.referencedCourses,
        isFallback: response.isFallback,
        modelUsed: response.modelUsed,
        retrieval: retrievalResult
          ? {
              mode: retrievalResult.degradedMode || "HYBRID",
              candidateCount: retrievalResult.totalCandidates,
              sources: retrievalResult.results.map((r) => ({
                courseTitle: r.courseTitle,
                lessonTitle: r.lessonTitle,
                sourceUrl: r.sourceUrl,
                hybridScore: r.hybridScore,
              })),
            }
          : undefined,
      },
      {
        headers: {
          "X-RateLimit-Limit": rateCheck.limit.toString(),
          "X-RateLimit-Remaining": rateCheck.remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error("Nova chat route error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request safely. Please try again." },
      { status: 500 }
    );
  }
}
