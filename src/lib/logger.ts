/**
 * OLVYN — Production Structured Server Logging Utility
 *
 * Provides structured JSON logging with strict sensitive-data redaction.
 * Zero external dependencies.
 */

export type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  event: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  error?: {
    name?: string;
    message: string;
  };
  metadata?: Record<string, unknown>;
}

// Patterns that identify sensitive values
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /key/i,
  /credential/i,
  /database_url/i,
  /direct_url/i,
  /memory/i,
  /prompt/i,
];

const CONNECTION_STRING_PATTERN = /postgres(ql)?:\/\/[^@]+@/i;
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/;

/**
 * Recursively redacts sensitive values from objects or strings.
 */
export function sanitizeData(data: unknown, depth = 0): unknown {
  if (depth > 4) return "[Truncated: max depth]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Redact connection strings with credentials
    let sanitized = data.replace(CONNECTION_STRING_PATTERN, "postgresql://[REDACTED]@");
    // Redact JWT tokens
    sanitized = sanitized.replace(JWT_PATTERN, "[REDACTED_JWT]");
    return sanitized;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(k));
      if (isSensitiveKey) {
        sanitizedObj[k] = "[REDACTED]";
      } else {
        sanitizedObj[k] = sanitizeData(v, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return String(data);
}

/**
 * Sanitizes an error object so internal paths, queries, and credentials are never exposed.
 */
function sanitizeError(error: unknown): { name?: string; message: string } {
  if (!error) return { message: "Unknown error" };

  if (error instanceof Error) {
    let sanitizedMessage = String(sanitizeData(error.message));
    return {
      name: error.name || "Error",
      message: sanitizedMessage,
    };
  }

  return {
    message: String(sanitizeData(String(error))),
  };
}

class StructuredLogger {
  private formatLog(
    level: LogLevel,
    event: string,
    metadata?: Record<string, unknown>,
    error?: unknown
  ): string {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      event,
    };

    if (metadata) {
      if (typeof metadata.route === "string") payload.route = metadata.route;
      if (typeof metadata.method === "string") payload.method = metadata.method;
      if (typeof metadata.status === "number") payload.status = metadata.status;
      if (typeof metadata.durationMs === "number") payload.durationMs = metadata.durationMs;

      const filteredMeta = { ...metadata };
      delete filteredMeta.route;
      delete filteredMeta.method;
      delete filteredMeta.status;
      delete filteredMeta.durationMs;

      if (Object.keys(filteredMeta).length > 0) {
        payload.metadata = sanitizeData(filteredMeta) as Record<string, unknown>;
      }
    }

    if (error) {
      payload.error = sanitizeError(error);
    }

    return JSON.stringify(payload);
  }

  info(event: string, metadata?: Record<string, unknown>) {
    console.log(this.formatLog("info", event, metadata));
  }

  warn(event: string, metadata?: Record<string, unknown>, error?: unknown) {
    console.warn(this.formatLog("warn", event, metadata, error));
  }

  error(event: string, error?: unknown, metadata?: Record<string, unknown>) {
    console.error(this.formatLog("error", event, metadata, error));
  }

  apiError(
    route: string,
    method: string,
    status: number,
    error: unknown,
    context?: Record<string, unknown>
  ) {
    this.error("api_error", error, {
      route,
      method,
      status,
      ...context,
    });
  }

  dbError(operation: string, error: unknown, context?: Record<string, unknown>) {
    this.error("database_error", error, {
      operation,
      ...context,
    });
  }
}

export const logger = new StructuredLogger();
