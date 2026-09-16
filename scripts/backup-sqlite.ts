import { db } from "../src/lib/db";
import fs from "fs";
import path from "path";

async function runBackup() {
  console.log("==========================================");
  console.log("📦 PHASE 1: Exporting SQLite Pre-Migration Data");
  console.log("==========================================\n");

  const [
    users,
    categories,
    tags,
    courseTags,
    courses,
    modules,
    lessons,
    resources,
    enrollments,
    lessonProgress,
    courseProgress,
    courseReviews,
  ] = await Promise.all([
    db.user.findMany(),
    db.category.findMany(),
    db.tag.findMany(),
    db.courseTag.findMany(),
    db.course.findMany(),
    db.module.findMany(),
    db.lesson.findMany(),
    db.resource.findMany(),
    db.enrollment.findMany(),
    db.lessonProgress.findMany(),
    db.courseProgress.findMany(),
    db.courseReview.findMany(),
  ]);

  const backupData = {
    exportedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      categories: categories.length,
      tags: tags.length,
      courseTags: courseTags.length,
      courses: courses.length,
      modules: modules.length,
      lessons: lessons.length,
      resources: resources.length,
      enrollments: enrollments.length,
      lessonProgress: lessonProgress.length,
      courseProgress: courseProgress.length,
      courseReviews: courseReviews.length,
    },
    data: {
      users,
      categories,
      tags,
      courseTags,
      courses,
      modules,
      lessons,
      resources,
      enrollments,
      lessonProgress,
      courseProgress,
      courseReviews,
    },
  };

  const backupDir = path.resolve(process.cwd(), "prisma/backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, "sqlite-backup.json");
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), "utf-8");

  console.log(`✅ Backup successfully saved to: ${backupFile}\n`);
  console.log("Record Baseline Counts:");
  for (const [key, count] of Object.entries(backupData.counts)) {
    console.log(`  - ${key.padEnd(16)}: ${count}`);
  }

  // Verification
  console.log("\nVerifying backup file readability...");
  const readBack = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
  if (readBack.counts.users === users.length && readBack.counts.courses === courses.length) {
    console.log("✅ Backup file verified and intact!");
  } else {
    throw new Error("❌ Backup verification failed!");
  }

  await db.$disconnect();
}

runBackup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
