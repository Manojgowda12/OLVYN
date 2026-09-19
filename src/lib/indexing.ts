import { db } from "@/lib/db";
import { chunkContent, ContentChunk } from "@/lib/chunking";
import { hashContent } from "@/lib/content-hash";
import { generateEmbedding, EmbeddingError, EmbeddingProviderClient } from "@/lib/embedding";

/**
 * OpenLearnerAI — Production-Scale Lesson Content Indexing Pipeline
 *
 * Phase 4A: Deterministic, Idempotent Lesson Content Indexing Service
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. Deterministic & Idempotent:
 *    - Detects content changes using SHA-256 contentHash.
 *    - Unchanged content skips re-embedding and re-indexing.
 *    - Content modifications replace stale chunks cleanly without orphans.
 * 2. Strict Failure Safety:
 *    - Embedding is performed outside database transactions to avoid long lock times.
 *    - Database chunk updates occur in an atomic transaction.
 *    - Failed indexing updates Document status to FAILED with sanitized error message,
 *      and cleans up any partial/stale chunks to prevent false INDEXED states.
 * 3. Multi-Tenant / Scoping Metadata:
 *    - Every chunk preserves courseId, courseSlug, lessonId, lessonSlug, and chunkIndex.
 * 4. Zero Schema Migrations:
 *    - Fully compatible with existing Document and DocumentChunk schema.
 */

export interface IndexLessonOptions {
  /**
   * Optional Gemini API key override.
   */
  apiKey?: string;

  /**
   * Optional injected provider client for mock testing.
   */
  client?: EmbeddingProviderClient;

  /**
   * If true, forces re-indexing even if contentHash matches.
   */
  force?: boolean;

  /**
   * Target tokens per chunk (default: 400).
   */
  targetTokens?: number;

  /**
   * Maximum tokens per chunk (default: 550).
   */
  maxTokens?: number;
}

export type IndexingResultStatus =
  | "INDEXED"
  | "SKIPPED"
  | "SKIPPED_EMPTY"
  | "FAILED";

export interface IndexLessonResult {
  success: boolean;
  lessonId: string;
  documentId?: string;
  status: IndexingResultStatus;
  contentHash?: string;
  chunkCount: number;
  totalTokens: number;
  reason?: string;
  error?: string;
}

export interface IndexBatchOptions extends IndexLessonOptions {
  /**
   * Maximum concurrent indexing tasks (default: 1 sequential).
   */
  concurrency?: number;

  /**
   * Optional progress callback for logging/reporting.
   */
  onProgress?: (progress: {
    current: number;
    total: number;
    lessonTitle: string;
    courseTitle: string;
    result: IndexLessonResult;
  }) => void;
}

export interface IndexBatchResult {
  totalScanned: number;
  indexed: number;
  skipped: number;
  empty: number;
  failed: number;
  results: IndexLessonResult[];
}

/**
 * Sanitizes internal errors to prevent leaking database strings or credentials.
 */
function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof EmbeddingError) {
    return error.message;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("api key") || msg.includes("credentials")) {
      return "Embedding provider authentication error.";
    }
    if (msg.includes("rate limit") || msg.includes("quota") || msg.includes("429")) {
      return "Embedding provider rate limit exceeded.";
    }
    return error.message;
  }
  return "An unexpected error occurred during indexing.";
}

/**
 * Indexes a single lesson's textContent into Document and DocumentChunk tables.
 * Deterministic and idempotent.
 */
export async function indexLessonContent(
  lessonId: string,
  options: IndexLessonOptions = {}
): Promise<IndexLessonResult> {
  // 1. Load lesson and required module/course relationship
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    return {
      success: false,
      lessonId,
      status: "FAILED",
      chunkCount: 0,
      totalTokens: 0,
      reason: "Lesson not found in database",
      error: "Lesson not found in database",
    };
  }

  const course = lesson.module?.course;
  if (!course) {
    return {
      success: false,
      lessonId,
      status: "FAILED",
      chunkCount: 0,
      totalTokens: 0,
      reason: "Lesson parent module or course not found",
      error: "Lesson parent module or course not found",
    };
  }

  // 2. Handle empty or whitespace-only textContent
  const rawContent = lesson.textContent;
  if (!rawContent || rawContent.trim().length === 0) {
    // If a Document was previously indexed for this lesson, clean it up so stale chunks are removed
    const priorDocs = await db.document.findMany({
      where: { lessonId: lesson.id, sourceType: "LESSON_CONTENT" },
    });
    if (priorDocs.length > 0) {
      await db.document.deleteMany({
        where: { lessonId: lesson.id, sourceType: "LESSON_CONTENT" },
      });
    }

    return {
      success: true,
      lessonId: lesson.id,
      status: "SKIPPED_EMPTY",
      chunkCount: 0,
      totalTokens: 0,
      reason: "Lesson textContent is null or empty",
    };
  }

  // 3. Compute deterministic SHA-256 content hash
  const contentDigest = hashContent(rawContent);

  // 4. Query existing Document records for this lesson (and resolve duplicates if any)
  const existingDocs = await db.document.findMany({
    where: { lessonId: lesson.id, sourceType: "LESSON_CONTENT" },
    include: {
      chunks: {
        select: {
          id: true,
          tokenCount: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Consolidate duplicates if found: keep primary, delete excess
  let primaryDoc = existingDocs[0] || null;
  if (existingDocs.length > 1) {
    const surplusDocIds = existingDocs.slice(1).map((d) => d.id);
    await db.document.deleteMany({
      where: { id: { in: surplusDocIds } },
    });
  }

  // 5. Idempotency Check:
  // If the lesson content has NOT changed, do not regenerate embeddings or recreate chunks
  if (
    primaryDoc &&
    primaryDoc.status === "INDEXED" &&
    primaryDoc.contentHash === contentDigest &&
    primaryDoc.chunks.length > 0 &&
    !options.force
  ) {
    const totalTokens = primaryDoc.chunks.reduce((sum, c) => sum + c.tokenCount, 0);
    return {
      success: true,
      lessonId: lesson.id,
      documentId: primaryDoc.id,
      status: "SKIPPED",
      contentHash: contentDigest,
      chunkCount: primaryDoc.chunks.length,
      totalTokens,
      reason: "Content hash unchanged; already indexed",
    };
  }

  // 6. Deterministic Markdown Chunking
  const chunks: ContentChunk[] = chunkContent(
    rawContent,
    {
      sourceTitle: lesson.title,
      sourceType: "LESSON_TEXT",
      courseId: course.id,
      courseSlug: course.slug,
      lessonId: lesson.id,
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
    },
    {
      targetTokens: options.targetTokens ?? 400,
      maxTokens: options.maxTokens ?? 550,
    }
  );

  if (chunks.length === 0) {
    return {
      success: true,
      lessonId: lesson.id,
      status: "SKIPPED_EMPTY",
      chunkCount: 0,
      totalTokens: 0,
      reason: "Chunking produced 0 valid chunks from textContent",
    };
  }

  // 7. Ensure Document exists in PENDING state before executing external calls
  let docId: string;
  if (primaryDoc) {
    const updated = await db.document.update({
      where: { id: primaryDoc.id },
      data: {
        courseId: course.id,
        contentHash: contentDigest,
        status: "PENDING",
        errorMessage: null,
      },
    });
    docId = updated.id;
  } else {
    const created = await db.document.create({
      data: {
        courseId: course.id,
        lessonId: lesson.id,
        sourceType: "LESSON_CONTENT",
        contentHash: contentDigest,
        status: "PENDING",
      },
    });
    docId = created.id;
  }

  // 8. Generate Embeddings (Outside DB transaction to avoid prolonged table locks)
  const vectors: number[][] = [];
  try {
    for (const chunk of chunks) {
      const vector = await generateEmbedding(chunk.content, {
        model: "gemini-embedding-2",
        dimensions: 768,
        apiKey: options.apiKey,
        client: options.client,
      });

      if (vector.length !== 768) {
        throw new Error(`Invalid embedding dimensions: ${vector.length}, expected 768.`);
      }

      vectors.push(vector);
    }
  } catch (embedError) {
    const sanitizedError = sanitizeErrorMessage(embedError);

    // FAILURE SAFETY: Update document to FAILED and purge any partial/stale chunks
    await db.document.update({
      where: { id: docId },
      data: {
        status: "FAILED",
        errorMessage: sanitizedError,
      },
    });

    await db.documentChunk.deleteMany({
      where: { documentId: docId },
    });

    return {
      success: false,
      lessonId: lesson.id,
      documentId: docId,
      status: "FAILED",
      contentHash: contentDigest,
      chunkCount: 0,
      totalTokens: 0,
      error: sanitizedError,
    };
  }

  // 9. Atomic Database Persistence Transaction
  try {
    const totalTokens = chunks.reduce((acc, c) => acc + c.estimatedTokenCount, 0);

    await db.$transaction(async (tx) => {
      // Step A: Safely remove previous chunks for this document
      await tx.documentChunk.deleteMany({
        where: { documentId: docId },
      });

      // Step B: Insert new chunks with 768-dim vector embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vector = vectors[i];
        const chunkId = `chk_${docId.slice(-8)}_${chunk.chunkIndex}_${Date.now()}`;
        const vectorLiteral = `[${vector.join(",")}]`;

        const metadata = JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          courseSlug: course.slug,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonSlug: lesson.slug,
          sourceType: "LESSON_CONTENT",
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunks.length,
        });

        await tx.$executeRawUnsafe(
          `INSERT INTO "DocumentChunk" (
            "id", "documentId", "chunkIndex", "content", "tokenCount",
            "embedding", "embeddingModel", "embeddingVersion", "metadata",
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6::vector, $7, $8, $9::jsonb,
            NOW(), NOW()
          )`,
          chunkId,
          docId,
          chunk.chunkIndex,
          chunk.content,
          chunk.estimatedTokenCount,
          vectorLiteral,
          "gemini-embedding-2",
          "1",
          metadata
        );
      }

      // Step C: Mark Document as INDEXED only after chunks have succeeded
      await tx.document.update({
        where: { id: docId },
        data: {
          status: "INDEXED",
          errorMessage: null,
          contentHash: contentDigest,
        },
      });
    });

    return {
      success: true,
      lessonId: lesson.id,
      documentId: docId,
      status: "INDEXED",
      contentHash: contentDigest,
      chunkCount: chunks.length,
      totalTokens,
    };
  } catch (dbError) {
    const sanitizedError = sanitizeErrorMessage(dbError);

    // Rollback document state to FAILED
    await db.document.update({
      where: { id: docId },
      data: {
        status: "FAILED",
        errorMessage: sanitizedError,
      },
    });

    await db.documentChunk.deleteMany({
      where: { documentId: docId },
    });

    return {
      success: false,
      lessonId: lesson.id,
      documentId: docId,
      status: "FAILED",
      contentHash: contentDigest,
      chunkCount: 0,
      totalTokens: 0,
      error: sanitizedError,
    };
  }
}

/**
 * Discovers all eligible lessons for indexing across the database.
 * Eligibility: textContent is not null and not empty.
 */
export async function discoverEligibleLessons(filter?: {
  courseIdOrSlug?: string;
}): Promise<
  Array<{
    id: string;
    title: string;
    slug: string;
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    courseStatus: string;
  }>
> {
  const whereClause: any = {
    textContent: { not: null },
  };

  if (filter?.courseIdOrSlug) {
    whereClause.module = {
      course: {
        OR: [{ id: filter.courseIdOrSlug }, { slug: filter.courseIdOrSlug }],
      },
    };
  }

  const lessons = await db.lesson.findMany({
    where: whereClause,
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: [
      { module: { courseId: "asc" } },
      { module: { orderIndex: "asc" } },
      { orderIndex: "asc" },
    ],
  });

  return lessons
    .filter((l) => l.textContent && l.textContent.trim().length > 0)
    .map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      courseId: l.module.course.id,
      courseTitle: l.module.course.title,
      courseSlug: l.module.course.slug,
      courseStatus: l.module.course.status,
    }));
}

/**
 * Batch processes an array of lesson IDs with configurable concurrency.
 */
export async function indexLessonsBatch(
  lessons: Array<{ id: string; title: string; courseTitle: string }>,
  options: IndexBatchOptions = {}
): Promise<IndexBatchResult> {
  const concurrency = Math.max(1, options.concurrency ?? 1);
  const results: IndexLessonResult[] = [];
  let indexed = 0;
  let skipped = 0;
  let empty = 0;
  let failed = 0;

  const queue = [...lessons];
  let currentIndex = 0;
  const total = lessons.length;

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      currentIndex++;
      const result = await indexLessonContent(item.id, options);
      results.push(result);

      if (result.status === "INDEXED") indexed++;
      else if (result.status === "SKIPPED") skipped++;
      else if (result.status === "SKIPPED_EMPTY") empty++;
      else if (result.status === "FAILED") failed++;

      if (options.onProgress) {
        options.onProgress({
          current: currentIndex,
          total,
          lessonTitle: item.title,
          courseTitle: item.courseTitle,
          result,
        });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, lessons.length) }, () => worker());
  await Promise.all(workers);

  return {
    totalScanned: lessons.length,
    indexed,
    skipped,
    empty,
    failed,
    results,
  };
}
