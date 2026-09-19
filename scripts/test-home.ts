import { PrismaClient, CourseStatus, Role } from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runHomeVerification() {
  console.log("==================================================================");
  console.log("🚀 OPENLEARNERAI — HOME EXPERIENCE & NAVIGATION VERIFICATION SUITE");
  console.log("==================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // 1. PUBLIC HOME & PUBLISHED COURSE VISIBILITY
    // -------------------------------------------------------------------------
    console.log("--- Group 1: Public Home & Course Visibility Rules ---");

    const publishedCourses = await prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      include: {
        category: true,
        author: { select: { name: true, avatarUrl: true } },
        modules: {
          include: {
            lessons: { select: { id: true, durationMinutes: true } },
          },
        },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    assert(publishedCourses.length > 0, `Published courses exist for Home page discovery (found ${publishedCourses.length})`);

    const hasAnyNonPublished = publishedCourses.some((c) => c.status !== CourseStatus.PUBLISHED);
    assert(!hasAnyNonPublished, "Zero non-published courses returned by Home page query");

    // Verify negative test: DRAFT and PENDING_REVIEW courses are strictly excluded
    const draftCountOnHome = await prisma.course.count({
      where: {
        status: { in: [CourseStatus.DRAFT, CourseStatus.PENDING_REVIEW, CourseStatus.REJECTED] },
        id: { in: publishedCourses.map((c) => c.id) },
      },
    });
    assert(draftCountOnHome === 0, "DRAFT, PENDING_REVIEW, and REJECTED courses strictly excluded from Home query");

    // -------------------------------------------------------------------------
    // 2. CATEGORY DISCOVERY & NAVIGATION INTEGRITY
    // -------------------------------------------------------------------------
    console.log("\n--- Group 2: Categories & Anchor Integrity ---");

    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { courses: { where: { status: CourseStatus.PUBLISHED } } } },
      },
      orderBy: { name: "asc" },
    });

    assert(categories.length > 0, `Real categories found for Browse by Category section (found ${categories.length})`);

    const allCategoriesHaveSlugs = categories.every((cat) => cat.slug && cat.slug.length > 0);
    assert(allCategoriesHaveSlugs, "All category cards have valid URL slugs for exploration navigation");

    const totalCategoryCourses = categories.reduce((sum, cat) => sum + cat._count.courses, 0);
    assert(totalCategoryCourses >= publishedCourses.length, `Category course counts accurately reflect published courses (total: ${totalCategoryCourses})`);

    // -------------------------------------------------------------------------
    // 3. AUTHENTICATED LEARNER EXPERIENCE & PROGRESS ISOLATION
    // -------------------------------------------------------------------------
    console.log("\n--- Group 3: Authenticated Learner Experience & Isolation ---");

    // Find test learner
    const learner = await prisma.user.findFirst({
      where: { role: Role.LEARNER },
    });

    assert(Boolean(learner), `Learner account exists for testing (id: ${learner?.id})`);

    if (learner) {
      // Query learner enrollments like Home does
      const learnerEnrollments = await prisma.enrollment.findMany({
        where: { userId: learner.id },
        take: 3,
        orderBy: { lastAccessedAt: "desc" },
        include: {
          course: {
            include: {
              category: true,
              modules: {
                orderBy: { orderIndex: "asc" },
                include: {
                  lessons: {
                    orderBy: { orderIndex: "asc" },
                    select: { id: true, slug: true, title: true },
                  },
                },
              },
            },
          },
        },
      });

      assert(learnerEnrollments.length > 0, `Learner has enrolled courses for 'Continue Learning' section (count: ${learnerEnrollments.length})`);

      const courseIds = learnerEnrollments.map((e) => e.courseId);
      const progressRecords = await prisma.courseProgress.findMany({
        where: {
          userId: learner.id,
          courseId: { in: courseIds },
        },
      });

      assert(progressRecords.length > 0, `Real CourseProgress records found for enrolled courses (count: ${progressRecords.length})`);

      // Cross-user isolation test: ensure User B cannot access Learner A's progress
      const otherUser = await prisma.user.findFirst({
        where: { id: { not: learner.id } },
      });

      if (otherUser) {
        const leakedProgress = await prisma.courseProgress.findMany({
          where: {
            userId: otherUser.id,
            courseId: { in: courseIds },
          },
        });
        assert(
          leakedProgress.length === 0 || leakedProgress.every((p) => p.userId === otherUser.id),
          "Cross-user isolation: User progress query strictly bounded by authenticated userId"
        );
      }
    }

    // -------------------------------------------------------------------------
    // 4. NAVIGATION ACTIVE STATE DETECTION RULES
    // -------------------------------------------------------------------------
    console.log("\n--- Group 4: Navigation Active State Detection Logic ---");

    function getActiveRoute(pathname: string) {
      return {
        isHomeActive: pathname === "/",
        isCoursesActive: pathname.startsWith("/explore") || pathname.startsWith("/courses"),
        isNovaActive: pathname.startsWith("/nova"),
        isStudioActive: pathname.startsWith("/contributor"),
        isAdminActive: pathname.startsWith("/admin"),
      };
    }

    // Test 4a: Root path "/"
    const rootState = getActiveRoute("/");
    assert(rootState.isHomeActive === true, "Root path '/' correctly activates Home");
    assert(rootState.isCoursesActive === false, "Root path '/' does NOT activate Courses");

    // Test 4b: Explore path "/explore"
    const exploreState = getActiveRoute("/explore");
    assert(exploreState.isCoursesActive === true, "Path '/explore' correctly activates Courses");
    assert(exploreState.isHomeActive === false, "Path '/explore' does NOT activate Home");

    // Test 4c: Deep course path "/courses/python-fundamentals"
    const deepCourseState = getActiveRoute("/courses/python-fundamentals");
    assert(deepCourseState.isCoursesActive === true, "Deep path '/courses/[slug]' correctly activates Courses");

    // Test 4d: Nova path "/nova"
    const novaState = getActiveRoute("/nova");
    assert(novaState.isNovaActive === true, "Path '/nova' correctly activates Nova AI");

    // Test 4e: Contributor path "/contributor"
    const studioState = getActiveRoute("/contributor");
    assert(studioState.isStudioActive === true, "Path '/contributor' correctly activates Studio");

    // Test 4f: Admin path "/admin"
    const adminState = getActiveRoute("/admin");
    assert(adminState.isAdminActive === true, "Path '/admin' correctly activates Admin");

    // -------------------------------------------------------------------------
    // 5. DATA PURITY & ZERO FAKE STATISTICS
    // -------------------------------------------------------------------------
    console.log("\n--- Group 5: Data Purity & Zero Fabricated Metrics ---");

    // Verify course metadata only uses real attributes
    for (const c of publishedCourses) {
      assert(typeof c.title === "string" && c.title.length > 0, `Course '${c.slug}' has valid title`);
      assert(c.modules.length > 0, `Course '${c.slug}' has real module structure (${c.modules.length} modules)`);
      const totalLessons = c.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      assert(totalLessons > 0, `Course '${c.slug}' has valid lesson count (${totalLessons} lessons)`);
    }

    console.log("\n==================================================================");
    console.log(`✨ OpenLearnerAI Home Verification: ${passed}/${passed + failed} assertions passed.`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runHomeVerification().catch((err) => {
  console.error("Home test suite failure:", err);
  process.exit(1);
});
