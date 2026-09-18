/**
 * Lightweight, in-memory sliding window rate limiter for API protection.
 * Protects serverless and Edge/Node endpoints against flooding with zero external dependencies.
 */

interface RateLimitRecord {
  timestamps: number[];
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private windowMs: number = 60 * 1000, private maxRequests: number = 20) {
    // Periodically clean up stale client entries every 5 minutes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.purgeExpired(), 5 * 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public check(identifier: string, customLimit?: number): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetSeconds: number;
  } {
    const now = Date.now();
    const limit = customLimit || this.maxRequests;
    const windowStart = now - this.windowMs;

    let record = this.store.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(identifier, record);
    }

    // Filter out timestamps older than the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldestInWindow = record.timestamps[0] || now;
      const resetSeconds = Math.max(1, Math.ceil((oldestInWindow + this.windowMs - now) / 1000));
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds,
      };
    }

    // Record this request timestamp
    record.timestamps.push(now);
    const remaining = Math.max(0, limit - record.timestamps.length);
    const resetSeconds = Math.ceil(this.windowMs / 1000);

    return {
      allowed: true,
      limit,
      remaining,
      resetSeconds,
    };
  }

  public reset(identifier?: string) {
    if (identifier) {
      this.store.delete(identifier);
    } else {
      this.store.clear();
    }
  }

  private purgeExpired() {
    const windowStart = Date.now() - this.windowMs;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// Global rate limiter instance for Nova AI Chat: 20 requests per minute per IP
export const novaRateLimiter = new InMemoryRateLimiter(60 * 1000, 20);
