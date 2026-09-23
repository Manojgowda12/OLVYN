import { GET } from "../src/app/api/health/route";
import { db } from "../src/lib/db";
import { sanitizeData } from "../src/lib/logger";

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runHealthTests() {
  console.log("==================================================================");
  console.log("🚀 OLVYN — HEALTH ENDPOINT & RELIABILITY TEST SUITE");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // Test 1-4: Standard Healthy Execution
  // -------------------------------------------------------------------------
  console.log("--- Group 1: Healthy Operational State ---");
  // Ensure hermetic execution in CI environments without live database connection
  const originalQueryRawHealthy = db.$queryRawUnsafe;
  let healthyResponse: Response;
  try {
    // If live DB connects, use it; otherwise stub success for deterministic payload check
    healthyResponse = await GET();
    if (healthyResponse.status !== 200) {
      (db as any).$queryRawUnsafe = async () => [{ 1: 1 }];
      healthyResponse = await GET();
    }
  } catch {
    (db as any).$queryRawUnsafe = async () => [{ 1: 1 }];
    healthyResponse = await GET();
  } finally {
    db.$queryRawUnsafe = originalQueryRawHealthy;
  }

  assert(healthyResponse instanceof Response, "GET /api/health returns a Web standard Response object");
  assert(healthyResponse.status === 200, `Healthy check returns HTTP 200 (Got: ${healthyResponse.status})`);

  const healthyBody = await healthyResponse.json();
  assert(typeof healthyBody === "object" && healthyBody !== null, "Response body is valid JSON");
  assert(healthyBody.status === "ok", "Top-level status is 'ok'");
  assert(healthyBody.checks?.application === "ok", "Application check is 'ok'");
  assert(healthyBody.checks?.database === "ok", "Database check is 'ok'");
  assert(typeof healthyBody.timestamp === "string", "Timestamp is present as ISO string");
  assert(typeof healthyBody.uptime === "number", "Uptime is reported as a number");

  // -------------------------------------------------------------------------
  // Test 5: Strict Zero-Secret Verification
  // -------------------------------------------------------------------------
  console.log("\n--- Group 2: Secret Leakage & Payload Safety ---");
  const rawBodyString = JSON.stringify(healthyBody);
  const secretKeywords = [
    "DATABASE_URL",
    "DIRECT_URL",
    "AUTH_SECRET",
    "GEMINI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "postgres:",
    "postgresql:",
    "password",
    "secret",
    "stack",
    "trace",
  ];

  for (const keyword of secretKeywords) {
    assert(
      !rawBodyString.toLowerCase().includes(keyword.toLowerCase()),
      `Health response strictly excludes sensitive token: '${keyword}'`
    );
  }

  // -------------------------------------------------------------------------
  // Test 6-7: Degraded Database Failure Handling (HTTP 503)
  // -------------------------------------------------------------------------
  console.log("\n--- Group 3: Database Degradation & Error Sanitization (HTTP 503) ---");
  // Temporarily stub db.$queryRawUnsafe to simulate database unreachable failure
  const originalQueryRaw = db.$queryRawUnsafe;
  try {
    (db as any).$queryRawUnsafe = async () => {
      throw new Error("Simulated database connection refused at 127.0.0.1:5432");
    };

    const degradedResponse = await GET();
    assert(
      degradedResponse.status === 503,
      `Database probe failure produces HTTP 503 Service Unavailable (Got: ${degradedResponse.status})`
    );

    const degradedBody = await degradedResponse.json();
    assert(degradedBody.status === "degraded", "Degraded status is 'degraded'");
    assert(degradedBody.checks?.application === "ok", "Application check remains 'ok' during DB outage");
    assert(degradedBody.checks?.database === "unhealthy", "Database check cleanly reports 'unhealthy'");

    const degradedRawString = JSON.stringify(degradedBody);
    assert(
      !degradedRawString.includes("Simulated database connection refused"),
      "Raw database exception message is NOT exposed to client in degraded response"
    );
    assert(
      !degradedRawString.includes("127.0.0.1"),
      "Internal database network address is NOT exposed in degraded response"
    );
  } finally {
    // Restore original query method
    db.$queryRawUnsafe = originalQueryRaw;
  }

  // -------------------------------------------------------------------------
  // Test 8: Logger Redaction Unit Tests
  // -------------------------------------------------------------------------
  console.log("\n--- Group 4: Structured Logger Sanitization ---");
  const dirtyObject = {
    user: "test-user",
    password: "SuperSecretPassword123!",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.signature",
    database_url: "postgresql://postgres:mysecretpassword@aws.pooler.supabase.com:6543/postgres",
    safeField: 42,
  };

  const cleanObject: any = sanitizeData(dirtyObject);
  assert(cleanObject.user === "test-user", "Non-sensitive fields are preserved");
  assert(cleanObject.safeField === 42, "Numeric fields are preserved");
  assert(cleanObject.password === "[REDACTED]", "Password key is cleanly redacted to [REDACTED]");
  assert(cleanObject.token === "[REDACTED]", "Token key is cleanly redacted to [REDACTED]");
  assert(cleanObject.database_url === "[REDACTED]", "Database URL key is cleanly redacted");

  const rawStringWithDb = "Error connecting to postgresql://admin:secret123@db.supabase.co:5432/main";
  const sanitizedString = sanitizeData(rawStringWithDb) as string;
  assert(!sanitizedString.includes("secret123"), "Connection string credentials inside text strings are redacted");

  console.log("\n==================================================================");
  console.log(`✨ OLVYN Reliability & Health Suite: ${passed}/${total} assertions passed.`);
  console.log("==================================================================");
}

runHealthTests().catch((err) => {
  console.error("Health test failed:", err);
  process.exit(1);
});
