import { NextRequest, NextResponse } from "next/server";
import { generateAssistantResponse, ChatMessage, LessonContext } from "@/lib/ai-assistant";
import { searchCurriculum, UserContext, UserRole, RetrievalResult } from "@/lib/retrieval";
import { novaRateLimiter } from "@/lib/rate-limiter";
import { getAuthenticatedUser } from "@/lib/auth-service";
import { getUserMemories, extractUserMemories } from "@/lib/memory";
import { classifyNovaQuery, NovaClassificationResult } from "@/lib/nova-router";
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

    const auth = await getAuthenticatedUser();
    let activeConversationId: string | null = null;
    let resolvedHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    let resolvedLessonContext: LessonContext | undefined = lessonContext;
    let activeUserMemories: Array<{ memoryType: any; key: string; value: string }> = [];

    // 2. Persistent Conversation & Personal Memory for Authenticated Users (Parallelized)
    if (auth) {
      const memoryPromise = auth.user.memoryEnabled
        ? getUserMemories(auth.user.id, { limit: 5 }).catch((memErr) => {
            console.warn("Could not retrieve user memories:", memErr);
            return [];
          })
        : Promise.resolve([]);

      const conversationPromise =
        conversationId && typeof conversationId === "string"
          ? db.aIConversation.findUnique({
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
            })
          : Promise.resolve(null);

      const [memories, conversation] = await Promise.all([memoryPromise, conversationPromise]);
      activeUserMemories = memories;

      if (conversationId && typeof conversationId === "string") {
        if (!conversation || conversation.userId !== auth.user.id) {
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
              course.authorId === auth.user.id ||
              auth.role === "ADMIN")
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
              userId: auth.user.id,
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

    // 3. Query Intent Classification & Gated Curriculum Retrieval
    const classification = classifyNovaQuery(message.trim(), {
      lessonContext: resolvedLessonContext,
    });

    const userContext: UserContext | undefined = auth
      ? { id: auth.user.id, role: auth.role as UserRole }
      : undefined;

    let retrievalResult: RetrievalResult | null = null;

    // GATING RULE:
    // Only invoke curriculum retrieval when the question specifically requires
    // course, lesson, or resource grounding.
    // General knowledge questions ("what is AI", "what is recursion", etc.)
    // MUST NOT retrieve curriculum or force grounding into an active lesson.
    const shouldInvokeRetrieval =
      classification.intent === "LESSON" ||
      classification.intent === "COURSE" ||
      classification.intent === "RESOURCE";

    if (shouldInvokeRetrieval) {
      try {
        let targetCourseId = resolvedLessonContext?.courseId;
        let targetLessonId: string | undefined = undefined;

        if (classification.intent === "LESSON") {
          targetLessonId = resolvedLessonContext?.lessonId;
        } else if (classification.targetCourseSlug) {
          // Explicit cross-course scoping by name
          const targetCourse = await db.course.findUnique({
            where: { slug: classification.targetCourseSlug },
            select: { id: true },
          });
          if (targetCourse) targetCourseId = targetCourse.id;
        }

        retrievalResult = await searchCurriculum(message.trim(), {
          courseId: targetCourseId,
          lessonId: targetLessonId,
          user: userContext,
          topK: 5,
          maxTokens: 2000,
        });

        // Step 9: Safe Relevance Gate
        // Filter out low-relevance results to avoid hallucinating course grounding on vague queries
        if (retrievalResult && retrievalResult.results.length > 0) {
          const relevantChunks = retrievalResult.results.filter(
            (c) => c.keywordScore > 0 || c.semanticScore >= 0.50
          );
          if (relevantChunks.length > 0) {
            retrievalResult.results = relevantChunks;
          } else {
            // Prefer NO RETRIEVAL over WRONG RETRIEVAL
            retrievalResult = null;
          }
        }
      } catch (retrievalErr) {
        console.error("Nova curriculum retrieval error:", retrievalErr);
        retrievalResult = null;
      }
    }

    // 4. Generate Assistant Response (With User Memory & Curriculum Grounding intact)
    // For GENERAL questions, active lesson is NOT passed so the model doesn't force grounding into it.
    const effectiveLessonContext =
      classification.intent === "LESSON" || classification.intent === "COURSE"
        ? resolvedLessonContext
        : undefined;

    const response = await generateAssistantResponse({
      message: message.trim(),
      history: resolvedHistory,
      lessonContext: effectiveLessonContext,
      retrievedChunks: retrievalResult?.results || [],
      userMemories: activeUserMemories,
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

    // 6. Asynchronous Memory Extraction in Background (Non-blocking)
    if (auth && auth.user.memoryEnabled) {
      extractUserMemories({
        userId: auth.user.id,
        conversationId: activeConversationId || undefined,
        userMessage: message.trim(),
        assistantReply: response.reply,
      }).catch((extractErr) => {
        console.warn("Background memory extraction error:", extractErr);
      });
    }

    return NextResponse.json(
      {
        conversationId: activeConversationId,
        reply: response.reply,
        suggestedPrompts: response.suggestedPrompts,
        referencedCourses: response.referencedCourses,
        isFallback: response.isFallback,
        modelUsed: response.modelUsed,
        retrieval:
          retrievalResult && retrievalResult.results.length > 0
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
