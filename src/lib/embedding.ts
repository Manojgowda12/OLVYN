import { GoogleGenAI } from "@google/genai";

/**
 * OpenLearnerAI — Isolated Gemini Embedding Service
 *
 * Phase 3B-2: Dedicated embedding generator for educational content chunking
 * and future RAG indexing.
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. Uses modern `@google/genai` SDK.
 * 2. Defaults to `gemini-embedding-2` with 768 output dimensions (MRL - Matryoshka Representation Learning).
 * 3. Strictly isolated from `ai-assistant.ts`, `/api/nova/chat`, and retrieval logic.
 * 4. Zero database writes: this service only generates vectors.
 *
 * MODEL & TASK SEMANTICS:
 * - Document Indexing: Embeds educational chunk text directly (`contents: text`).
 * - Task Type: `gemini-embedding-2` does NOT use the legacy/deprecated `task_type` parameter
 *   from previous generation models (e.g. `text-embedding-004`).
 * - Learner Queries (FUTURE Phase 3C): Query-specific embedding adaptations or instruction
 *   prefixes for retrieval will be handled in Phase 3C without affecting document chunking.
 *
 * RESILIENCE & RETRIES:
 * - Conservative exponential backoff (max 3 attempts).
 * - Retries only transient provider failures: rate limits (429), server errors (500/502/503/504),
 *   and transient network disconnects.
 * - Non-transient errors (bad input, invalid dimensions, auth failure, missing key) fail immediately.
 */

export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2";
export const DEFAULT_EMBEDDING_DIMENSIONS = 768;
export const MAX_INPUT_CHARACTERS = 10000;
export const MAX_RETRIES = 3;
export const BASE_RETRY_DELAY_MS = 500;

export type EmbeddingErrorCode =
  | "EMPTY_INPUT"
  | "INPUT_TOO_LONG"
  | "CONFIGURATION_UNAVAILABLE"
  | "AUTHENTICATION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "INVALID_DIMENSIONS"
  | "MALFORMED_RESPONSE"
  | "TRANSIENT_PROVIDER_ERROR"
  | "UNEXPECTED_ERROR";

export class EmbeddingError extends Error {
  readonly code: EmbeddingErrorCode;
  readonly status?: number;
  readonly isTransient: boolean;

  constructor(
    message: string,
    code: EmbeddingErrorCode,
    options?: { status?: number; isTransient?: boolean }
  ) {
    super(message);
    this.name = "EmbeddingError";
    this.code = code;
    this.status = options?.status;
    this.isTransient = options?.isTransient ?? false;
    Object.setPrototypeOf(this, EmbeddingError.prototype);
  }
}

export interface EmbeddingProviderClient {
  models: {
    embedContent: (params: {
      model: string;
      contents: string;
      config?: {
        outputDimensionality?: number;
      };
    }) => Promise<{
      embeddings?: Array<{ values?: number[] }>;
      embedding?: { values?: number[] };
    }>;
  };
}

export interface EmbeddingOptions {
  /**
   * Gemini embedding model identifier.
   * Defaults to process.env.GEMINI_EMBEDDING_MODEL or "gemini-embedding-2".
   */
  model?: string;

  /**
   * Target vector dimensions (768 for pgvector compatibility).
   * Defaults to process.env.GEMINI_EMBEDDING_DIMENSIONS or 768.
   */
  dimensions?: number;

  /**
   * Optional API key override (defaults to process.env.GEMINI_API_KEY).
   */
  apiKey?: string;

  /**
   * Injected provider client for deterministic unit testing without network/credentials.
   */
  client?: EmbeddingProviderClient;

  /**
   * Maximum retry attempts for transient errors (default: 3).
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds for exponential backoff (default: 500ms).
   */
  baseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error: unknown): boolean {
  if (error instanceof EmbeddingError) {
    return error.isTransient;
  }
  if (!error || typeof error !== "object") return false;

  const err = error as Record<string, any>;
  const status = err.status ?? err.statusCode ?? err.response?.status;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  const message = String(err.message || "").toLowerCase();
  const code = String(err.code || "").toUpperCase();

  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "ENOTFOUND" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    message.includes("fetch failed") ||
    message.includes("network error") ||
    message.includes("socket hang up") ||
    message.includes("rate limit") ||
    message.includes("resource has been exhausted") ||
    message.includes("overloaded")
  ) {
    return true;
  }

  return false;
}

function sanitizeErrorMessage(error: unknown): {
  message: string;
  code: EmbeddingErrorCode;
  status?: number;
  isTransient: boolean;
} {
  if (error instanceof EmbeddingError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      isTransient: error.isTransient,
    };
  }

  const err = error as Record<string, any>;
  const status = err?.status ?? err?.statusCode ?? err?.response?.status;
  const rawMsg = String(err?.message || "").toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    rawMsg.includes("api key") ||
    rawMsg.includes("unauthenticated") ||
    rawMsg.includes("permission denied")
  ) {
    return {
      message: "Gemini embedding authentication failed. Please verify provider credentials.",
      code: "AUTHENTICATION_ERROR",
      status: status || 401,
      isTransient: false,
    };
  }

  if (status === 429 || rawMsg.includes("resource has been exhausted") || rawMsg.includes("quota")) {
    return {
      message: "Gemini embedding rate limit exceeded. Backoff required.",
      code: "RATE_LIMIT_ERROR",
      status: 429,
      isTransient: true,
    };
  }

  if (status === 400 || rawMsg.includes("invalid argument")) {
    return {
      message: "Invalid embedding request parameters.",
      code: "UNEXPECTED_ERROR",
      status: 400,
      isTransient: false,
    };
  }

  if (status && status >= 500 && status < 600) {
    return {
      message: `Gemini embedding provider unavailable (status ${status}).`,
      code: "TRANSIENT_PROVIDER_ERROR",
      status,
      isTransient: true,
    };
  }

  if (isTransientError(error)) {
    return {
      message: "Transient network or provider error during embedding generation.",
      code: "TRANSIENT_PROVIDER_ERROR",
      status,
      isTransient: true,
    };
  }

  return {
    message: "An unexpected error occurred while generating embeddings.",
    code: "UNEXPECTED_ERROR",
    status,
    isTransient: false,
  };
}

/**
 * Generates a 768-dimensional embedding vector for an educational content chunk.
 *
 * @param text The plain text or Markdown chunk to embed.
 * @param options Configuration options, client injection, or retry tuning.
 * @returns An array of exactly 768 numbers representing the embedding.
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  if (typeof text !== "string") {
    throw new EmbeddingError("Input text must be a valid string.", "EMPTY_INPUT", {
      isTransient: false,
    });
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new EmbeddingError("Input text cannot be empty or whitespace only.", "EMPTY_INPUT", {
      isTransient: false,
    });
  }

  if (trimmed.length > MAX_INPUT_CHARACTERS) {
    throw new EmbeddingError(
      `Input text length (${trimmed.length}) exceeds maximum limit of ${MAX_INPUT_CHARACTERS} characters.`,
      "INPUT_TOO_LONG",
      { isTransient: false }
    );
  }

  const model = options.model || process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const dimensions =
    options.dimensions ||
    (process.env.GEMINI_EMBEDDING_DIMENSIONS
      ? parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS, 10)
      : DEFAULT_EMBEDDING_DIMENSIONS);
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? BASE_RETRY_DELAY_MS;

  let client = options.client;
  if (!client) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new EmbeddingError(
        "GEMINI_API_KEY environment variable is not configured.",
        "CONFIGURATION_UNAVAILABLE",
        { isTransient: false }
      );
    }
    const ai = new GoogleGenAI({ apiKey });
    client = ai as unknown as EmbeddingProviderClient;
  }

  let lastError: EmbeddingError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.models.embedContent({
        model,
        contents: trimmed,
        config: {
          outputDimensionality: dimensions,
        },
      });

      const values =
        response?.embeddings?.[0]?.values ??
        response?.embedding?.values ??
        (response as any)?.values;

      if (!values || !Array.isArray(values)) {
        throw new EmbeddingError(
          "Provider response did not contain embedding values.",
          "MALFORMED_RESPONSE",
          { isTransient: false }
        );
      }

      if (values.length !== dimensions) {
        throw new EmbeddingError(
          `Embedding dimension mismatch: expected ${dimensions}, got ${values.length}.`,
          "INVALID_DIMENSIONS",
          { isTransient: false }
        );
      }

      for (let i = 0; i < values.length; i++) {
        if (typeof values[i] !== "number" || isNaN(values[i])) {
          throw new EmbeddingError(
            `Embedding contains non-numeric value at index ${i}.`,
            "MALFORMED_RESPONSE",
            { isTransient: false }
          );
        }
      }

      return values;
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err);
      lastError = new EmbeddingError(sanitized.message, sanitized.code, {
        status: sanitized.status,
        isTransient: sanitized.isTransient,
      });

      if (attempt < maxRetries && sanitized.isTransient) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw (
    lastError ||
    new EmbeddingError("Embedding generation failed after retries.", "UNEXPECTED_ERROR", {
      isTransient: false,
    })
  );
}
