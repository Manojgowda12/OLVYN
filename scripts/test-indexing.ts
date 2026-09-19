import fs from "fs";
import path from "path";

// 1. Safely load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val) process.env[key] = val;
    }
  }
}

import { db } from "../src/lib/db";
import { hashContent } from "../src/lib/content-hash";
import {
  indexLessonContent,
  discoverEligibleLessons,
  IndexLessonResult,
} from "../src/lib/indexing";
import { EmbeddingProviderClient } from "../src/lib/embedding";

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, description: string) {
  totalAssertions++;
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passedAssertions++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

/**
 * Deterministic mock embedding client for testing without external API dependency or quota consumption.
 */
function createMockEmbeddingClient(config: { fail?: boolean; trackCalls?: () => void } = {}): EmbeddingProviderClient {
  return {
    models: {
      embedContent: async (params) => {
        if (config.fail) {
          throw new Error("Provider Network Failure (503 Service Unavailable)");
        }
        if (config.trackCalls) {
          config.trackCalls();
        }

        // Generate a deterministic 768-dim vector seeded from the content
        const hash = hashContent(params.contents);
        const values: number[] = new Array(768);
        for (let i = 0; i < 768; i++) {
          const byteVal = parseInt(hash.slice((i % 32) * 2, (i % 32) * 2 + 2) || "7f", 16);
          values[i] = ((byteVal / 255) * 2 - 1) * (1 / Math.sqrt(768));
        }

        return {
          embeddings: [{ values }],
        };
      },
    },
  };
}

async function runIndexingTestSuite() {
  console.log("==================================================================");
  console.log("🚀 OPENLEARNERAI — PHASE 4A LESSON CONTENT INDEXING TEST SUITE");
  console.log("==================================================================\n");

  // Track temporary test data for guaranteed cleanup
  let tempCourseId: string | null = null;
  let tempModuleId: string | null = null;
  let tempLessonAId: string | null = null;
  let tempLessonBId: string | null = null;
  let tempEmptyLessonId: string | null = null;

  try {
    // 0. Baseline counts before test
    console.log("--- Baseline Data Safety Audit ---");
    const baselineCounts = {
      user: await db.user.count(),
      course: await db.course.count(),
      module: await db.module.count(),
      lesson: await db.lesson.count(),
      resource: await db.resource.count(),
      fileAsset: await db.fileAsset.count(),
      aiConversation: await db.aIConversation.count(),
      aiMessage: await db.aIMessage.count(),
    };
    console.log(`  Existing Courses: ${baselineCounts.course}, Lessons: ${baselineCounts.lesson}\n`);

    // Setup temporary isolated test course, module, and lessons
    const author = await db.user.findFirst({ where: { role: "ADMIN" } });
    if (!author) throw new Error("No admin user found for test setup.");

    const tempCourse = await db.course.create({
      data: {
        title: "Test Indexing Pipeline Course",
        slug: `test-indexing-${Date.now()}`,
        shortSummary: "Temporary summary for indexing pipeline tests",
        description: "Temporary course for indexing pipeline tests",
        status: "PUBLISHED",
        authorId: author.id,
      },
    });
    tempCourseId = tempCourse.id;

    const tempModule = await db.module.create({
      data: {
        courseId: tempCourse.id,
        title: "Module 1: Test Fundamentals",
        orderIndex: 0,
      },
    });
    tempModuleId = tempModule.id;

    const testTextA = `# Lesson A: Introduction to Testing\n\nThis is the first paragraph explaining unit testing.\n\n\`\`\`typescript\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n\`\`\`\n\nFinal summary paragraph about test-driven development.`;

    const tempLessonA = await db.lesson.create({
      data: {
        moduleId: tempModule.id,
        title: "Lesson A: Test Fundamentals",
        slug: "lesson-a-test-fundamentals",
        contentType: "TEXT",
        textContent: testTextA,
        orderIndex: 0,
      },
    });
    tempLessonAId = tempLessonA.id;

    const tempLessonB = await db.lesson.create({
      data: {
        moduleId: tempModule.id,
        title: "Lesson B: Advanced Mocking",
        slug: "lesson-b-advanced-mocking",
        contentType: "TEXT",
        textContent: "Mocking external services allows isolated testing of business logic.",
        orderIndex: 1,
      },
    });
    tempLessonBId = tempLessonBId = tempLessonB.id;

    const tempEmptyLesson = await db.lesson.create({
      data: {
        moduleId: tempModule.id,
        title: "Lesson Empty: No Text Content",
        slug: "lesson-empty-no-text",
        contentType: "TEXT",
        textContent: "   \n\n   ", // Whitespace only
        orderIndex: 2,
      },
    });
    tempEmptyLessonId = tempEmptyLesson.id;

    console.log("--- Test Group 1: Missing & Empty Content Validation ---");

    // Test 1: Missing lesson handling
    const nonExistentResult = await indexLessonContent("non-existent-lesson-id-88888");
    assert(
      !nonExistentResult.success && nonExistentResult.status === "FAILED",
      "Test 1: Non-existent lesson returns FAILED status without crashing"
    );

    // Test 2: Empty lesson content handling
    const emptyResult = await indexLessonContent(tempEmptyLesson.id);
    assert(
      emptyResult.success &&
        emptyResult.status === "SKIPPED_EMPTY" &&
        emptyResult.chunkCount === 0,
      "Test 2: Empty/whitespace textContent returns SKIPPED_EMPTY without chunking"
    );

    const emptyDocCount = await db.document.count({
      where: { lessonId: tempEmptyLesson.id },
    });
    assert(
      emptyDocCount === 0,
      "Test 2b: No Document created for empty/whitespace lesson"
    );

    console.log("\n--- Test Group 2: First Successful Indexing & Persistence ---");

    // Test 3: First successful indexing with mock embedding client
    const mockClient = createMockEmbeddingClient();
    const result1: IndexLessonResult = await indexLessonContent(tempLessonA.id, {
      client: mockClient,
    });

    assert(
      result1.success && result1.status === "INDEXED" && !!result1.documentId,
      "Test 3: First indexing of valid lesson succeeds with INDEXED status"
    );

    // Test 4: Deterministic content hash verification
    const expectedHashA = hashContent(testTextA);
    assert(
      result1.contentHash === expectedHashA,
      "Test 4: Returned contentHash matches deterministic SHA-256 digest"
    );

    const dbDoc1 = await db.document.findUnique({
      where: { id: result1.documentId },
    });
    assert(
      dbDoc1?.contentHash === expectedHashA && dbDoc1?.status === "INDEXED",
      "Test 4b: Document in PostgreSQL contains matching contentHash and INDEXED status"
    );

    // Test 5: Chunk creation & embedding persistence in pgvector
    const chunks = await db.documentChunk.findMany({
      where: { documentId: result1.documentId },
      orderBy: { chunkIndex: "asc" },
    });
    assert(
      chunks.length > 0 && chunks.length === result1.chunkCount,
      "Test 5: Correct number of DocumentChunk rows persisted"
    );

    // Verify vector dimensions and tsvector in PostgreSQL
    const checkDims = await db.$queryRawUnsafe<Array<{ dims: number; has_tsv: boolean }>>(
      `SELECT vector_dims(embedding) AS dims, ("tsvContent" IS NOT NULL) AS has_tsv FROM "DocumentChunk" WHERE "documentId" = $1`,
      result1.documentId
    );
    assert(
      checkDims.length > 0 && checkDims.every((c) => c.dims === 768 && c.has_tsv),
      "Test 5b: Every chunk has verified 768-dim vector and generated tsvector"
    );

    // Test 6: Chunk metadata & provenance
    const firstChunk = chunks[0];
    const meta = firstChunk.metadata as any;
    assert(
      meta.courseId === tempCourse.id &&
        meta.lessonId === tempLessonA.id &&
        meta.sourceType === "LESSON_CONTENT" &&
        meta.chunkIndex === 0,
      "Test 6: Chunk metadata contains complete course/lesson provenance"
    );

    console.log("\n--- Test Group 3: Idempotency (Unchanged Content) ---");

    // Test 7: Idempotent re-run skips embedding generation
    let embedCalls = 0;
    const trackingClient = createMockEmbeddingClient({
      trackCalls: () => {
        embedCalls++;
      },
    });

    const result2: IndexLessonResult = await indexLessonContent(tempLessonA.id, {
      client: trackingClient,
    });

    assert(
      result2.success &&
        result2.status === "SKIPPED" &&
        result2.documentId === result1.documentId &&
        result2.contentHash === expectedHashA,
      "Test 7: Re-indexing unchanged content returns SKIPPED status with existing documentId"
    );
    assert(
      embedCalls === 0,
      "Test 7b: Zero embedding API calls made when content is unchanged"
    );

    console.log("\n--- Test Group 4: Changed Content & Stale Chunk Replacement ---");

    // Test 8: Modifying content replaces stale chunks
    const updatedTextA = `# Lesson A: Introduction to Testing (Updated)\n\nThis content has been significantly modified with new sections.\n\n\`\`\`typescript\nconst x = 42;\n\`\`\`\n\nAdditional text ensuring new token sizing and chunks.`;
    await db.lesson.update({
      where: { id: tempLessonA.id },
      data: { textContent: updatedTextA },
    });

    const result3: IndexLessonResult = await indexLessonContent(tempLessonA.id, {
      client: mockClient,
    });

    const expectedNewHash = hashContent(updatedTextA);
    assert(
      result3.success &&
        result3.status === "INDEXED" &&
        result3.contentHash === expectedNewHash,
      "Test 8: Modified content successfully re-indexes with new contentHash"
    );

    const newChunks = await db.documentChunk.findMany({
      where: { documentId: result3.documentId },
    });
    assert(
      newChunks.length > 0 &&
        newChunks.every(
          (c) =>
            c.content.includes("Introduction to Testing (Updated)") ||
            c.content.includes("Additional text")
        ),
      "Test 8b: Stale chunks were completely replaced by new content chunks"
    );

    console.log("\n--- Test Group 5: Failure Safety & Rollback ---");

    // Test 9: Embedding failure sets FAILED status and prevents false INDEXED state
    const failingClient = createMockEmbeddingClient({ fail: true });
    const failingResult: IndexLessonResult = await indexLessonContent(tempLessonA.id, {
      client: failingClient,
      force: true,
    });

    assert(
      !failingResult.success && failingResult.status === "FAILED",
      "Test 9: Embedding failure returns FAILED status"
    );

    const failedDoc = await db.document.findUnique({
      where: { id: result3.documentId },
    });
    assert(
      failedDoc?.status === "FAILED" && !!failedDoc?.errorMessage,
      "Test 9b: Document in PostgreSQL is marked FAILED with sanitized error message"
    );

    const postFailChunks = await db.documentChunk.count({
      where: { documentId: result3.documentId },
    });
    assert(
      postFailChunks === 0,
      "Test 9c: Partial/stale chunks purged upon failure to prevent false retrieval matches"
    );

    console.log("\n--- Test Group 6: Multi-Lesson Isolation & Duplicate Prevention ---");

    // Re-index Lesson A cleanly
    await indexLessonContent(tempLessonA.id, { client: mockClient, force: true });

    // Test 10: Index Lesson B
    const resultB = await indexLessonContent(tempLessonB.id, { client: mockClient });
    assert(
      resultB.success && resultB.status === "INDEXED",
      "Test 10: Indexing second lesson succeeds independently"
    );

    const docCountA = await db.document.count({
      where: { lessonId: tempLessonA.id, sourceType: "LESSON_CONTENT" },
    });
    const docCountB = await db.document.count({
      where: { lessonId: tempLessonB.id, sourceType: "LESSON_CONTENT" },
    });
    assert(
      docCountA === 1 && docCountB === 1,
      "Test 10b: Exactly one Document per lesson; no duplicates created"
    );

    // Test 11: Zero orphaned chunks
    const orphanCount = await db.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT count(*)::int AS count
      FROM "DocumentChunk" c
      LEFT JOIN "Document" d ON c."documentId" = d.id
      WHERE d.id IS NULL
    `);
    assert(
      Number(orphanCount[0]?.count || 0) === 0,
      "Test 11: Zero orphaned DocumentChunk rows exist in PostgreSQL"
    );

    // Test 12: Discovery function works properly
    const eligible = await discoverEligibleLessons({ courseIdOrSlug: tempCourse.id });
    assert(
      eligible.length === 2 && eligible.every((e) => e.courseId === tempCourse.id),
      "Test 12: discoverEligibleLessons finds only lessons with non-empty textContent"
    );

    console.log("\n--- Test Group 7: Cleanup & Baseline Platform Integrity ---");

    // Clean up temporary test data
    await db.course.delete({ where: { id: tempCourse.id } }); // Cascades to Module, Lesson, Document, DocumentChunk
    tempCourseId = null;

    // Verify baseline counts unchanged
    const finalCounts = {
      user: await db.user.count(),
      course: await db.course.count(),
      module: await db.module.count(),
      lesson: await db.lesson.count(),
      resource: await db.resource.count(),
      fileAsset: await db.fileAsset.count(),
      aiConversation: await db.aIConversation.count(),
      aiMessage: await db.aIMessage.count(),
    };

    assert(
      baselineCounts.course === finalCounts.course &&
        baselineCounts.lesson === finalCounts.lesson &&
        baselineCounts.user === finalCounts.user,
      "Test 13: Core platform tables are identical to baseline after test cleanup"
    );

    // Verify the pre-existing production lesson document is still INDEXED
    const prodDoc = await db.document.findFirst({
      where: { status: "INDEXED", sourceType: "LESSON_CONTENT" },
      include: { chunks: true },
    });
    assert(
      !!prodDoc && prodDoc.chunks.length > 0,
      "Test 14: Pre-existing Phase 3B production test document remains INDEXED"
    );

    console.log("\n==================================================================");
    console.log(`✨ ALL ${passedAssertions}/${totalAssertions} PHASE 4A INDEXING TESTS PASSED!`);
    console.log("==================================================================");
  } catch (err: any) {
    console.error("\n❌ TEST SUITE FAILURE:", err.message || err);
    process.exitCode = 1;
  } finally {
    // Ensure temporary course cleanup if test aborted prematurely
    if (tempCourseId) {
      try {
        await db.course.delete({ where: { id: tempCourseId } });
        console.log("Cleaned up temporary test course.");
      } catch (_) {}
    }
    await db.$disconnect();
  }
}

runIndexingTestSuite();
