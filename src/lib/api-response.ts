import { NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * Standard safe API error response helper.
 * Ensures internal exception messages and stack traces are logged securely
 * on the server, but sanitized before returning to the client.
 */
export function apiError(
  publicMessage: string,
  statusCode: number,
  internalError?: unknown,
  context?: Record<string, unknown>
): NextResponse {
  if (internalError) {
    logger.error("api_request_failed", internalError, {
      status: statusCode,
      publicMessage,
      ...context,
    });
  }

  return NextResponse.json(
    { error: publicMessage },
    { status: statusCode }
  );
}
