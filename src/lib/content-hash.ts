import crypto from "crypto";

/**
 * OpenLearnerAI — Deterministic Content Hashing
 *
 * Phase 3B-2: Isolated SHA-256 Hashing Helper
 *
 * Requirements:
 * - Deterministic: Identical text always yields identical hexadecimal hash.
 * - Algorithm: SHA-256.
 * - Encoding: UTF-8.
 * - Pure function: Zero randomness, zero salt, zero timestamps.
 */
export function hashContent(text: string): string {
  if (typeof text !== "string") {
    throw new TypeError("hashContent requires a valid string input.");
  }
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
