import fs from "fs";
import path from "path";

// 1. Safely load .env without printing secret values
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val) process.env[key] = val;
    }
  }
}

import { db } from "../src/lib/db";
import {
  discoverEligibleLessons,
  indexLessonContent,
  IndexLessonResult,
} from "../src/lib/indexing";

async function runBackfill() {
  console.log("==================================================================");
  console.log("📚 OPENLEARNERAI — LESSON CONTENT INDEXING BACKFILL PIPELINE");
  console.log("==================================================================\n");

  // Parse CLI options
  const args = process.argv.slice(2);
  let concurrency = 1;
  let force = false;
  let courseFilter: string | undefined = undefined;

  for (const arg of args) {
    if (arg.startsWith("--concurrency=")) {
      const val = parseInt(arg.split("=")[1], 10);
      if (!isNaN(val) && val > 0) concurrency = Math.min(val, 4); // Clamp to max 4 to protect rate limits
    } else if (arg === "--force") {
      force = true;
    } else if (arg.startsWith("--course=")) {
      courseFilter = arg.split("=")[1];
    }
  }

  console.log(`Configuration:`);
  console.log(`  Concurrency    : ${concurrency}`);
  console.log(`  Force Re-index : ${force}`);
  if (courseFilter) {
    console.log(`  Course Filter  : ${courseFilter}`);
  }
  console.log("");

  // 1. Discover eligible lessons
  console.log("--- 1. Discovering Eligible Lessons ---");
  const eligibleLessons = await discoverEligibleLessons({ courseIdOrSlug: courseFilter });
  console.log(`  Found ${eligibleLessons.length} eligible lesson(s) with textContent.\n`);

  if (eligibleLessons.length === 0) {
    console.log("No eligible lessons found to index.");
    await db.$disconnect();
    return;
  }

  // 2. Process lessons deterministically
  console.log("--- 2. Processing Lessons ---");
  let indexedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let emptyCount = 0;

  const queue = [...eligibleLessons];
  let processed = 0;
  const total = eligibleLessons.length;

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const lesson = queue.shift();
      if (!lesson) break;

      processed++;
      const prefix = `[${processed}/${total}]`;

      try {
        const result: IndexLessonResult = await indexLessonContent(lesson.id, {
          force,
        });

        if (result.status === "INDEXED") {
          indexedCount++;
          console.log(
            `  ✅ ${prefix} INDEXED: "${lesson.courseTitle}" > "${lesson.title}" (${result.chunkCount} chunks, ${result.totalTokens} tokens)`
          );
        } else if (result.status === "SKIPPED") {
          skippedCount++;
          console.log(
            `  ⏭️  ${prefix} SKIPPED: "${lesson.courseTitle}" > "${lesson.title}" (unchanged: ${result.chunkCount} chunks)`
          );
        } else if (result.status === "SKIPPED_EMPTY") {
          emptyCount++;
          console.log(
            `  ⚠️  ${prefix} SKIPPED_EMPTY: "${lesson.courseTitle}" > "${lesson.title}" (no content)`
          );
        } else {
          failedCount++;
          console.error(
            `  ❌ ${prefix} FAILED: "${lesson.courseTitle}" > "${lesson.title}" — ${result.error || result.reason}`
          );
        }
      } catch (err: any) {
        failedCount++;
        console.error(
          `  ❌ ${prefix} EXCEPTION: "${lesson.courseTitle}" > "${lesson.title}" — ${err.message || err}`
        );
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => processNext());
  await Promise.all(workers);

  // 3. Summary Report
  console.log("\n==================================================================");
  console.log("📊 INDEXING BACKFILL SUMMARY");
  console.log("==================================================================");
  console.log(`  Total Scanned : ${total}`);
  console.log(`  Indexed       : ${indexedCount}`);
  console.log(`  Skipped       : ${skippedCount}`);
  console.log(`  Skipped Empty : ${emptyCount}`);
  console.log(`  Failed        : ${failedCount}`);
  console.log("==================================================================\n");

  await db.$disconnect();

  if (failedCount > 0) {
    console.error(`Backfill finished with ${failedCount} failure(s).`);
    process.exitCode = 1;
  } else {
    console.log("✨ Backfill completed successfully.");
  }
}

runBackfill();
