/**
 * OLVYN — Post-Deployment Health Check & Production Smoke Test
 *
 * Verifies that the deployed OLVYN instance is operational and connected to Supabase PostgreSQL:
 * 1. Sends HTTP GET to ${TARGET_URL}/api/health
 * 2. Validates HTTP 200 OK
 * 3. Validates JSON payload format
 * 4. Verifies status === "ok"
 * 5. Verifies checks.application === "ok"
 * 6. Verifies checks.database === "ok"
 * 7. Confirms zero secret leakage in health response
 * 8. Fails with exit code 1 if status is 503, degraded, or network unreachable
 *
 * Zero external dependencies. Uses standard fetch and node runtime.
 *
 * Usage:
 *   npx tsx scripts/smoke-health.ts
 *   npx tsx scripts/smoke-health.ts https://olvyn.vercel.app
 *   TARGET_URL=https://olvyn.vercel.app npx tsx scripts/smoke-health.ts
 */

interface HealthCheckPayload {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    application: "ok";
    database: "ok" | "unhealthy";
  };
}

const SENSITIVE_TOKENS = [
  "password",
  "secret",
  "token",
  "key",
  "database_url",
  "direct_url",
  "postgres:",
  "postgresql:",
  "stack",
  "trace",
];

async function runSmokeCheck() {
  console.log("==================================================================");
  console.log("🚀 OLVYN — POST-DEPLOYMENT HEALTH & PRODUCTION SMOKE TEST");
  console.log("==================================================================\n");

  // Determine target URL from CLI argument, env var, or local default
  const cliArg = process.argv[2];
  const targetBaseUrl = (
    cliArg ||
    process.env.TARGET_URL ||
    process.env.DEPLOYMENT_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const healthUrl = `${targetBaseUrl}/api/health`;
  console.log(`Target Endpoint: ${healthUrl}`);
  console.log(`Timestamp:       ${new Date().toISOString()}\n`);

  let response: Response;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s probe timeout

    response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "OLVYN-DevOps-SmokeCheck/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (netErr: any) {
    console.error(`❌ [FAIL] Network connectivity error to ${healthUrl}:`);
    console.error(`   ${netErr?.message || netErr}`);
    console.error("\nVerdict: Deployment is UNREACHABLE or offline.");
    process.exit(1);
  }

  const durationMs = Date.now() - startTime;
  const statusCode = response.status;
  const contentType = response.headers.get("content-type") || "";

  console.log(`Response Status: HTTP ${statusCode} (${durationMs}ms)`);
  console.log(`Content-Type:    ${contentType}`);

  // 1. Verify JSON content type
  if (!contentType.includes("application/json")) {
    console.error(`❌ [FAIL] Expected Content-Type 'application/json', got '${contentType}'`);
    process.exit(1);
  }

  let bodyText = "";
  let payload: HealthCheckPayload;
  try {
    bodyText = await response.text();
    payload = JSON.parse(bodyText);
  } catch (parseErr) {
    console.error("❌ [FAIL] Response body is not valid JSON.");
    process.exit(1);
  }

  // 2. Secret Redaction Check
  console.log("\n--- Validating Response Sanitization & Safety ---");
  const lowercaseBody = bodyText.toLowerCase();
  for (const token of SENSITIVE_TOKENS) {
    if (lowercaseBody.includes(token.toLowerCase())) {
      console.error(`❌ [FAIL] Health response leaked sensitive token: '${token}'`);
      process.exit(1);
    }
  }
  console.log("  ✅ Response payload strictly excludes sensitive tokens and connection strings");

  // 3. Status Evaluation
  console.log("\n--- Evaluating Subsystem Health ---");
  console.log(`  Top-Level Status: ${payload.status}`);
  console.log(`  Application:      ${payload.checks?.application}`);
  console.log(`  Database Probe:   ${payload.checks?.database}`);
  console.log(`  Uptime (seconds): ${payload.uptime}`);
  console.log(`  Version:          ${payload.version}`);

  if (statusCode === 503 || payload.status === "degraded" || payload.checks?.database === "unhealthy") {
    console.error("\n❌ [FAIL] Production health check reports DEGRADED state:");
    console.error("   - Database probe (SELECT 1) failed or timed out.");
    console.error("   - Status code: HTTP 503 Service Unavailable");
    console.error("   - Verify Supabase PostgreSQL connection pooler and credentials.");
    console.error("\nVerdict: DEPLOYMENT VERIFICATION FAILED (DATABASE UNHEALTHY).");
    process.exit(1);
  }

  if (statusCode !== 200 || payload.status !== "ok" || payload.checks?.application !== "ok" || payload.checks?.database !== "ok") {
    console.error(`\n❌ [FAIL] Health check failed with status HTTP ${statusCode}`);
    console.error("\nVerdict: DEPLOYMENT VERIFICATION FAILED.");
    process.exit(1);
  }

  console.log("\n==================================================================");
  console.log("✨ OLVYN Production Health Smoke Test: ALL CHECKS PASSED (HTTP 200 OK)");
  console.log("==================================================================\n");
}

runSmokeCheck().catch((err) => {
  console.error("Unhandled error in smoke check:", err);
  process.exit(1);
});
