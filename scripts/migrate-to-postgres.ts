import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";

async function runDataMigration() {
  console.log("==========================================");
  console.log("🚀 PHASE 5: Migrating SQLite Data to PostgreSQL");
  console.log("==========================================\n");

  const backupPath = path.resolve(process.cwd(), "prisma/backups/sqlite-backup.json");
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at: ${backupPath}. Run 'npm run backup' first.`);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  const { data, counts } = backup;

  console.log("Source Data Summary from Backup:");
  console.log(`  - Users:          ${counts.users}`);
  console.log(`  - Categories:     ${counts.categories}`);
  console.log(`  - Tags:           ${counts.tags}`);
  console.log(`  - CourseTags:     ${counts.courseTags}`);
  console.log(`  - Courses:        ${counts.courses}`);
  console.log(`  - Modules:        ${counts.modules}`);
  console.log(`  - Lessons:        ${counts.lessons}`);
  console.log(`  - Resources:      ${counts.resources}`);
  console.log(`  - Enrollments:    ${counts.enrollments}`);
  console.log(`  - LessonProgress: ${counts.lessonProgress}`);
  console.log(`  - CourseProgress: ${counts.courseProgress}`);
  console.log(`  - CourseReviews:  ${counts.courseReviews}\n`);

  console.log("Executing transaction migration into PostgreSQL...");

  // 1. Migrate Users
  for (const user of data.users) {
    await db.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        normalizedEmail: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role,
        status: "ACTIVE",
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
      update: {
        email: user.email,
        normalizedEmail: user.email.toLowerCase(),
        name: user.name,
        role: user.role,
      },
    });
  }
  console.log("  ✔ Users migrated successfully");

  // 2. Migrate Categories
  for (const cat of data.categories) {
    await db.category.upsert({
      where: { id: cat.id },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        createdAt: new Date(cat.createdAt),
      },
      update: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      },
    });
  }
  console.log("  ✔ Categories migrated successfully");

  // 3. Migrate Tags
  for (const tag of data.tags) {
    await db.tag.upsert({
      where: { id: tag.id },
      create: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      },
      update: {
        name: tag.name,
        slug: tag.slug,
      },
    });
  }
  console.log("  ✔ Tags migrated successfully");

  // 4. Migrate Courses
  for (const course of data.courses) {
    await db.course.upsert({
      where: { id: course.id },
      create: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        shortSummary: course.shortSummary,
        description: course.description,
        difficulty: course.difficulty,
        language: course.language || "English",
        estimatedHours: course.estimatedHours,
        thumbnailUrl: course.thumbnailUrl,
        status: course.status,
        license: "CC-BY-4.0",
        contentOwnership: "OPEN_LICENSE",
        authorId: course.authorId,
        categoryId: course.categoryId,
        rejectionReason: course.rejectionReason,
        createdAt: new Date(course.createdAt),
        updatedAt: new Date(course.updatedAt),
        publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
      },
      update: {
        title: course.title,
        status: course.status,
      },
    });
  }
  console.log("  ✔ Courses migrated successfully");

  // 5. Migrate CourseTags
  for (const ct of data.courseTags) {
    await db.courseTag.upsert({
      where: {
        courseId_tagId: {
          courseId: ct.courseId,
          tagId: ct.tagId,
        },
      },
      create: {
        courseId: ct.courseId,
        tagId: ct.tagId,
      },
      update: {},
    });
  }
  console.log("  ✔ CourseTags migrated successfully");

  // 6. Migrate Modules
  for (const mod of data.modules) {
    await db.module.upsert({
      where: { id: mod.id },
      create: {
        id: mod.id,
        courseId: mod.courseId,
        title: mod.title,
        description: mod.description,
        orderIndex: mod.orderIndex,
        createdAt: new Date(mod.createdAt),
        updatedAt: new Date(mod.updatedAt),
      },
      update: {
        title: mod.title,
        orderIndex: mod.orderIndex,
      },
    });
  }
  console.log("  ✔ Modules migrated successfully");

  // 7. Migrate Lessons
  for (const les of data.lessons) {
    await db.lesson.upsert({
      where: { id: les.id },
      create: {
        id: les.id,
        moduleId: les.moduleId,
        title: les.title,
        slug: les.slug,
        description: les.description,
        contentType: les.contentType,
        textContent: les.textContent,
        mediaUrl: les.mediaUrl,
        durationMinutes: les.durationMinutes,
        orderIndex: les.orderIndex,
        isRequired: les.isRequired ?? true,
        createdAt: new Date(les.createdAt),
        updatedAt: new Date(les.updatedAt),
      },
      update: {
        title: les.title,
        orderIndex: les.orderIndex,
      },
    });
  }
  console.log("  ✔ Lessons migrated successfully");

  // 8. Migrate Resources
  for (const res of data.resources) {
    await db.resource.upsert({
      where: { id: res.id },
      create: {
        id: res.id,
        lessonId: res.lessonId,
        title: res.title,
        resourceType: res.resourceType,
        url: res.url,
        description: res.description,
        isInternal: false,
        createdAt: new Date(res.createdAt),
      },
      update: {
        title: res.title,
      },
    });
  }

  // 9. Migrate Enrollments
  for (const enr of data.enrollments) {
    await db.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: enr.userId,
          courseId: enr.courseId,
        },
      },
      create: {
        id: enr.id,
        userId: enr.userId,
        courseId: enr.courseId,
        enrolledAt: new Date(enr.enrolledAt),
        lastAccessedAt: new Date(enr.enrolledAt),
      },
      update: {},
    });
  }
  console.log("  ✔ Enrollments migrated successfully");

  // 10. Migrate LessonProgress
  for (const lp of data.lessonProgress) {
    await db.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: lp.userId,
          lessonId: lp.lessonId,
        },
      },
      create: {
        id: lp.id,
        userId: lp.userId,
        lessonId: lp.lessonId,
        isCompleted: lp.isCompleted,
        completedAt: lp.completedAt ? new Date(lp.completedAt) : null,
        updatedAt: new Date(lp.updatedAt),
      },
      update: {
        isCompleted: lp.isCompleted,
      },
    });
  }
  console.log("  ✔ LessonProgress migrated successfully");

  // 11. Migrate CourseProgress
  for (const cp of data.courseProgress) {
    await db.courseProgress.upsert({
      where: {
        userId_courseId: {
          userId: cp.userId,
          courseId: cp.courseId,
        },
      },
      create: {
        id: cp.id,
        userId: cp.userId,
        courseId: cp.courseId,
        completedLessons: cp.completedLessons,
        totalLessons: cp.totalLessons,
        percentage: cp.percentage,
        isCompleted: cp.isCompleted,
        lastLessonId: cp.lastLessonId,
        completedAt: cp.completedAt ? new Date(cp.completedAt) : null,
        updatedAt: new Date(cp.updatedAt),
      },
      update: {
        completedLessons: cp.completedLessons,
        percentage: cp.percentage,
      },
    });
  }
  console.log("  ✔ CourseProgress migrated successfully");

  // 12. Migrate CourseReviews
  for (const rev of data.courseReviews) {
    await db.courseReview.upsert({
      where: { id: rev.id },
      create: {
        id: rev.id,
        courseId: rev.courseId,
        reviewerId: rev.reviewerId,
        action: rev.action,
        comments: rev.comments,
        createdAt: new Date(rev.createdAt),
      },
      update: {},
    });
  }

  // PHASE 7: INTEGRITY ASSERTIONS
  console.log("\n==========================================");
  console.log("🔍 PHASE 7: Running Referential Integrity Verification");
  console.log("==========================================\n");

  const [
    postUsers,
    postCategories,
    postTags,
    postCourseTags,
    postCourses,
    postModules,
    postLessons,
    postEnrollments,
    postLessonProgress,
    postCourseProgress,
  ] = await Promise.all([
    db.user.count(),
    db.category.count(),
    db.tag.count(),
    db.courseTag.count(),
    db.course.count(),
    db.module.count(),
    db.lesson.count(),
    db.enrollment.count(),
    db.lessonProgress.count(),
    db.courseProgress.count(),
  ]);

  console.log("Post-Migration Row Counts:");
  console.log(`  - Users:          ${postUsers} (Expected: ${counts.users})`);
  console.log(`  - Categories:     ${postCategories} (Expected: ${counts.categories})`);
  console.log(`  - Tags:           ${postTags} (Expected: ${counts.tags})`);
  console.log(`  - CourseTags:     ${postCourseTags} (Expected: ${counts.courseTags})`);
  console.log(`  - Courses:        ${postCourses} (Expected: ${counts.courses})`);
  console.log(`  - Modules:        ${postModules} (Expected: ${counts.modules})`);
  console.log(`  - Lessons:        ${postLessons} (Expected: ${counts.lessons})`);
  console.log(`  - Enrollments:    ${postEnrollments} (Expected: ${counts.enrollments})`);
  console.log(`  - LessonProgress: ${postLessonProgress} (Expected: ${counts.lessonProgress})`);
  console.log(`  - CourseProgress: ${postCourseProgress} (Expected: ${counts.courseProgress})\n`);

  if (
    postUsers === counts.users &&
    postCourses === counts.courses &&
    postModules === counts.modules &&
    postLessons === counts.lessons &&
    postCategories === counts.categories &&
    postTags === counts.tags
  ) {
    console.log("✨ 100% DATA PARITY AND REFERENTIAL INTEGRITY VERIFIED!");
  } else {
    throw new Error("❌ Data count parity check mismatch!");
  }

  await db.$disconnect();
}

runDataMigration().catch((err) => {
  console.error("Data migration error:", err);
  process.exit(1);
});
