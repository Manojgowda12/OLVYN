import { db } from "./db";
import { generateEmbedding, EmbeddingError, EmbeddingProviderClient } from "./embedding";

/**
 * OpenLearnerAI — Hybrid Curriculum Retrieval Engine (Phase 3C)
 *
 * Combines PostgreSQL Full-Text Search (DocumentChunk.tsvContent GIN) and
 * pgvector cosine similarity (DocumentChunk.embedding HNSW) using
 * Reciprocal Rank Fusion (RRF).
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. Security-First SQL: Course visibility (PUBLISHED vs DRAFT vs PENDING_REVIEW)
 *    and Document indexing status (INDEXED) are strictly enforced INSIDE the SQL WHERE clause.
 * 2. Strict Input/Output Sanitization: Internal secrets, bucket paths, and private
 *    metadata are never exposed in retrieval results.
 * 3. Transparent RRF Hybrid Ranking: RRF = sum(1 / (k + rank_i)) with k=60.
 * 4. Fault Tolerant: Embedding failures gracefully fall back to FTS-only mode
 *    without crashing or bypassing permission filters.
 * 5. Isolation: Operates independently from /api/nova/chat until Phase 3D integration.
 */

export const DEFAULT_TOP_K = 5;
export const MAX_TOP_K = 10;
export const DEFAULT_CANDIDATE_LIMIT = 20;
export const DEFAULT_RRF_K = 60;
export const DEFAULT_MAX_TOKENS = 2000;
export const DEFAULT_ACTIVE_LESSON_BOOST = 0.05;

export type UserRole = "ADMIN" | "CONTRIBUTOR" | "LEARNER";

export interface UserContext {
  id: string;
  role: UserRole;
}

export interface RetrievalOptions {
  /**
   * Optional course scoping. If provided, limits retrieval to this course ID.
   */
  courseId?: string;

  /**
   * Optional active lesson context.
   * If provided, content from this lesson receives an RRF relevance boost.
   */
  lessonId?: string;

  /**
   * If true, restricts retrieval strictly to the specified lessonId.
   */
  strictLessonOnly?: boolean;

  /**
   * Requesting user context for security-first SQL visibility enforcement.
   * If undefined, learner visibility rules (PUBLISHED only) apply.
   */
  user?: UserContext;

  /**
   * Maximum number of final retrieved chunks to return (default: 5, max: 10).
   */
  topK?: number;

  /**
   * Cumulative token budget limit (default: 2000 tokens).
   */
  maxTokens?: number;

  /**
   * Candidate pool size per stream (FTS and Vector) before fusion (default: 20).
   */
  candidateLimit?: number;

  /**
   * Reciprocal Rank Fusion smoothing constant (default: 60).
   */
  rrfK?: number;

  /**
   * Relevance score bonus added to chunks matching the active lessonId (default: 0.05).
   */
  activeLessonBoost?: number;

  /**
   * Optional Gemini API key override.
   */
  apiKey?: string;

  /**
   * Optional injected provider client for mock testing.
   */
  embeddingClient?: EmbeddingProviderClient;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  lessonId: string | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  keywordScore: number;
  semanticScore: number;
  hybridScore: number;
  sourceUrl: string;
}

export interface RetrievalResult {
  query: string;
  results: RetrievedChunk[];
  totalCandidates: number;
  tokenCount: number;
  ftsCandidateCount: number;
  vectorCandidateCount: number;
  degradedMode?: "FTS_ONLY" | "VECTOR_ONLY";
}

interface RawCandidateRow {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  lessonId: string | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  score: number;
}

/**
 * Builds a safe, canonical learner URL for citation and navigation.
 */
export function buildSafeSourceUrl(courseSlug: string, lessonSlug?: string | null): string {
  if (lessonSlug) {
    return `/learn/${encodeURIComponent(courseSlug)}/${encodeURIComponent(lessonSlug)}`;
  }
  return `/courses/${encodeURIComponent(courseSlug)}`;
}

/**
 * Constructs the security-first SQL visibility and scoping WHERE clause.
 *
 * Rules:
 * - Documents must be INDEXED.
 * - Anonymous / LEARNER: Course must be PUBLISHED.
 * - CONTRIBUTOR: Course must be PUBLISHED OR (authored by user AND status in DRAFT, PENDING_REVIEW, REJECTED).
 * - ADMIN: Course status unrestricted.
 */
function buildSqlVisibilityFilter(
  options: RetrievalOptions,
  paramStartIndex: number
): {
  filterSql: string;
  params: any[];
  nextParamIndex: number;
} {
  const conditions: string[] = [`d.status = 'INDEXED'`];
  const params: any[] = [];
  let currentIndex = paramStartIndex;

  // 1. Role-based course visibility
  const user = options.user;
  if (!user || user.role === "LEARNER") {
    conditions.push(`co.status = 'PUBLISHED'`);
  } else if (user.role === "CONTRIBUTOR") {
    conditions.push(
      `(co.status = 'PUBLISHED' OR (co."authorId" = $${currentIndex} AND co.status IN ('DRAFT', 'PENDING_REVIEW', 'REJECTED')))`
    );
    params.push(user.id);
    currentIndex++;
  } else if (user.role === "ADMIN") {
    // Admin has access to all indexed courses
  }

  // 2. Course-level scoping
  if (options.courseId) {
    conditions.push(`d."courseId" = $${currentIndex}`);
    params.push(options.courseId);
    currentIndex++;
  }

  // 3. Strict lesson-level scoping
  if (options.strictLessonOnly && options.lessonId) {
    conditions.push(`d."lessonId" = $${currentIndex}`);
    params.push(options.lessonId);
    currentIndex++;
  }

  return {
    filterSql: conditions.join(" AND "),
    params,
    nextParamIndex: currentIndex,
  };
}

/**
 * Searches the indexed curriculum using hybrid full-text search and vector retrieval.
 */
export async function searchCurriculum(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const trimmedQuery = query.trim();

  // 1. Empty / Whitespace Query Fast-Path
  if (!trimmedQuery) {
    return {
      query: "",
      results: [],
      totalCandidates: 0,
      tokenCount: 0,
      ftsCandidateCount: 0,
      vectorCandidateCount: 0,
    };
  }

  const topK = Math.min(MAX_TOP_K, Math.max(1, options.topK ?? DEFAULT_TOP_K));
  const candidateLimit = Math.max(1, options.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT);
  const maxTokens = Math.max(100, options.maxTokens ?? DEFAULT_MAX_TOKENS);
  const rrfK = Math.max(1, options.rrfK ?? DEFAULT_RRF_K);
  const activeLessonBoost = options.activeLessonBoost ?? DEFAULT_ACTIVE_LESSON_BOOST;

  // 2. Generate Query Embedding
  let queryVector: number[] | null = null;
  let degradedMode: "FTS_ONLY" | "VECTOR_ONLY" | undefined;

  try {
    const vector = await generateEmbedding(trimmedQuery, {
      model: "gemini-embedding-2",
      dimensions: 768,
      apiKey: options.apiKey,
      client: options.embeddingClient,
    });

    if (vector.length === 768 && vector.every((n) => typeof n === "number" && Number.isFinite(n))) {
      queryVector = vector;
    }
  } catch (err: any) {
    // Graceful degradation: If embedding fails (e.g. API key issue or provider error),
    // proceed with FTS-only retrieval rather than crashing.
    degradedMode = "FTS_ONLY";
  }

  // 3. Execute Full-Text Search (FTS) Candidates Query
  let ftsRows: RawCandidateRow[] = [];
  try {
    const ftsFilter = buildSqlVisibilityFilter(options, 2);
    const ftsSql = `
      SELECT 
        c.id AS "chunkId",
        c."documentId",
        c."chunkIndex",
        c.content,
        c."tokenCount",
        d."courseId",
        co.slug AS "courseSlug",
        co.title AS "courseTitle",
        d."lessonId",
        l.slug AS "lessonSlug",
        l.title AS "lessonTitle",
        ts_rank_cd(c."tsvContent", plainto_tsquery('english', $1)) AS score
      FROM "DocumentChunk" c
      JOIN "Document" d ON c."documentId" = d.id
      JOIN "Course" co ON d."courseId" = co.id
      LEFT JOIN "Lesson" l ON d."lessonId" = l.id
      WHERE ${ftsFilter.filterSql}
        AND c."tsvContent" @@ plainto_tsquery('english', $1)
      ORDER BY score DESC
      LIMIT ${candidateLimit}
    `;

    ftsRows = await db.$queryRawUnsafe<RawCandidateRow[]>(
      ftsSql,
      trimmedQuery,
      ...ftsFilter.params
    );
  } catch (ftsError) {
    // If FTS fails (e.g. syntax error with rare characters), fall back safely
    ftsRows = [];
  }

  // 4. Execute Vector Similarity Candidates Query (if query embedding available)
  let vectorRows: RawCandidateRow[] = [];
  if (queryVector) {
    try {
      const vecFilter = buildSqlVisibilityFilter(options, 2);
      const vectorLiteral = `[${queryVector.join(",")}]`;
      const vecSql = `
        SELECT 
          c.id AS "chunkId",
          c."documentId",
          c."chunkIndex",
          c.content,
          c."tokenCount",
          d."courseId",
          co.slug AS "courseSlug",
          co.title AS "courseTitle",
          d."lessonId",
          l.slug AS "lessonSlug",
          l.title AS "lessonTitle",
          (1 - (c.embedding <=> $1::vector)) AS score
        FROM "DocumentChunk" c
        JOIN "Document" d ON c."documentId" = d.id
        JOIN "Course" co ON d."courseId" = co.id
        LEFT JOIN "Lesson" l ON d."lessonId" = l.id
        WHERE ${vecFilter.filterSql}
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT ${candidateLimit}
      `;

      vectorRows = await db.$queryRawUnsafe<RawCandidateRow[]>(
        vecSql,
        vectorLiteral,
        ...vecFilter.params
      );
    } catch (vecError) {
      vectorRows = [];
      if (!degradedMode) degradedMode = "FTS_ONLY";
    }
  }

  // If queryVector was available but FTS yielded no results and vector yielded results:
  if (ftsRows.length === 0 && vectorRows.length > 0 && !degradedMode) {
    degradedMode = "VECTOR_ONLY";
  }

  // 5. Reciprocal Rank Fusion (RRF) & Deduplication
  interface CandidateAccumulator {
    row: RawCandidateRow;
    ftsRank?: number;
    ftsScore: number;
    vecRank?: number;
    vecScore: number;
  }

  const candidateMap = new Map<string, CandidateAccumulator>();

  // Process FTS stream
  ftsRows.forEach((row, idx) => {
    const rank = idx + 1;
    const existing = candidateMap.get(row.chunkId);
    if (existing) {
      existing.ftsRank = rank;
      existing.ftsScore = Number(row.score);
    } else {
      candidateMap.set(row.chunkId, {
        row,
        ftsRank: rank,
        ftsScore: Number(row.score),
        vecScore: 0,
      });
    }
  });

  // Process Vector stream
  vectorRows.forEach((row, idx) => {
    const rank = idx + 1;
    const existing = candidateMap.get(row.chunkId);
    if (existing) {
      existing.vecRank = rank;
      existing.vecScore = Number(row.score);
    } else {
      candidateMap.set(row.chunkId, {
        row,
        vecRank: rank,
        vecScore: Number(row.score),
        ftsScore: 0,
      });
    }
  });

  // Compute RRF Hybrid Scores
  const fusedChunks: RetrievedChunk[] = [];

  for (const item of candidateMap.values()) {
    let rrfScore = 0;
    if (item.ftsRank !== undefined) {
      rrfScore += 1 / (rrfK + item.ftsRank);
    }
    if (item.vecRank !== undefined) {
      rrfScore += 1 / (rrfK + item.vecRank);
    }

    // Active lesson context prioritization:
    // If the chunk belongs to the currently active lesson, add a relevance bonus.
    if (options.lessonId && item.row.lessonId === options.lessonId) {
      rrfScore += activeLessonBoost;
    }

    // Normalize keyword score (ts_rank_cd is typically between 0 and 1, clamp to [0, 1])
    const normalizedKeywordScore = Math.min(1, Math.max(0, item.ftsScore));

    // Normalize semantic score (cosine similarity is between -1 and 1, clamp to [0, 1])
    const normalizedSemanticScore = Math.min(1, Math.max(0, item.vecScore));

    fusedChunks.push({
      chunkId: item.row.chunkId,
      documentId: item.row.documentId,
      courseId: item.row.courseId,
      courseSlug: item.row.courseSlug,
      courseTitle: item.row.courseTitle,
      lessonId: item.row.lessonId,
      lessonSlug: item.row.lessonSlug,
      lessonTitle: item.row.lessonTitle,
      chunkIndex: item.row.chunkIndex,
      content: item.row.content,
      tokenCount: item.row.tokenCount,
      keywordScore: normalizedKeywordScore,
      semanticScore: normalizedSemanticScore,
      hybridScore: Number(rrfScore.toFixed(6)),
      sourceUrl: buildSafeSourceUrl(item.row.courseSlug, item.row.lessonSlug),
    });
  }

  // 6. Deterministic Sort: Hybrid Score DESC, then Semantic Score DESC, then Chunk Index ASC
  fusedChunks.sort((a, b) => {
    if (b.hybridScore !== a.hybridScore) {
      return b.hybridScore - a.hybridScore;
    }
    if (b.semanticScore !== a.semanticScore) {
      return b.semanticScore - a.semanticScore;
    }
    return a.chunkIndex - b.chunkIndex;
  });

  // 7. Enforce TopK Limit and Cumulative Token Budget
  const budgetedResults: RetrievedChunk[] = [];
  let accumulatedTokens = 0;

  for (const chunk of fusedChunks) {
    if (budgetedResults.length >= topK) break;
    if (accumulatedTokens + chunk.tokenCount > maxTokens && budgetedResults.length > 0) {
      // If adding this chunk would exceed token budget and we already have at least 1 result, stop.
      break;
    }
    budgetedResults.push(chunk);
    accumulatedTokens += chunk.tokenCount;
  }

  return {
    query: trimmedQuery,
    results: budgetedResults,
    totalCandidates: candidateMap.size,
    tokenCount: accumulatedTokens,
    ftsCandidateCount: ftsRows.length,
    vectorCandidateCount: vectorRows.length,
    ...(degradedMode ? { degradedMode } : {}),
  };
}
