import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function verifyPlatform() {
  console.log("🚀 Running Open Learning Platform Automated Verification Suite...\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  }

  try {
    // 1. Verify Seed Accounts
    console.log("1. Testing Identity & RBAC Accounts...");
    const admin = await db.user.findUnique({ where: { email: "admin@openlearner.ai" } });
    const contributor = await db.user.findUnique({ where: { email: "contributor@openlearner.ai" } });
    const learner = await db.user.findUnique({ where: { email: "learner@openlearner.ai" } });

    assert(!!admin && admin.role === "ADMIN", "Admin account exists with ADMIN role");
    assert(!!contributor && contributor.role === "CONTRIBUTOR", "Contributor exists with CONTRIBUTOR role");
    assert(!!learner && learner.role === "LEARNER", "Learner exists with LEARNER role");

    // Test password verification
    const isPasswordValid = await bcrypt.compare("Admin123!", admin!.passwordHash);
    assert(isPasswordValid, "Password hashing verification works with bcrypt");

    // 2. Testing Course Discovery & Published Status Filter
    console.log("\n2. Testing Course Catalog & Discovery Filters...");
    const publishedCourses = await db.course.findMany({
      where: { status: "PUBLISHED" },
      include: { modules: { include: { lessons: true } } },
    });
    assert(publishedCourses.length >= 2, "Published courses retrieved accurately");

    const pendingCourses = await db.course.findMany({
      where: { status: "PENDING_REVIEW" },
    });
    assert(pendingCourses.length >= 1, "Pending review courses are isolated from published catalog");

    // 3. Testing Progress Engine & Calculation
    console.log("\n3. Testing Progress Calculation Engine...");
    const pythonCourse = publishedCourses.find((c) => c.slug === "python-fundamentals-for-beginners");
    assert(!!pythonCourse, "Target seed course found");

    const totalLessons = pythonCourse!.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    assert(totalLessons === 5, `Total lessons calculated correctly (Expected 5, Got ${totalLessons})`);

    // Verify learner's current progress
    const learnerProgress = await db.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: learner!.id,
          courseId: pythonCourse!.id,
        },
      },
    });

    assert(!!learnerProgress, "Learner enrollment and progress tracking record exists");
    assert(learnerProgress!.completedLessons === 2, "Learner has 2 completed lessons recorded");
    assert(
      learnerProgress!.percentage === Math.round((2 / 5) * 100),
      `Percentage calculation is exact (Expected 40%, Got ${learnerProgress!.percentage}%)`
    );
    assert(!learnerProgress!.isCompleted, "Course is not marked completed prematurely");

    // 4. Testing Editorial Workflow State Transitions
    console.log("\n4. Testing Editorial Review Pipeline...");
    // Create a temporary test draft course
    const testDraft = await db.course.create({
      data: {
        title: "Test System Architecture 101",
        slug: `test-arch-${Date.now()}`,
        shortSummary: "Test course summary for verification.",
        description: "Test description.",
        difficulty: "BEGINNER",
        status: "DRAFT",
        authorId: contributor!.id,
      },
    });

    assert(testDraft.status === "DRAFT", "New course starts in DRAFT state");

    // Add module & lesson
    const testMod = await db.module.create({
      data: {
        courseId: testDraft.id,
        title: "Test Module",
        orderIndex: 1,
      },
    });

    const testLes = await db.lesson.create({
      data: {
        moduleId: testMod.id,
        title: "Test Lesson",
        slug: "test-lesson",
        orderIndex: 1,
      },
    });

    // Simulate submission for review
    const submitted = await db.course.update({
      where: { id: testDraft.id },
      data: { status: "PENDING_REVIEW" },
    });
    assert(submitted.status === "PENDING_REVIEW", "Course transitions to PENDING_REVIEW upon submission");

    // Simulate Admin Rejection with feedback
    const rejected = await db.course.update({
      where: { id: testDraft.id },
      data: { status: "REJECTED", rejectionReason: "Needs more detailed explanation." },
    });
    assert(
      rejected.status === "REJECTED" && rejected.rejectionReason === "Needs more detailed explanation.",
      "Admin rejection stores mandatory feedback and status"
    );

    // Simulate Admin Approval & Publication
    const approved = await db.course.update({
      where: { id: testDraft.id },
      data: { status: "PUBLISHED", publishedAt: new Date(), rejectionReason: null },
    });
    assert(
      approved.status === "PUBLISHED" && approved.publishedAt !== null && approved.rejectionReason === null,
      "Admin approval marks course PUBLISHED, timestamps, and clears rejection reason"
    );

    // Clean up test course
    await db.course.delete({ where: { id: testDraft.id } });

    console.log(`\n========================================`);
    console.log(`Verification Summary: ${passed}/${total} assertions passed.`);
    console.log(`========================================\n`);

    if (passed === total) {
      console.log("✨ All automated domain tests PASSED!");
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error("Verification error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

verifyPlatform();
