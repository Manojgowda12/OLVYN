import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

async function verifyAll() {
  const prisma = new PrismaClient({ log: ["error"] });
  console.log("==================================================");
  console.log("📊 STEP 7: Data Parity Verification (SQLite vs PostgreSQL)");
  console.log("==================================================\n");

  const backupPath = path.resolve(process.cwd(), "prisma/backups/sqlite-backup.json");
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  const { counts: bCounts } = backup;

  const users = await prisma.user.count();
  const categories = await prisma.category.count();
  const tags = await prisma.tag.count();
  const courseTags = await prisma.courseTag.count();
  const courses = await prisma.course.count();
  const modules = await prisma.module.count();
  const lessons = await prisma.lesson.count();
  const resources = await prisma.resource.count();
  const enrollments = await prisma.enrollment.count();
  const lessonProgress = await prisma.lessonProgress.count();
  const courseProgress = await prisma.courseProgress.count();
  const savedCourses = await prisma.savedCourse.count();
  const courseReviews = await prisma.courseReview.count();
  const auditLogs = await prisma.auditLog.count();
  const contentReports = await prisma.contentReport.count();
  const aiConversations = await prisma.aIConversation.count();
  const aiMessages = await prisma.aIMessage.count();
  const fileAssets = await prisma.fileAsset.count();

  const parityTable = [
    { table: "User", before: bCounts.users ?? 0, after: users },
    { table: "Category", before: bCounts.categories ?? 0, after: categories },
    { table: "Tag", before: bCounts.tags ?? 0, after: tags },
    { table: "CourseTag", before: bCounts.courseTags ?? 0, after: courseTags },
    { table: "Course", before: bCounts.courses ?? 0, after: courses },
    { table: "Module", before: bCounts.modules ?? 0, after: modules },
    { table: "Lesson", before: bCounts.lessons ?? 0, after: lessons },
    { table: "Resource", before: bCounts.resources ?? 0, after: resources },
    { table: "Enrollment", before: bCounts.enrollments ?? 0, after: enrollments },
    { table: "LessonProgress", before: bCounts.lessonProgress ?? 0, after: lessonProgress },
    { table: "CourseProgress", before: bCounts.courseProgress ?? 0, after: courseProgress },
    { table: "SavedCourse", before: bCounts.savedCourses ?? 0, after: savedCourses },
    { table: "CourseReview", before: bCounts.courseReviews ?? 0, after: courseReviews },
    { table: "AuditLog", before: bCounts.auditLogs ?? 0, after: auditLogs },
    { table: "ContentReport", before: bCounts.contentReports ?? 0, after: contentReports },
    { table: "AIConversation", before: bCounts.aiConversations ?? 0, after: aiConversations },
    { table: "AIMessage", before: bCounts.aiMessages ?? 0, after: aiMessages },
    { table: "FileAsset", before: bCounts.fileAssets ?? 0, after: fileAssets },
  ];

  console.log("TABLE           | BEFORE (SQLite) | AFTER (PostgreSQL) | DIFFERENCE | STATUS");
  console.log("----------------|-----------------|--------------------|------------|-------");
  for (const row of parityTable) {
    const diff = row.after - row.before;
    const status = diff === 0 ? "✅ MATCH" : "⚠️ DIFF";
    console.log(
      `${row.table.padEnd(15)} | ${String(row.before).padStart(15)} | ${String(row.after).padStart(18)} | ${String(diff).padStart(10)} | ${status}`
    );
  }

  console.log("\n==================================================");
  console.log("🔗 STEP 8: Relationship & Orphan Integrity Check");
  console.log("==================================================\n");

  // 1. Course -> Author
  const allCourses = await prisma.course.findMany({ select: { id: true, authorId: true, categoryId: true } });
  const allUserIds = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));
  const orphanCourseAuthor = allCourses.filter((c) => !allUserIds.has(c.authorId));
  console.log(`- Course -> Author:               ${orphanCourseAuthor.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanCourseAuthor.length} orphaned`}`);

  // 2. Course -> Category (Optional FK)
  const allCatIds = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));
  const orphanCourseCat = allCourses.filter((c) => c.categoryId && !allCatIds.has(c.categoryId));
  console.log(`- Course -> Category:             ${orphanCourseCat.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanCourseCat.length} orphaned`}`);

  // 3. CourseTag -> Course & Tag
  const allCourseTags = await prisma.courseTag.findMany();
  const allCourseIds = new Set(allCourses.map((c) => c.id));
  const allTagIds = new Set((await prisma.tag.findMany({ select: { id: true } })).map((t) => t.id));
  const orphanCourseTags = allCourseTags.filter((ct) => !allCourseIds.has(ct.courseId) || !allTagIds.has(ct.tagId));
  console.log(`- Course <-> Tag join table:      ${orphanCourseTags.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanCourseTags.length} orphaned`}`);

  // 4. Module -> Course
  const allModules = await prisma.module.findMany({ select: { id: true, courseId: true } });
  const orphanModules = allModules.filter((m) => !allCourseIds.has(m.courseId));
  console.log(`- Module -> Course:               ${orphanModules.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanModules.length} orphaned`}`);

  // 5. Lesson -> Module
  const allModuleIds = new Set(allModules.map((m) => m.id));
  const allLessons = await prisma.lesson.findMany({ select: { id: true, moduleId: true } });
  const orphanLessons = allLessons.filter((l) => !allModuleIds.has(l.moduleId));
  console.log(`- Lesson -> Module:               ${orphanLessons.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanLessons.length} orphaned`}`);

  // 6. Resource -> Lesson
  const allLessonIds = new Set(allLessons.map((l) => l.id));
  const allResources = await prisma.resource.findMany({ select: { id: true, lessonId: true } });
  const orphanResources = allResources.filter((r) => !allLessonIds.has(r.lessonId));
  console.log(`- Resource -> Lesson:             ${orphanResources.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanResources.length} orphaned`}`);

  // 7. Enrollment -> User & Course
  const allEnrollments = await prisma.enrollment.findMany({ select: { id: true, userId: true, courseId: true } });
  const orphanEnrollments = allEnrollments.filter((e) => !allUserIds.has(e.userId) || !allCourseIds.has(e.courseId));
  console.log(`- Enrollment (User & Course):     ${orphanEnrollments.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanEnrollments.length} orphaned`}`);

  // 8. LessonProgress -> User & Lesson
  const allLessonProgress = await prisma.lessonProgress.findMany({ select: { id: true, userId: true, lessonId: true } });
  const orphanLessonProgress = allLessonProgress.filter((lp) => !allUserIds.has(lp.userId) || !allLessonIds.has(lp.lessonId));
  console.log(`- LessonProgress (User & Lesson): ${orphanLessonProgress.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanLessonProgress.length} orphaned`}`);

  // 9. CourseProgress -> User & Course
  const allCourseProgress = await prisma.courseProgress.findMany({ select: { id: true, userId: true, courseId: true } });
  const orphanCourseProgress = allCourseProgress.filter((cp) => !allUserIds.has(cp.userId) || !allCourseIds.has(cp.courseId));
  console.log(`- CourseProgress (User & Course): ${orphanCourseProgress.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanCourseProgress.length} orphaned`}`);

  // 10. AI Conversation -> Messages
  const allAIConversations = await prisma.aIConversation.findMany({ select: { id: true } });
  const allConvIds = new Set(allAIConversations.map((c) => c.id));
  const allAIMessages = await prisma.aIMessage.findMany({ select: { id: true, conversationId: true } });
  const orphanAIMessages = allAIMessages.filter((m) => !allConvIds.has(m.conversationId));
  console.log(`- AIConversation -> AIMessage:    ${orphanAIMessages.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanAIMessages.length} orphaned`}`);

  // 11. FileAsset -> User
  const allFiles = await prisma.fileAsset.findMany({ select: { id: true, uploaderId: true } });
  const orphanFiles = allFiles.filter((f) => f.uploaderId && !allUserIds.has(f.uploaderId));
  console.log(`- FileAsset -> User:              ${orphanFiles.length === 0 ? "✅ OK (0 orphaned)" : `❌ ${orphanFiles.length} orphaned`}`);

  await prisma.$disconnect();
}

verifyAll();
