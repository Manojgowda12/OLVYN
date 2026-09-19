import { db } from "@/lib/db";
import { MemoryType } from "@prisma/client";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Zod schema for structured memory extraction output.
 */
export const memoryCandidateSchema = z.object({
  memoryType: z.nativeEnum(MemoryType),
  key: z.string().min(2).max(64),
  value: z.string().min(4).max(300),
  confidence: z.number().min(0).max(1),
  importance: z.number().int().min(1).max(5).default(1),
});

export const memoryBatchSchema = z.array(memoryCandidateSchema);

export type MemoryCandidate = z.infer<typeof memoryCandidateSchema>;

// Patterns identifying credentials, keys, or sensitive data that must NEVER be memorized
const SENSITIVE_PATTERNS = [
  /password/i,
  /api[-_]?key/i,
  /secret/i,
  /bearer\s+/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /AIza[0-9A-Za-z-_]{35}/,
  /ghp_[0-9a-zA-Z]{36}/,
  /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/, // Credit card
  /cvv/i,
  /ssn/i,
  /private[-_]?key/i,
  /\b(health|medical|illness|diagnosis|religion|political|sexual)\b/i,
];

/**
 * Validates that an extracted memory is durable, relevant, and free of secrets or sensitive traits.
 */
export function isMemorySafe(candidate: MemoryCandidate): boolean {
  if (candidate.confidence < 0.7) {
    return false;
  }

  const combinedText = `${candidate.key} ${candidate.value}`;

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(combinedText)) {
      return false;
    }
  }

  // Value must be substantive, not casual conversational banter
  const trimmed = candidate.value.trim().toLowerCase();
  if (
    trimmed.length < 5 ||
    trimmed.startsWith("hello") ||
    trimmed.startsWith("thanks") ||
    trimmed.startsWith("ok") ||
    trimmed === "yes" ||
    trimmed === "no"
  ) {
    return false;
  }

  return true;
}

/**
 * Normalizes memory key for reliable deduplication.
 * e.g., "Python Basics" -> "python_basics"
 */
export function normalizeMemoryKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/**
 * Extracts durable learning facts from recent conversation turns.
 * Uses structured Gemini reasoning when available, or heuristic rule extractor as fallback.
 */
export async function extractUserMemories({
  userId,
  conversationId,
  userMessage,
  assistantReply,
}: {
  userId: string;
  conversationId?: string;
  userMessage: string;
  assistantReply?: string;
}): Promise<MemoryCandidate[]> {
  // Check user preference
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { memoryEnabled: true },
  });

  if (!user || !user.memoryEnabled) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const candidates: MemoryCandidate[] = [];

  if (apiKey && apiKey.trim().length > 10 && !apiKey.includes("your-gemini-api-key")) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const extractionPrompt = `You are the Memory Extraction Engine for Nova AI tutor.
Analyze the following student-tutor interaction and extract ONLY durable, valuable learning context facts.

CATEGORIES ALLOWED:
- PREFERENCE (e.g. prefers practical code examples, likes concise summaries)
- LEARNING_CONTEXT (e.g. studying for DBMS final exam, building a SaaS project)
- GOAL (e.g. wants to master Next.js 15, aims to become a full-stack engineer)
- SKILL (e.g. knows Python variables and loops, comfortable with HTML/CSS)
- DIFFICULTY (e.g. struggles with recursion base cases, finds async/await confusing)
- STUDY_HABIT (e.g. practices with 3-question quizzes, learns best through debugging)
- INTEREST (e.g. interested in cloud deployment, excited about AI agents)

CRITICAL SECURITY RULES:
1. NEVER extract passwords, API keys, credentials, tokens, or financial information.
2. NEVER extract sensitive personal characteristics (health, politics, religion).
3. Do NOT extract casual chit-chat, greetings, or single-turn fleeting statements.
4. Confidence must be between 0.0 and 1.0 (only include facts >= 0.70 confidence).
5. Output JSON array adhering to this schema:
[
  {
    "memoryType": "PREFERENCE" | "LEARNING_CONTEXT" | "GOAL" | "SKILL" | "DIFFICULTY" | "STUDY_HABIT" | "INTEREST",
    "key": "snake_case_key_under_40_chars",
    "value": "Concise factual statement about the student",
    "confidence": 0.85,
    "importance": 1 to 5
  }
]
If nothing meets the criteria, return an empty array [].

<interaction>
Student: ${userMessage}
${assistantReply ? `Nova: ${assistantReply.slice(0, 400)}` : ""}
</interaction>
`;

      const result = await model.generateContent(extractionPrompt);
      const rawText = result.response.text();
      const parsed = JSON.parse(rawText);
      const validation = memoryBatchSchema.safeParse(parsed);

      if (validation.success) {
        for (const item of validation.data) {
          if (isMemorySafe(item)) {
            candidates.push(item);
          }
        }
      }
    } catch (err) {
      // Fall through to deterministic heuristics if AI call fails
    }
  }

  // Fallback Deterministic Rule Extractor (operates when external AI key is unconfigured or in offline tests)
  if (candidates.length === 0) {
    const lower = userMessage.toLowerCase();

    if (lower.includes("i struggle with") || lower.includes("i find it hard to understand")) {
      const match = userMessage.match(/i (?:struggle with|find it hard to understand)\s+([^.,\n]+)/i);
      if (match && match[1]) {
        candidates.push({
          memoryType: MemoryType.DIFFICULTY,
          key: normalizeMemoryKey(match[1]),
          value: `Struggles with understanding ${match[1].trim()}`,
          confidence: 0.9,
          importance: 3,
        });
      }
    }

    if (lower.includes("my goal is to") || lower.includes("i want to learn")) {
      const match = userMessage.match(/(?:my goal is to|i want to learn)\s+([^.,\n]+)/i);
      if (match && match[1]) {
        candidates.push({
          memoryType: MemoryType.GOAL,
          key: normalizeMemoryKey(match[1]),
          value: `Goal is to learn ${match[1].trim()}`,
          confidence: 0.85,
          importance: 3,
        });
      }
    }

    if (lower.includes("i prefer") || lower.includes("i like when you")) {
      const match = userMessage.match(/(?:i prefer|i like when you)\s+([^.,\n]+)/i);
      if (match && match[1]) {
        candidates.push({
          memoryType: MemoryType.PREFERENCE,
          key: normalizeMemoryKey(match[1]),
          value: `Prefers ${match[1].trim()}`,
          confidence: 0.85,
          importance: 2,
        });
      }
    }
  }

  // Persist and deduplicate each valid candidate memory
  for (const candidate of candidates) {
    if (!isMemorySafe(candidate)) continue;

    const normalizedKey = normalizeMemoryKey(candidate.key);
    if (!normalizedKey) continue;

    try {
      await db.userMemory.upsert({
        where: {
          userId_memoryType_key: {
            userId,
            memoryType: candidate.memoryType,
            key: normalizedKey,
          },
        },
        update: {
          value: candidate.value.trim(),
          confidence: candidate.confidence,
          importance: candidate.importance,
          sourceConversationId: conversationId || null,
          updatedAt: new Date(),
          lastUsedAt: new Date(),
        },
        create: {
          userId,
          memoryType: candidate.memoryType,
          key: normalizedKey,
          value: candidate.value.trim(),
          confidence: candidate.confidence,
          importance: candidate.importance,
          sourceConversationId: conversationId || null,
          lastUsedAt: new Date(),
        },
      });
    } catch (saveErr) {
      console.error("Failed to upsert memory:", saveErr);
    }
  }

  return candidates;
}

/**
 * Retrieves a small, relevant set of active memories for an authenticated user.
 */
export async function getUserMemories(
  userId: string,
  options?: { limit?: number; memoryType?: MemoryType }
) {
  const limit = options?.limit || 5;

  const memories = await db.userMemory.findMany({
    where: {
      userId,
      ...(options?.memoryType ? { memoryType: options.memoryType } : {}),
    },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  // Touch lastUsedAt asynchronously
  if (memories.length > 0) {
    db.userMemory
      .updateMany({
        where: { id: { in: memories.map((m) => m.id) } },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});
  }

  return memories;
}

/**
 * Formats user memories into safe untrusted context delimiters for Nova prompt.
 */
export function formatMemoriesForPrompt(
  memories: Array<{ memoryType: MemoryType; key: string; value: string }>
): string {
  if (!memories || memories.length === 0) {
    return "";
  }

  const lines = memories.map(
    (m) => `  - [${m.memoryType}: ${m.key}]: ${m.value}`
  );

  return (
    `\n<user_memory>\n` +
    `[AUTHENTICATED LEARNER CONTEXT & PREFERENCES — USE ONLY TO PERSONALIZE EXPLANATIONS]\n` +
    lines.join("\n") +
    `\n</user_memory>\n`
  );
}

/**
 * Deletes a specific memory with strict user-ownership validation.
 */
export async function deleteUserMemory(userId: string, memoryId: string): Promise<boolean> {
  const memory = await db.userMemory.findFirst({
    where: { id: memoryId, userId },
  });

  if (!memory) {
    return false;
  }

  await db.userMemory.delete({
    where: { id: memoryId },
  });

  return true;
}

/**
 * Clears all memories for an authenticated user.
 */
export async function clearUserMemories(userId: string): Promise<number> {
  const result = await db.userMemory.deleteMany({
    where: { userId },
  });
  return result.count;
}

/**
 * Toggles memory extraction and retrieval on or off for a user.
 */
export async function setUserMemoryEnabled(userId: string, enabled: boolean) {
  return db.user.update({
    where: { id: userId },
    data: { memoryEnabled: enabled },
    select: { id: true, memoryEnabled: true },
  });
}
