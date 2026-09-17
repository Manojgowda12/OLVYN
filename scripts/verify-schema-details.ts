import { PrismaClient } from "@prisma/client";

async function verifySchema() {
  const prisma = new PrismaClient({ log: ["error"] });
  console.log("==================================================");
  console.log("🔍 STEP 4 & 5: PostgreSQL Schema & Table Verification");
  console.log("==================================================\n");

  try {
    // 1. Verify PostgreSQL Tables
    const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
      ORDER BY table_name;
    `;
    const tableNames = tables.map((t) => t.table_name);
    console.log(`Found ${tableNames.length} Public Application Tables:`);
    tableNames.forEach((name) => console.log(`  - public."${name}"`));

    // 2. Verify PostgreSQL ENUM Types
    const enums: Array<{ typname: string }> = await prisma.$queryRaw`
      SELECT typname 
      FROM pg_type 
      JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace 
      WHERE pg_namespace.nspname = 'public' 
        AND typtype = 'e'
      ORDER BY typname;
    `;
    console.log(`\nFound ${enums.length} PostgreSQL Native Enum Types:`);
    enums.forEach((e) => console.log(`  - enum "${e.typname}"`));

    // 3. Verify Foreign Key Constraints & Cascades
    const fks: Array<{ constraint_name: string; table_name: string; delete_rule: string }> = await prisma.$queryRaw`
      SELECT rc.constraint_name, kcu.table_name, rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu 
        ON rc.constraint_name = kcu.constraint_name
      GROUP BY rc.constraint_name, kcu.table_name, rc.delete_rule
      ORDER BY kcu.table_name;
    `;
    console.log(`\nVerified ${fks.length} Foreign Key Referential Rules:`);
    fks.slice(0, 10).forEach((fk) => console.log(`  - ${fk.table_name}: ${fk.constraint_name} (${fk.delete_rule})`));
    if (fks.length > 10) console.log(`  ... and ${fks.length - 10} more foreign key constraints.`);

    // 4. Step 5 — Verify Initial Table Row Counts
    console.log("\n==================================================");
    console.log("📊 STEP 5: Initial Database Table Counts");
    console.log("==================================================");

    const counts = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.courseTag.count(),
      prisma.course.count(),
      prisma.module.count(),
      prisma.lesson.count(),
      prisma.resource.count(),
      prisma.enrollment.count(),
      prisma.lessonProgress.count(),
      prisma.courseProgress.count(),
      prisma.savedCourse.count(),
      prisma.courseReview.count(),
      prisma.auditLog.count(),
      prisma.contentReport.count(),
      prisma.aIConversation.count(),
      prisma.aIMessage.count(),
      prisma.fileAsset.count(),
    ]);

    const modelNames = [
      "User", "Category", "Tag", "CourseTag", "Course", "Module", 
      "Lesson", "Resource", "Enrollment", "LessonProgress", "CourseProgress", 
      "SavedCourse", "CourseReview", "AuditLog", "ContentReport", 
      "AIConversation", "AIMessage", "FileAsset"
    ];

    modelNames.forEach((name, idx) => {
      console.log(`  ${name.padEnd(16)}: ${counts[idx]} rows`);
    });

    await prisma.$disconnect();
  } catch (err: any) {
    console.error("Schema verification error:", err.message || err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifySchema();
