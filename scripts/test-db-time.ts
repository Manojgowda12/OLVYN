import { db } from "../src/lib/db";

async function test() {
  const dbUrl = process.env.DATABASE_URL || "";
  let testUrl = dbUrl;
  try {
    const u = new URL(dbUrl);
    u.searchParams.set("sslmode", "require");
    testUrl = u.toString();
    console.log("DATABASE_URL Host:", u.hostname, "Port:", u.port, "User:", u.username, "Params:", u.search);
  } catch (e: any) {
    console.log("Could not parse DATABASE_URL:", e?.message);
  }

  console.log("Testing connection to database with sslmode=require...");
  const start = Date.now();
  const { PrismaClient } = await import("@prisma/client");
  const testPrisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    const res = await testPrisma.$queryRawUnsafe("SELECT 1 as connected");
    console.log("Success in", Date.now() - start, "ms:", res);
  } catch (err: any) {
    console.error("Failed in", Date.now() - start, "ms:", err?.message);
  } finally {
    await testPrisma.$disconnect();
  }
}

test();
