/**
 * OLVYN — AUTHENTICATION SECURITY HARDENING TEST SUITE
 *
 * Deterministic automated verification covering:
 * 1. Missing AUTH_SECRET does not silently use a production fallback.
 * 2. Repeated authentication attempts eventually receive 429.
 * 3. Retry-After is present when rate limited.
 * 4. Authentication errors do not reveal account existence.
 * 5. Authentication errors do not expose stack traces.
 * 6. Authentication responses do not expose secrets.
 * 7. Normal authentication remains possible below the limit.
 * 8. Existing OAuth behavior and redirect safety remain intact.
 *
 * Runs fully isolated without external network calls or production databases.
 */

import { getJwtSecret, getSessionCookieOptions, createSession, getLegacySession } from "../src/lib/auth-legacy";
import {
  authLoginRateLimiter,
  authRegisterRateLimiter,
  authOAuthRateLimiter,
  InMemoryRateLimiter,
  extractClientIp,
} from "../src/lib/rate-limiter";
import { sanitizeData, logger } from "../src/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { POST as loginHandler } from "../src/app/api/auth/login/route";
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { GET as meHandler } from "../src/app/api/auth/me/route";
import { GET as googleHandler } from "../src/app/api/auth/google/route";
import { GET as callbackHandler } from "../src/app/auth/callback/route";

async function runAuthSecuritySuite() {
  console.log("==================================================================");
  console.log("🔒 OLVYN — AUTHENTICATION SECURITY HARDENING TEST SUITE");
  console.log("==================================================================\n");

  let totalAssertions = 0;
  let passedAssertions = 0;

  function assert(condition: boolean, description: string) {
    totalAssertions++;
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passedAssertions++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
    }
  }

  // Preserve original environment
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAuthSecret = process.env.AUTH_SECRET;

  function setNodeEnv(val: string | undefined) {
    (process.env as Record<string, string | undefined>).NODE_ENV = val;
  }

  try {
    // ==================================================================
    // Group 1: AUTH_SECRET Production Fallback Elimination
    // ==================================================================
    console.log("--- Group 1: AUTH_SECRET Production Fallback Elimination ---");

    // 1.1 Unset AUTH_SECRET in production fails safely
    setNodeEnv("production");
    delete process.env.AUTH_SECRET;

    let threwOnMissingSecret = false;
    let missingSecretMessage = "";
    try {
      getJwtSecret();
    } catch (err: any) {
      threwOnMissingSecret = true;
      missingSecretMessage = err.message;
    }
    assert(threwOnMissingSecret, "Unset AUTH_SECRET in production throws error (fail-closed)");
    assert(
      !missingSecretMessage.includes("openlearner_fallback_secret"),
      "Error does not contain or fall back to any hardcoded production secret"
    );

    // 1.2 Weak AUTH_SECRET in production fails safely
    process.env.AUTH_SECRET = "too-short-secret";
    let threwOnShortSecret = false;
    try {
      getJwtSecret();
    } catch {
      threwOnShortSecret = true;
    }
    assert(threwOnShortSecret, "AUTH_SECRET shorter than 32 chars in production throws error");

    // 1.3 createSession fails safely in production when secret is missing
    delete process.env.AUTH_SECRET;
    let threwInCreateSession = false;
    try {
      await createSession({
        userId: "test-user-1",
        email: "test@example.com",
        name: "Test User",
        role: "LEARNER",
      });
    } catch {
      threwInCreateSession = true;
    }
    assert(threwInCreateSession, "createSession() throws unrecoverable error when AUTH_SECRET is missing in production");

    // 1.4 getLegacySession returns null safely in production when secret is missing
    const legacySessionResult = await getLegacySession();
    assert(legacySessionResult === null, "getLegacySession() returns null safely when AUTH_SECRET is missing in production");

    // 1.5 Valid secret in production works as expected
    process.env.AUTH_SECRET = "production_super_secure_auth_secret_minimum_32_characters_2026!";
    let validSecretResult: Uint8Array | null = null;
    try {
      validSecretResult = getJwtSecret();
    } catch {
      validSecretResult = null;
    }
    assert(validSecretResult !== null && validSecretResult.length > 0, "Valid 32+ character AUTH_SECRET succeeds in production");

    // Restore test environment AUTH_SECRET
    process.env.AUTH_SECRET = originalAuthSecret || "test_dummy_auth_secret_minimum_32_characters_long_for_test";
    setNodeEnv("test");

    // ==================================================================
    // Group 2: Brute-Force & Rate-Limiting Protection (429 & Retry-After)
    // ==================================================================
    console.log("\n--- Group 2: Brute-Force & Rate-Limiting Protection ---");

    const isolatedLimiter = new InMemoryRateLimiter(60 * 1000, 3);
    const testClientIp = `client-test-${Date.now()}`;

    // 2.1 First 3 requests allowed
    const r1 = isolatedLimiter.check(testClientIp);
    const r2 = isolatedLimiter.check(testClientIp);
    const r3 = isolatedLimiter.check(testClientIp);
    assert(r1.allowed && r1.remaining === 2, "First request within rate limit is allowed (remaining: 2)");
    assert(r2.allowed && r2.remaining === 1, "Second request within rate limit is allowed (remaining: 1)");
    assert(r3.allowed && r3.remaining === 0, "Third request reaching limit is allowed (remaining: 0)");

    // 2.2 4th request blocked (429)
    const r4 = isolatedLimiter.check(testClientIp);
    assert(!r4.allowed, "Repeated authentication attempt beyond limit is blocked");
    assert(r4.remaining === 0, "Blocked rate limit check reports remaining = 0");
    assert(typeof r4.resetSeconds === "number" && r4.resetSeconds > 0, "Rate check provides positive resetSeconds");

    // 2.3 Distinct IP is not affected
    const distinctIp = `distinct-ip-${Date.now()}`;
    const rOther = isolatedLimiter.check(distinctIp);
    assert(rOther.allowed && rOther.remaining === 2, "Separate client IP remains allowed below its own threshold");

    // 2.4 End-to-end HTTP 429 response on /api/auth/login
    const floodedIp = `flooded-login-ip-${Date.now()}`;
    // Exhaust limit on authLoginRateLimiter
    for (let i = 0; i < 5; i++) {
      authLoginRateLimiter.check(floodedIp);
    }
    const fakeLoginReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": floodedIp,
      },
      body: JSON.stringify({ email: "victim@example.com", password: "Password123!" }),
    });

    const loginBlockedRes = await loginHandler(fakeLoginReq);
    assert(loginBlockedRes.status === 429, "API handler returns HTTP 429 Too Many Requests when rate limited");
    const retryAfterHeader = loginBlockedRes.headers.get("Retry-After");
    assert(retryAfterHeader !== null && parseInt(retryAfterHeader, 10) > 0, "HTTP 429 response includes valid Retry-After header");
    const loginBlockedBody = await loginBlockedRes.json();
    assert(
      loginBlockedBody.error === "Too many authentication attempts. Please try again later.",
      "Rate limit error message is safe, generic, and does not leak account details"
    );

    // ==================================================================
    // Group 3: Authentication Error Sanitization & Account Existence Isolation
    // ==================================================================
    console.log("\n--- Group 3: Error Sanitization & Account Existence Isolation ---");

    const safeIp1 = `safe-login-ip-1-${Date.now()}`;
    const safeIp2 = `safe-login-ip-2-${Date.now()}`;

    // 3.1 Non-existent user login
    const nonExistentReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": safeIp1 },
      body: JSON.stringify({ email: `nonexistent_${Date.now()}@example.com`, password: "WrongPassword123!" }),
    });
    const nonExistentRes = await loginHandler(nonExistentReq);
    const nonExistentBody = await nonExistentRes.json();
    assert(nonExistentRes.status === 401, "Non-existent user login returns HTTP 401");
    assert(nonExistentBody.error === "Invalid email or password.", "Non-existent user returns generic 'Invalid email or password.'");

    // 3.2 Bad password for existing user
    const badPasswordReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": safeIp2 },
      body: JSON.stringify({ email: "admin@openlearner.ai", password: "CompletelyWrongPassword!" }),
    });
    const badPasswordRes = await loginHandler(badPasswordReq);
    const badPasswordBody = await badPasswordRes.json();
    assert(badPasswordRes.status === 401, "Bad password login returns HTTP 401");
    assert(badPasswordBody.error === "Invalid email or password.", "Bad password login returns generic 'Invalid email or password.'");
    assert(
      nonExistentBody.error === badPasswordBody.error,
      "Non-existent user and bad password responses are 100% identical (no user enumeration)"
    );

    // 3.3 Registration duplicate account error sanitization
    const regIp = `reg-test-ip-${Date.now()}`;
    const duplicateRegReq = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": regIp },
      body: JSON.stringify({
        email: "admin@openlearner.ai", // Existing user
        password: "ValidPassword123!",
        name: "Attacker Enumerator",
      }),
    });
    const duplicateRegRes = await registerHandler(duplicateRegReq);
    const duplicateRegBody = await duplicateRegRes.json();
    assert(
      duplicateRegRes.status === 400,
      "Duplicate registration returns HTTP 400 Bad Request instead of 409 Conflict"
    );
    assert(
      !duplicateRegBody.error.toLowerCase().includes("already exists") &&
      !duplicateRegBody.error.toLowerCase().includes("account exists"),
      "Duplicate registration error does NOT reveal that the email/account exists"
    );
    assert(
      duplicateRegBody.error === "Unable to complete registration. Please check your details or try signing in.",
      "Registration error uses safe generic instruction"
    );

    // 3.4 Zero stack traces in error responses
    const stringifiedError = JSON.stringify(duplicateRegBody) + JSON.stringify(nonExistentBody);
    assert(!stringifiedError.includes("stack"), "Response bodies strictly omit stack trace property");
    assert(!stringifiedError.includes("prisma"), "Response bodies strictly omit internal ORM/database details");

    // ==================================================================
    // Group 4: Credential & Secret Redaction in Responses & Logs
    // ==================================================================
    console.log("\n--- Group 4: Credential & Secret Redaction ---");

    // 4.1 /api/auth/me user projection excludes passwordHash
    const meRes = await meHandler();
    const meBody = await meRes.json();
    if (meBody.user) {
      assert(!("passwordHash" in meBody.user), "/api/auth/me response strictly excludes 'passwordHash'");
      assert(!("password" in meBody.user), "/api/auth/me response strictly excludes 'password'");
    } else {
      assert(meRes.status === 401 && meBody.user === null, "/api/auth/me safely returns 401 when unauthenticated");
    }

    // 4.2 Logger sensitive-data redaction
    const sensitivePayload = {
      userEmail: "learner@openlearner.ai",
      password: "SuperSecretPassword123!",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig",
      auth_secret: "super-secret-key-32chars",
      apiKey: "AIzaSySecretKey",
      database_url: "postgresql://user:pass@host:5432/db",
    };
    const sanitized = sanitizeData(sensitivePayload) as Record<string, unknown>;
    assert(sanitized.password === "[REDACTED]", "Logger cleanly redacts 'password'");
    assert(sanitized.token === "[REDACTED]", "Logger cleanly redacts 'token'");
    assert(sanitized.auth_secret === "[REDACTED]", "Logger cleanly redacts 'auth_secret'");
    assert(sanitized.apiKey === "[REDACTED]", "Logger cleanly redacts 'apiKey'");
    assert(sanitized.database_url === "[REDACTED]", "Logger cleanly redacts 'database_url'");

    // 4.3 Cookie security flags
    setNodeEnv("production");
    const cookieOptions = getSessionCookieOptions();
    assert(cookieOptions.httpOnly === true, "Session cookie enforces httpOnly: true");
    assert(cookieOptions.sameSite === "lax", "Session cookie enforces sameSite: 'lax'");
    assert(cookieOptions.path === "/", "Session cookie path is restricted to '/'");
    setNodeEnv("test");

    // ==================================================================
    // Group 5: OAuth Redirect Validation & Safe Provider Error Handling
    // ==================================================================
    console.log("\n--- Group 5: OAuth Redirect Validation & Safe Handling ---");

    // 5.1 Google OAuth Initiation Open Redirect Prevention
    const maliciousGoogleReq = new NextRequest(
      "http://localhost:3000/api/auth/google?next=https://attacker-controlled-site.com",
      {
        headers: { "x-forwarded-for": `oauth-test-ip-${Date.now()}` },
      }
    );
    const googleRes = await googleHandler(maliciousGoogleReq);
    const redirectLocation = googleRes.headers.get("Location") || "";
    assert(
      !redirectLocation.includes("attacker-controlled-site.com"),
      "Google OAuth initiation blocks external open redirect target"
    );

    // 5.2 Callback Open Redirect Prevention
    const maliciousCallbackReq = new NextRequest(
      "http://localhost:3000/auth/callback?code=mock_code&next=//evil.com",
      {
        headers: { "x-forwarded-for": `callback-test-ip-${Date.now()}` },
      }
    );
    const callbackRes = await callbackHandler(maliciousCallbackReq);
    const callbackLocation = callbackRes.headers.get("Location") || "";
    assert(
      !callbackLocation.includes("//evil.com"),
      "Auth callback blocks protocol-relative open redirect (//evil.com)"
    );

    // 5.3 Callback sanitized error message in URL
    const errorCallbackReq = new NextRequest(
      "http://localhost:3000/auth/callback?error=invalid_grant&error_description=Raw+internal+provider+stack+trace",
      {
        headers: { "x-forwarded-for": `callback-error-ip-${Date.now()}` },
      }
    );
    const errorCallbackRes = await callbackHandler(errorCallbackReq);
    const errorCallbackLocation = errorCallbackRes.headers.get("Location") || "";
    assert(
      !errorCallbackLocation.includes("Raw+internal+provider+stack+trace"),
      "Auth callback does NOT reflect raw external provider errors in URL parameter"
    );

    // 5.4 ExtractClientIp utility
    const mockProxyReq = new Request("http://localhost:3000", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    assert(extractClientIp(mockProxyReq) === "203.0.113.195", "extractClientIp parses first IP from x-forwarded-for");

    // ==================================================================
    // Summary
    // ==================================================================
    console.log("\n==================================================================");
    console.log(`✨ OLVYN Auth Security Suite: ${passedAssertions}/${totalAssertions} assertions passed.`);
    console.log("==================================================================\n");

    if (passedAssertions !== totalAssertions) {
      process.exit(1);
    }
  } finally {
    setNodeEnv(originalNodeEnv);
    if (originalAuthSecret) {
      process.env.AUTH_SECRET = originalAuthSecret;
    }
  }
}

runAuthSecuritySuite().catch((err) => {
  console.error("Auth security test suite encountered an unhandled exception:", err);
  process.exit(1);
});
