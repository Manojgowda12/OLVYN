import { db } from "../src/lib/db";
import { chunkContent } from "../src/lib/chunking";
import { generateEmbedding, DEFAULT_EMBEDDING_MODEL, DEFAULT_EMBEDDING_DIMENSIONS } from "../src/lib/embedding";

async function runSmokeTest() {
  console.log("==================================================");
  console.log("🔍 OPENLEARNERAI — PHASE 3B-2 LIVE SMOKE TEST");
  console.log("==================================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key") {
    console.log("Result: CONFIGURATION_UNAVAILABLE");
    console.log("Reason: GEMINI_API_KEY is not configured or uses placeholder value.");
    console.log("Status: SKIPPED (controlled non-failing exit)");
    return;
  }

  try {
    // 1. Check baseline Document / DocumentChunk counts (must be 0)
    const docCountBefore = await db.document.count();
    const chunkCountBefore = await db.documentChunk.count();

    // 2. Select ONE small existing lesson from the database
    const lesson = await db.lesson.findFirst({
      where: {
        textContent: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        textContent: true,
      },
    });

    if (!lesson || !lesson.textContent) {
      console.log("Status: NO_LESSON_CONTENT_FOUND");
      return;
    }

    console.log(`Found sample lesson for smoke test: "${lesson.title}" (${lesson.textContent.length} characters)`);

    // 3. Chunk using Phase 3A deterministic chunker
    const chunks = chunkContent(
      lesson.textContent,
      {
        sourceTitle: lesson.title,
        sourceType: "LESSON_TEXT",
      },
      {
        targetTokens: 400,
      }
    );

    if (chunks.length === 0) {
      console.error("❌ Chunking produced zero chunks.");
      process.exit(1);
    }

    const testChunk = chunks[0];
    console.log(`Testing chunk 0 (estimated tokens: ${testChunk.estimatedTokenCount}, chars: ${testChunk.content.length})`);

    // 4. Embed ONE chunk using isolated embedding service
    const requestedModel = process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
    const requestedDim = process.env.GEMINI_EMBEDDING_DIMENSIONS
      ? parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS, 10)
      : DEFAULT_EMBEDDING_DIMENSIONS;

    console.log("\nCalling isolated Gemini Embedding Service...");
    const vector = await generateEmbedding(testChunk.content, {
      model: requestedModel,
      dimensions: requestedDim,
    });

    // 5. Verify dimensions without printing vector values
    const returnedDim = vector.length;
    const isSuccess = returnedDim === requestedDim && vector.every((v) => typeof v === "number" && !isNaN(v));

    console.log("\n--- SMOKE TEST REPORT ---");
    console.log(`Model:                ${requestedModel}`);
    console.log(`Requested Dimensions: ${requestedDim}`);
    console.log(`Returned Dimensions:  ${returnedDim}`);
    console.log(`Status:               ${isSuccess ? "SUCCESS" : "FAILURE"}`);
    console.log("Vector Values:        [REDACTED - NEVER LOGGED]");

    // 6. Verify ZERO database writes occurred
    const docCountAfter = await db.document.count();
    const chunkCountAfter = await db.documentChunk.count();

    if (docCountAfter !== docCountBefore || chunkCountAfter !== chunkCountBefore) {
      console.error("❌ CRITICAL VIOLATION: Database rows were created during smoke test!");
      process.exit(1);
    }

    console.log("\nDatabase Safety:       VERIFIED (0 Document rows, 0 DocumentChunk rows created)");

    if (!isSuccess) {
      console.error(`❌ Returned dimension ${returnedDim} did not match requested dimension ${requestedDim}.`);
      process.exit(1);
    }

    console.log("\n==================================================");
    console.log("✨ Live Embedding Smoke Test PASSED!");
    console.log("==================================================");
  } catch (err: any) {
    console.error("Smoke test error:", err.message || err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runSmokeTest();
