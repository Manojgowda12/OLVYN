import { performance } from "perf_hooks";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

interface BenchmarkResult {
  target: string;
  type: string;
  coldMs: number;
  warmMs: number;
  status: number;
}

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "openlearner_fallback_secret_must_be_overridden_in_production_32chars"
);

async function getLearnerCookie(): Promise<string> {
  const learner = await prisma.user.findFirst({ where: { role: "LEARNER" } });
  if (!learner) return "";
  const token = await new SignJWT({
    userId: learner.id,
    email: learner.email,
    name: learner.name,
    role: learner.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
  return `openlearner_session=${token}`;
}

async function measureGet(path: string, cookie?: string): Promise<{ cold: number; warm: number; status: number }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = cookie ? { Cookie: cookie } : {};

  // Cold
  const startCold = performance.now();
  const resCold = await fetch(url, { headers, redirect: "manual" });
  await resCold.text();
  const cold = Math.round(performance.now() - startCold);

  // Warm
  const warmSamples: number[] = [];
  for (let i = 0; i < 3; i++) {
    const startWarm = performance.now();
    const resWarm = await fetch(url, { headers, redirect: "manual" });
    await resWarm.text();
    warmSamples.push(performance.now() - startWarm);
  }
  const warm = Math.round(warmSamples.reduce((a, b) => a + b, 0) / warmSamples.length);

  return { cold, warm, status: resCold.status };
}

async function measurePost(path: string, body: any): Promise<{ cold: number; warm: number; status: number }> {
  const url = `${BASE_URL}${path}`;

  // Cold
  const startCold = performance.now();
  const resCold = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await resCold.text();
  const cold = Math.round(performance.now() - startCold);

  // Warm
  const warmSamples: number[] = [];
  for (let i = 0; i < 3; i++) {
    const startWarm = performance.now();
    const resWarm = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await resWarm.text();
    warmSamples.push(performance.now() - startWarm);
  }
  const warm = Math.round(warmSamples.reduce((a, b) => a + b, 0) / warmSamples.length);

  return { cold, warm, status: resCold.status };
}

async function run() {
  console.log("==================================================================");
  console.log("📊 OPENLEARNERAI — PERFORMANCE MEASUREMENT SUITE");
  console.log("==================================================================");

  const cookie = await getLearnerCookie();

  const targets = [
    { target: "Home page /", path: "/", type: "PAGE", useCookie: false },
    { target: "Explore page", path: "/explore", type: "PAGE", useCookie: false },
    { target: "Course detail page", path: "/courses/python-fundamentals-for-beginners", type: "PAGE", useCookie: false },
    { target: "Learn player page", path: "/learn/python-fundamentals-for-beginners/introduction-what-is-python", type: "PAGE", useCookie: true },
    { target: "Nova page", path: "/nova", type: "PAGE", useCookie: false },
  ];

  const results: BenchmarkResult[] = [];

  for (const t of targets) {
    const m = await measureGet(t.path, t.useCookie ? cookie : undefined);
    results.push({
      target: t.target,
      type: t.type,
      coldMs: m.cold,
      warmMs: m.warm,
      status: m.status,
    });
    console.log(`[${t.type}] ${t.target.padEnd(25)} | HTTP ${m.status} | Cold: ${m.cold.toString().padStart(5)} ms | Warm: ${m.warm.toString().padStart(5)} ms`);
  }

  // Measure Nova Chat API
  const apiMeasure = await measurePost("/api/nova/chat", { message: "What is AI?" });
  results.push({
    target: "Nova chat API",
    type: "API",
    coldMs: apiMeasure.cold,
    warmMs: apiMeasure.warm,
    status: apiMeasure.status,
  });
  console.log(`[API ] ${"Nova chat API".padEnd(25)} | HTTP ${apiMeasure.status} | Cold: ${apiMeasure.cold.toString().padStart(5)} ms | Warm: ${apiMeasure.warm.toString().padStart(5)} ms`);

  console.log("\n--- BENCHMARK JSON ---");
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
