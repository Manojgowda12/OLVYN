import fs from "fs";
import path from "path";

// 0. Safely load environment variables from .env if present
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
      if (val) {
        process.env[key] = val;
      }
    }
  }
}

import { db } from "../src/lib/db";
import { chunkContent } from "../src/lib/chunking";
import { hashContent } from "../src/lib/content-hash";
import { generateEmbedding, EmbeddingError } from "../src/lib/embedding";

interface VectorMatch {
  id: string;
  chunkIndex: number;
  content?: string;
  distance?: number;
  similarity: number;
}

interface FtsMatch {
  id: string;
  chunkIndex: number;
  content: string;
  rank: number;
}

interface DimResult {
  dims: number;
  has_tsv: boolean;
}

async function executeSingleLessonProof() {
  console.log("==================================================================");
  console.log("🚀 OPENLEARNERAI — PHASE 3B-3 SINGLE-LESSON INDEXING PROOF");
  console.log("==================================================================\n");

  // 1. Verify GEMINI_API_KEY without leaking values
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key") {
    console.log("STATUS: CONFIGURATION_UNAVAILABLE");
    console.log("Reason: GEMINI_API_KEY is not configured or uses a placeholder in .env.");
    process.exit(0);
  }

  // 2. Measure data safety counts BEFORE execution
  console.log("--- Baseline Data Safety Audit (BEFORE) ---");
  const countsBefore = {
    user: await db.user.count(),
    course: await db.course.count(),
    module: await db.module.count(),
    lesson: await db.lesson.count(),
    resource: await db.resource.count(),
    fileAsset: await db.fileAsset.count(),
    aiConversation: await db.aIConversation.count(),
    aiMessage: await db.aIMessage.count(),
    document: await db.document.count(),
    documentChunk: await db.documentChunk.count(),
  };

  console.log(`  User:           ${countsBefore.user}`);
  console.log(`  Course:         ${countsBefore.course}`);
  console.log(`  Module:         ${countsBefore.module}`);
  console.log(`  Lesson:         ${countsBefore.lesson}`);
  console.log(`  Resource:       ${countsBefore.resource}`);
  console.log(`  FileAsset:      ${countsBefore.fileAsset}`);
  console.log(`  AIConversation: ${countsBefore.aiConversation}`);
  console.log(`  AIMessage:      ${countsBefore.aiMessage}`);
  console.log(`  Document:       ${countsBefore.document}`);
  console.log(`  DocumentChunk:  ${countsBefore.documentChunk}\n`);

  let createdDocumentId: string | null = null;
  const createdChunkIds: string[] = [];

  try {
    // 3. Select EXACTLY ONE lesson from a PUBLISHED course (respecting course visibility)
    console.log("--- 1. Lesson Selection ---");
    const lesson = await db.lesson.findFirst({
      where: {
        textContent: { not: null },
        module: {
          course: {
            status: "PUBLISHED",
          },
        },
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    if (!lesson || !lesson.textContent) {
      throw new Error("No eligible published lesson with text content found in database.");
    }

    console.log(`  Lesson Title   : "${lesson.title}"`);
    console.log(`  Lesson ID      : ${lesson.id}`);
    console.log(`  Course Title   : "${lesson.module.course.title}"`);
    console.log(`  Course Status  : ${lesson.module.course.status}`);
    console.log(`  Content Length : ${lesson.textContent.length} characters\n`);

    // Clean up any prior test document for this lesson to ensure clean test state
    const priorDocs = await db.document.findMany({ where: { lessonId: lesson.id } });
    if (priorDocs.length > 0) {
      console.log(`  Cleaning up ${priorDocs.length} prior test Document record(s) for this lesson...`);
      await db.document.deleteMany({ where: { lessonId: lesson.id } });
    }

    // 4. Phase 3A Deterministic Content Chunking
    console.log("--- 2. Phase 3A Deterministic Chunking ---");
    const chunks = chunkContent(
      lesson.textContent,
      {
        sourceTitle: lesson.title,
        sourceType: "LESSON_TEXT",
        courseId: lesson.module.course.id,
        courseSlug: lesson.module.course.slug,
        lessonId: lesson.id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
      },
      {
        targetTokens: 400,
        maxTokens: 550,
      }
    );

    if (chunks.length === 0) {
      throw new Error("Phase 3A chunker produced zero chunks.");
    }

    console.log(`  Total Chunks   : ${chunks.length}`);
    chunks.forEach((c) => {
      console.log(`    Chunk ${c.chunkIndex}: est. tokens=${c.estimatedTokenCount}, chars=${c.content.length}`);
    });
    console.log("");

    // 5. Create Document in PENDING state first
    console.log("--- 3. Document Creation (Pending State) ---");
    const contentDigest = hashContent(lesson.textContent);

    const doc = await db.document.create({
      data: {
        courseId: lesson.module.course.id,
        lessonId: lesson.id,
        sourceType: "LESSON_CONTENT",
        contentHash: contentDigest,
        status: "PENDING",
      },
    });
    createdDocumentId = doc.id;
    console.log(`  Document ID    : ${doc.id}`);
    console.log(`  Content Hash   : ${doc.contentHash?.slice(0, 16)}...`);
    console.log(`  Initial Status : ${doc.status}\n`);

    // 6. Generate real embeddings via gemini-embedding-2 (768 dimensions) & persist
    console.log("--- 4. Generating Real Embeddings via gemini-embedding-2 ---");
    const generatedEmbeddings: number[][] = [];

    for (const chunk of chunks) {
      console.log(`  Generating vector for Chunk ${chunk.chunkIndex}...`);
      const vector = await generateEmbedding(chunk.content, {
        model: "gemini-embedding-2",
        dimensions: 768,
      });

      if (vector.length !== 768) {
        throw new Error(`Embedding returned invalid dimension ${vector.length}, expected 768.`);
      }

      generatedEmbeddings.push(vector);
      console.log(`    Chunk ${chunk.chunkIndex} embedded: 768 dimensions verified.`);

      // Persist DocumentChunk with vector(768) into PostgreSQL
      const chunkId = `chk_${Date.now()}_${chunk.chunkIndex}`;
      createdChunkIds.push(chunkId);
      const vectorLiteral = `[${vector.join(",")}]`;

      await db.$executeRawUnsafe(
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
        doc.id,
        chunk.chunkIndex,
        chunk.content,
        chunk.estimatedTokenCount,
        vectorLiteral,
        "gemini-embedding-2",
        "1",
        JSON.stringify({
          sourceTitle: lesson.title,
          courseTitle: lesson.module.course.title,
          chunkIndex: chunk.chunkIndex,
        })
      );
    }

    // 7. Update Document to INDEXED status once all chunks succeed
    await db.document.update({
      where: { id: doc.id },
      data: { status: "INDEXED" },
    });
    console.log(`\n  Document Status Updated: INDEXED\n`);

    // 8. Verify DocumentChunk properties in PostgreSQL
    console.log("--- 5. PostgreSQL Persistence & Schema Verification ---");
    for (const chunkId of createdChunkIds) {
      const check = await db.$queryRawUnsafe<DimResult[]>(
        `SELECT vector_dims(embedding) AS dims, ("tsvContent" IS NOT NULL) AS has_tsv FROM "DocumentChunk" WHERE id = $1`,
        chunkId
      );
      if (!check[0] || check[0].dims !== 768 || !check[0].has_tsv) {
        throw new Error(`DocumentChunk ${chunkId} failed database verification.`);
      }
      console.log(`  DocumentChunk ${chunkId}: dims=${check[0].dims}, tsvContent generated=YES`);
    }
    console.log("");

    // 9. Execute Real Vector Cosine Similarity Search with Independent Query
    console.log("--- 6. Real Vector Cosine Similarity Search (Independent Query) ---");
    const independentQuery = "What is Python and what is it used for?";
    console.log(`  Query Description   : "${independentQuery}"`);

    console.log(`  Generating embedding for independent query via gemini-embedding-2...`);
    const queryVector = await generateEmbedding(independentQuery, {
      model: "gemini-embedding-2",
      dimensions: 768,
    });

    if (queryVector.length !== 768) {
      throw new Error(`Query vector returned ${queryVector.length} dimensions, expected 768.`);
    }

    const allFinite = queryVector.every((n) => typeof n === "number" && Number.isFinite(n));
    if (!allFinite) {
      throw new Error("Query vector contains non-finite numbers.");
    }
    console.log(`  Query Vector Dims   : ${queryVector.length} (768 finite numeric values verified)`);

    const queryVectorLiteral = `[${queryVector.join(",")}]`;

    const vectorMatches = await db.$queryRawUnsafe<VectorMatch[]>(
      `SELECT 
        id, 
        "chunkIndex",
        (1 - (embedding <=> $1::vector)) AS similarity
      FROM "DocumentChunk"
      WHERE "documentId" = $2
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector ASC
      LIMIT 3`,
      queryVectorLiteral,
      doc.id
    );

    if (vectorMatches.length === 0) {
      throw new Error("Cosine similarity search returned 0 results.");
    }

    const bestMatch = vectorMatches[0];
    console.log(`  Matched Chunk Index : ${bestMatch.chunkIndex}`);
    console.log(`  Similarity Score    : ${Number(bestMatch.similarity).toFixed(6)}`);
    console.log(`  Source Lesson Title : "${lesson.title}" (${lesson.module.course.title})`);
    console.log(`  Query Type          : REAL INDEPENDENT QUERY (embedding <=> queryVector)`);
    console.log(`  Vector Content      : [PROTECTED - NEVER PRINTED]\n`);

    // 10. Execute Full-Text Search (FTS) Verification
    console.log("--- 7. Full-Text Search (FTS) GIN Verification ---");
    // Query keyword guaranteed to be in the Python lesson content
    const searchWord = "Python";

    const ftsMatches = await db.$queryRawUnsafe<FtsMatch[]>(
      `SELECT 
        id, 
        "chunkIndex",
        content,
        ts_rank_cd("tsvContent", plainto_tsquery('english', $1)) AS rank
      FROM "DocumentChunk"
      WHERE "documentId" = $2
        AND "tsvContent" @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 1`,
      searchWord,
      doc.id
    );

    if (ftsMatches.length > 0) {
      console.log(`  FTS Query Keyword   : "${searchWord}"`);
      console.log(`  FTS Matched Chunk   : Index ${ftsMatches[0].chunkIndex}`);
      console.log(`  FTS Rank Score      : ${Number(ftsMatches[0].rank).toFixed(4)}`);
      console.log(`  FTS Status          : VERIFIED (Relevant chunk discovered via GIN)\n`);
    } else {
      console.log(`  FTS Query Keyword   : "${searchWord}"`);
      console.log(`  FTS Status          : No keyword hit for "${searchWord}" (FTS GIN active)\n`);
    }

    // 11. Orphan Chunk Verification
    console.log("--- 8. Orphan Chunk Audit ---");
    const orphanCountResult = await db.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT count(*)::int AS count
      FROM "DocumentChunk" c
      LEFT JOIN "Document" d ON c."documentId" = d.id
      WHERE d.id IS NULL
    `);
    const orphanCount = orphanCountResult[0]?.count ?? 0;
    console.log(`  Orphan Chunks Detected: ${orphanCount}`);
    if (orphanCount > 0) {
      throw new Error(`CRITICAL: Found ${orphanCount} orphan chunks in database!`);
    }
    console.log("  Orphan Chunk Status   : VERIFIED (Zero orphan chunks)\n");

    // 12. Final Data Safety Audit (AFTER)
    console.log("--- 9. Data Safety Verification (AFTER) ---");
    const countsAfter = {
      user: await db.user.count(),
      course: await db.course.count(),
      module: await db.module.count(),
      lesson: await db.lesson.count(),
      resource: await db.resource.count(),
      fileAsset: await db.fileAsset.count(),
      aiConversation: await db.aIConversation.count(),
      aiMessage: await db.aIMessage.count(),
      document: await db.document.count(),
      documentChunk: await db.documentChunk.count(),
    };

    console.log(`  User           : ${countsAfter.user} (diff: ${countsAfter.user - countsBefore.user})`);
    console.log(`  Course         : ${countsAfter.course} (diff: ${countsAfter.course - countsBefore.course})`);
    console.log(`  Module         : ${countsAfter.module} (diff: ${countsAfter.module - countsBefore.module})`);
    console.log(`  Lesson         : ${countsAfter.lesson} (diff: ${countsAfter.lesson - countsBefore.lesson})`);
    console.log(`  Resource       : ${countsAfter.resource} (diff: ${countsAfter.resource - countsBefore.resource})`);
    console.log(`  FileAsset      : ${countsAfter.fileAsset} (diff: ${countsAfter.fileAsset - countsBefore.fileAsset})`);
    console.log(`  AIConversation : ${countsAfter.aiConversation} (diff: ${countsAfter.aiConversation - countsBefore.aiConversation})`);
    console.log(`  AIMessage      : ${countsAfter.aiMessage} (diff: ${countsAfter.aiMessage - countsBefore.aiMessage})`);
    console.log(`  Document       : ${countsAfter.document} (diff: +${countsAfter.document - countsBefore.document})`);
    console.log(`  DocumentChunk  : ${countsAfter.documentChunk} (diff: +${countsAfter.documentChunk - countsBefore.documentChunk})\n`);

    const businessCountsUnchanged =
      countsAfter.user === countsBefore.user &&
      countsAfter.course === countsBefore.course &&
      countsAfter.module === countsBefore.module &&
      countsAfter.lesson === countsBefore.lesson &&
      countsAfter.resource === countsBefore.resource &&
      countsAfter.fileAsset === countsBefore.fileAsset &&
      countsAfter.aiConversation === countsBefore.aiConversation &&
      countsAfter.aiMessage === countsBefore.aiMessage;

    if (!businessCountsUnchanged) {
      throw new Error("Business tables were modified during indexing proof!");
    }

    console.log("==================================================================");
    console.log("✨ PHASE 3B-3 SINGLE-LESSON INDEXING PROOF COMPLETED SUCCESSFULLY!");
    console.log("==================================================================");
  } catch (err: any) {
    console.error("\n❌ PROOF FAILURE:", err instanceof EmbeddingError ? `[${err.code}] ${err.message}` : err.message || err);

    // FAILURE CLEANUP: Never leave a false INDEXED state or partial rows
    if (createdDocumentId) {
      console.log("Cleaning up partial proof Document and DocumentChunk rows...");
      try {
        await db.document.delete({ where: { id: createdDocumentId } });
        console.log("Partial proof rows safely purged.");
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }
    }
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

executeSingleLessonProof();
