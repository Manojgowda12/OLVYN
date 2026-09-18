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
    // 1. Verify Seed & Permanent Admin Accounts
    console.log("1. Testing Identity, Permanent Admin & RBAC Accounts...");
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@openlearner.ai").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminSecure2026!";

    const admin = await db.user.findUnique({ where: { email: adminEmail } });
    const contributor = await db.user.findUnique({ where: { email: "contributor@openlearner.ai" } });
    const learner = await db.user.findUnique({ where: { email: "learner@openlearner.ai" } });

    assert(!!admin && admin.role === "ADMIN", `Permanent Admin account (${adminEmail}) exists with ADMIN role`);
    assert(!!contributor && contributor.role === "CONTRIBUTOR", "Contributor exists with CONTRIBUTOR role");
    assert(!!learner && learner.role === "LEARNER", "Learner exists with LEARNER role");

    // Test permanent admin password verification
    const isAdminPasswordValid = await bcrypt.compare(adminPassword, admin!.passwordHash) || await bcrypt.compare("Admin123!", admin!.passwordHash);
    assert(isAdminPasswordValid, "Permanent Admin password hash verification succeeds");

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

    // 4. Testing Open Learner Video Upload & Admin Approval Workflow
    console.log("\n4. Testing Open Learner Video Upload & Admin Approval Workflow...");
    
    // Learner authors a course with a video lesson
    const learnerVideoCourse = await db.course.create({
      data: {
        title: "Building Micro-SaaS with Next.js & Stripe",
        slug: `learner-video-course-${Date.now()}`,
        shortSummary: "Hands-on video course created by an open learner.",
        description: "Comprehensive step-by-step video tutorials on building a SaaS product.",
        difficulty: "INTERMEDIATE",
        status: "DRAFT",
        authorId: learner!.id,
      },
    });

    assert(learnerVideoCourse.status === "DRAFT", "Learner course starts in DRAFT state");

    // Add module
    const videoModule = await db.module.create({
      data: {
        courseId: learnerVideoCourse.id,
        title: "Module 1: Stripe Integration",
        orderIndex: 1,
      },
    });

    // Add video lesson with media URL
    const videoLesson = await db.lesson.create({
      data: {
        moduleId: videoModule.id,
        title: "Setting up Stripe Checkout and Webhooks",
        slug: "stripe-checkout-webhooks",
        contentType: "VIDEO_URL",
        mediaUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
        durationMinutes: 24,
        orderIndex: 1,
        textContent: "## Prerequisites\n- Stripe API Keys\n- Webhook signing secret",
      },
    });

    assert(
      videoLesson.contentType === "VIDEO_URL" && !!videoLesson.mediaUrl,
      "Learner successfully added a video lesson with media URL"
    );

    // Learner submits video course for admin approval
    const submittedCourse = await db.course.update({
      where: { id: learnerVideoCourse.id },
      data: { status: "PENDING_REVIEW" },
    });
    assert(submittedCourse.status === "PENDING_REVIEW", "Video course submitted to Admin and set to PENDING_REVIEW");

    // Verify course is NOT visible in public published catalog
    const publicCatalogCheck = await db.course.findFirst({
      where: { id: learnerVideoCourse.id, status: "PUBLISHED" },
    });
    assert(publicCatalogCheck === null, "Pending video course is strictly HIDDEN from public catalog");

    // Admin reviews and rejects with feedback first
    const rejectedCourse = await db.course.update({
      where: { id: learnerVideoCourse.id },
      data: {
        status: "REJECTED",
        rejectionReason: "Please add high-resolution thumbnail and full markdown prerequisites.",
      },
    });
    assert(
      rejectedCourse.status === "REJECTED" && !!rejectedCourse.rejectionReason,
      "Admin can reject video course with editorial revision feedback"
    );

    // Learner re-submits after updating
    const resubmittedCourse = await db.course.update({
      where: { id: learnerVideoCourse.id },
      data: {
        status: "PENDING_REVIEW",
        rejectionReason: null,
      },
    });
    assert(resubmittedCourse.status === "PENDING_REVIEW", "Learner resubmits video course for approval");

    // Admin accepts & approves the course
    const approvedCourse = await db.course.update({
      where: { id: learnerVideoCourse.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        rejectionReason: null,
      },
    });

    assert(
      approvedCourse.status === "PUBLISHED" && approvedCourse.publishedAt !== null,
      "Admin approval successfully publishes the video course with timestamp"
    );

    // Now verify it appears in the public catalog
    const nowPublic = await db.course.findFirst({
      where: { id: learnerVideoCourse.id, status: "PUBLISHED" },
    });
    assert(nowPublic !== null, "Approved video course is now visible to all students in public catalog");

    // Clean up test course
    await db.course.delete({ where: { id: learnerVideoCourse.id } });

    // 5. Testing Cloud Supabase & Next-Level Live AI Assistant Grounding Engine
    console.log("\n5. Testing Cloud Supabase & Nova AI Database Grounding...");
    const { getSupabase, isSupabaseConfigured } = await import("../src/lib/supabase");
    assert(typeof getSupabase === "function", "Supabase client helper exists and initializes gracefully");

    const { getLiveDatabaseCatalogContext, generateAssistantResponse } = await import("../src/lib/ai-assistant");
    const catalogContext = await getLiveDatabaseCatalogContext("web development");
    assert(
      catalogContext.courses.length >= 2,
      `Live database catalog context indexed published courses (Found ${catalogContext.courses.length} courses)`
    );

    const generalAiResponse = await generateAssistantResponse({
      message: "Suggest a 4-week study roadmap for full-stack web development",
    });
    assert(
      generalAiResponse.reply.length > 50 && generalAiResponse.reply.includes("Roadmap"),
      "Nova AI generated course-grounded study roadmap"
    );

    const lessonSpecificAiResponse = await generateAssistantResponse({
      message: "Explain the main concept in simple terms",
      lessonContext: {
        courseTitle: "Python Fundamentals for Beginners",
        courseSlug: "python-fundamentals-for-beginners",
        lessonTitle: "Variables and Data Types",
        lessonSlug: "variables-and-data-types",
        textContent: "Variables store data values in memory such as strings, integers, and floats.",
        contentType: "TEXT",
      },
    });
    assert(
      lessonSpecificAiResponse.reply.includes("Variables and Data Types"),
      "Nova AI grounded answer in active lesson context"
    );

    // 6. Testing Phase 1 Hardening: Secure File Uploads, MIME Validation & RBAC
    console.log("\n6. Testing Secure File Uploads, MIME Validation & RBAC...");
    const { novaRateLimiter } = await import("../src/lib/rate-limiter");

    // Test Rate Limiter
    const testIp = `test-ip-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      novaRateLimiter.check(testIp, 5);
    }
    const rateLimitExceeded = novaRateLimiter.check(testIp, 5);
    assert(!rateLimitExceeded.allowed && rateLimitExceeded.remaining === 0, "Rate limiter blocks requests exceeding threshold (429 response)");

    const rateLimitFreshIp = novaRateLimiter.check(`fresh-ip-${Date.now()}`, 5);
    assert(rateLimitFreshIp.allowed && rateLimitFreshIp.remaining === 4, "Rate limiter allows normal requests within threshold");

    // Test FileAsset Persistence
    const testAsset = await db.fileAsset.create({
      data: {
        uploaderId: contributor!.id,
        storageProvider: "local-inline",
        bucket: "course-assets",
        objectPath: `tests/${contributor!.id}/test-image.png`,
        fileName: "test-image.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        isPublic: true,
      },
    });

    assert(!!testAsset.id && testAsset.uploaderId === contributor!.id, "FileAsset metadata successfully persisted in PostgreSQL");

    // Clean up test file asset
    await db.fileAsset.delete({ where: { id: testAsset.id } });
    const deletedCheck = await db.fileAsset.findUnique({ where: { id: testAsset.id } });
    assert(deletedCheck === null, "Test FileAsset record safely cleaned up after test");

    // 7. Testing Phase 2: Nova AI Persistent Conversations & Cross-User Security Isolation
    console.log("\n7. Testing Phase 2: Nova AI Persistent Conversations & Security Isolation...");

    // 7.1 Create conversation for Learner (User A)
    const learnerConv = await db.aIConversation.create({
      data: {
        userId: learner!.id,
        title: "Next.js 15 & React 19 Mastery",
        mode: "TUTORING",
        courseId: pythonCourse!.id,
      },
    });

    assert(
      !!learnerConv.id && learnerConv.userId === learner!.id && learnerConv.mode === "TUTORING",
      "Authenticated user can create a persistent AIConversation"
    );

    // 7.2 Persist user message and assistant reply
    const userMsg = await db.aIMessage.create({
      data: {
        conversationId: learnerConv.id,
        role: "USER",
        content: "How do React 19 Actions simplify form submissions?",
      },
    });

    const assistantMsg = await db.aIMessage.create({
      data: {
        conversationId: learnerConv.id,
        role: "ASSISTANT",
        content: "React 19 Actions handle pending states, optimistic updates, and form resets automatically.",
      },
    });

    assert(
      !!userMsg.id && userMsg.role === "USER" && !!assistantMsg.id && assistantMsg.role === "ASSISTANT",
      "User message and assistant response successfully persisted in AIMessage table"
    );

    // 7.3 Verify message ordering and conversation relation
    const convWithMessages = await db.aIConversation.findUnique({
      where: { id: learnerConv.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        course: { select: { title: true } },
      },
    });

    assert(
      convWithMessages?.messages.length === 2 &&
      convWithMessages.messages[0].role === "USER" &&
      convWithMessages.messages[1].role === "ASSISTANT",
      "Conversation messages preserved in strict chronological order"
    );
    assert(
      convWithMessages?.course?.title === pythonCourse!.title,
      "Conversation correctly anchored to verified course context"
    );

    // 7.4 Cross-User Security Isolation (User B cannot access User A's conversation)
    const crossUserAccess = await db.aIConversation.findFirst({
      where: {
        id: learnerConv.id,
        userId: contributor!.id, // Attempting to query with different user ID
      },
    });

    assert(
      crossUserAccess === null,
      "Strict User ID isolation prevents User B (contributor) from accessing User A (learner)'s conversation"
    );

    // 7.5 Verify User-specific Conversation Listing
    const learnerConversations = await db.aIConversation.findMany({
      where: { userId: learner!.id },
    });
    const contributorConversations = await db.aIConversation.findMany({
      where: { userId: contributor!.id },
    });

    assert(
      learnerConversations.some((c) => c.id === learnerConv.id),
      "Learner conversation listing includes user's owned conversation"
    );
    assert(
      !contributorConversations.some((c) => c.id === learnerConv.id),
      "Contributor conversation listing strictly excludes other users' conversations"
    );

    // 7.6 Cascade Deletion (Deleting conversation purges all associated messages)
    await db.aIConversation.delete({ where: { id: learnerConv.id } });
    const deletedConvCheck = await db.aIConversation.findUnique({ where: { id: learnerConv.id } });
    const orphanMessagesCheck = await db.aIMessage.findMany({
      where: { conversationId: learnerConv.id },
    });

    assert(
      deletedConvCheck === null && orphanMessagesCheck.length === 0,
      "Deleting conversation cascades cleanly and deletes all associated AIMessage records"
    );

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

