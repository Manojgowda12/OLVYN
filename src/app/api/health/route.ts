import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface HealthCheckResponse {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    application: "ok";
    database: "ok" | "unhealthy";
  };
}

export async function GET() {
  const startTime = Date.now();
  let dbStatus: "ok" | "unhealthy" = "unhealthy";

  try {
    // Non-destructive, zero-table lightweight probe with a 3000ms timeout
    await Promise.race([
      db.$queryRawUnsafe("SELECT 1"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database ping timeout")), 3000)
      ),
    ]);
    dbStatus = "ok";
  } catch (error) {
    dbStatus = "unhealthy";
    logger.dbError("health_probe_select_1", error, {
      durationMs: Date.now() - startTime,
    });
  }

  const isHealthy = dbStatus === "ok";
  const statusCode = isHealthy ? 200 : 503;

  const payload: HealthCheckResponse = {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime: Math.floor(process.uptime()),
    checks: {
      application: "ok",
      database: dbStatus,
    },
  };

  return NextResponse.json(payload, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
