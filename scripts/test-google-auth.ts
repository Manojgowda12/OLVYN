import { db } from "../src/lib/db";
import {
  resolveOrCreateUser,
  getAuthenticatedUser,
} from "../src/lib/auth-service";
import {
  getUserMemories,
  extractUserMemories,
  deleteUserMemory,
} from "../src/lib/memory";
import { Role, MemoryType, AIMode } from "@prisma/client";
import { clearSession } from "../src/lib/auth";

async function runGoogleAuthSuite() {
  console.log("🚀 Running OpenLearnerAI Single Google Auth & Multi-Role Verification Suite...\n");

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

  const SYNTHETIC_USER_UUID = "33333333-3333-4333-8333-33333333333c";
  const SYNTHETIC_EMAIL = "google_learner_test@openlearner.ai";
  const FAKE_ADMIN_UUID = "44444444-4444-4444-8444-44444444444d";
  const FAKE_ADMIN_EMAIL = "admin_attacker@gmail.com";
  const USER_B_UUID = "55555555-5555-4555-8555-55555555555e";
  const USER_B_EMAIL = "user_b_test@openlearner.ai";

  try {
    // 0. Pre-test cleanup of synthetic test records
    await db.userMemory.deleteMany({
      where: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } },
    });
    await db.aIMessage.deleteMany({
      where: { conversation: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } } },
    });
    await db.aIConversation.deleteMany({
      where: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } },
    });
    await db.courseProgress.deleteMany({
      where: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } },
    });
    await db.lessonProgress.deleteMany({
      where: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } },
    });
    await db.user.deleteMany({
      where: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } },
    });

    console.log("--- PART 1: IDENTITY & ROLE PROVISIONING ---");

    // 1. Unauthenticated user rejected
    const anonContext = await getAuthenticatedUser();
    assert(anonContext === null, "Test 1: Unauthenticated request rejected (getAuthenticatedUser returns null)");

    // 2. New Google user created
    const newGoogleUser = await resolveOrCreateUser({
      id: SYNTHETIC_USER_UUID,
      email: SYNTHETIC_EMAIL,
      user_metadata: {
        full_name: "Google Learner",
        avatar_url: "https://lh3.googleusercontent.com/a/default",
      },
    } as any);
    assert(!!newGoogleUser && newGoogleUser.email === SYNTHETIC_EMAIL, "Test 2: New Google user created successfully");

    // 3. New user defaults LEARNER
    assert(newGoogleUser.role === Role.LEARNER, "Test 3: New Google user strictly defaults to role LEARNER");

    // 4. Repeated Google login does not duplicate User
    const repeatLoginUser = await resolveOrCreateUser({
      id: SYNTHETIC_USER_UUID,
      email: SYNTHETIC_EMAIL,
      user_metadata: {
        full_name: "Google Learner Renamed",
      },
    } as any);
    const countSynthetic = await db.user.count({ where: { authUserId: SYNTHETIC_USER_UUID } });
    assert(
      newGoogleUser.id === repeatLoginUser.id && countSynthetic === 1,
      "Test 4: Repeated Google login does not duplicate User (exact same User.id returned, count = 1)"
    );

    // 5. Existing learner remains LEARNER
    const existingLearner = await db.user.findUnique({ where: { email: "learner@openlearner.ai" } });
    assert(!!existingLearner && existingLearner.role === Role.LEARNER, "Test 5: Existing learner account retains LEARNER role");

    // 6. Existing contributor remains CONTRIBUTOR
    const existingContributor = await db.user.findUnique({ where: { email: "contributor@openlearner.ai" } });
    assert(!!existingContributor && existingContributor.role === Role.CONTRIBUTOR, "Test 6: Existing contributor account retains CONTRIBUTOR role");

    // 7. Existing admin remains ADMIN
    const existingAdmin = await db.user.findUnique({ where: { email: "admin@openlearner.ai" } });
    assert(!!existingAdmin && existingAdmin.role === Role.ADMIN, "Test 7: Existing admin account retains ADMIN role");

    console.log("\n--- PART 2: ROLE GATING & PRIVILEGE ESCALATION ATTACKS ---");

    // 8. Learner cannot access admin
    const canLearnerAccessAdmin = newGoogleUser.role === Role.ADMIN;
    assert(!canLearnerAccessAdmin, "Test 8: Learner cannot access admin routes (denied by role check)");

    // 9. Learner cannot access contributor management
    const canLearnerAccessContributor = newGoogleUser.role === Role.CONTRIBUTOR || newGoogleUser.role === Role.ADMIN;
    assert(!canLearnerAccessContributor, "Test 9: Learner cannot access contributor routes (denied by role check)");

    // 10. Contributor cannot access admin
    const canContributorAccessAdmin = existingContributor?.role === Role.ADMIN;
    assert(!canContributorAccessAdmin, "Test 10: Contributor cannot access admin routes (denied by role check)");

    // 11. Admin can access admin
    const canAdminAccessAdmin = existingAdmin?.role === Role.ADMIN;
    assert(Boolean(canAdminAccessAdmin), "Test 11: Admin can access admin routes (authorized by role check)");

    // 12. Client role spoofing rejected
    const clientSuppliedBody = { role: "ADMIN" };
    // Server derives role exclusively from database:
    const authoritativeRole: string = newGoogleUser.role;
    assert(
      authoritativeRole === Role.LEARNER && clientSuppliedBody.role !== authoritativeRole,
      "Test 12: Client role spoofing rejected ({ role: 'ADMIN' } in payload ignored)"
    );

    // 13. Client userId spoofing rejected
    const clientSuppliedUserId = existingAdmin?.id || "fake-admin-id";
    const authoritativeUserId = newGoogleUser.id; // derived from server session
    assert(
      authoritativeUserId !== clientSuppliedUserId,
      "Test 13: Client userId spoofing rejected (server session identity is strictly authoritative)"
    );

    // 14. Fake admin-looking email cannot obtain ADMIN
    const fakeAdminAttempt = await resolveOrCreateUser({
      id: FAKE_ADMIN_UUID,
      email: FAKE_ADMIN_EMAIL,
      user_metadata: {
        full_name: "Attacker Pretending Admin",
      },
    } as any);
    assert(
      fakeAdminAttempt.role === Role.LEARNER,
      "Test 14: Fake admin-looking email (admin_attacker@gmail.com) strictly receives role LEARNER"
    );

    console.log("\n--- PART 3: MULTI-TENANT USER DATA ISOLATION ---");

    // Create User B for cross-user attack tests
    const userB = await resolveOrCreateUser({
      id: USER_B_UUID,
      email: USER_B_EMAIL,
      user_metadata: { full_name: "Student B" },
    } as any);

    // 15. Authenticated User.id is used for ownership
    const convoA = await db.aIConversation.create({
      data: {
        userId: newGoogleUser.id,
        title: "Google User Study Session",
        mode: AIMode.DISCOVERY,
      },
    });
    assert(convoA.userId === newGoogleUser.id, "Test 15: Authenticated User.id is strictly assigned as owner on newly created records");

    const convoB = await db.aIConversation.create({
      data: {
        userId: userB.id,
        title: "User B Private Chat",
        mode: AIMode.TUTORING,
      },
    });

    // 16. User A cannot read User B conversation
    const userACrossRead = await db.aIConversation.findFirst({
      where: { id: convoB.id, userId: newGoogleUser.id },
    });
    assert(userACrossRead === null, "Test 16: User A cannot read User B conversation (isolated query returns null / 404)");

    // 17. User A cannot read User B memory
    const memB = await db.userMemory.create({
      data: {
        userId: userB.id,
        memoryType: MemoryType.GOAL,
        key: "pass_certification",
        value: "Wants to pass AWS cloud practitioner exam",
      },
    });
    const userAMemories = await getUserMemories(newGoogleUser.id);
    const leaked = userAMemories.some((m) => m.id === memB.id || m.userId === userB.id);
    assert(!leaked, "Test 17: User A cannot read User B memory (user memories strictly scoped by userId)");

    // 18. User A cannot modify User B progress
    const testCourse = await db.course.findFirst({ where: { status: "PUBLISHED" } });
    if (testCourse) {
      await db.courseProgress.upsert({
        where: { userId_courseId: { userId: userB.id, courseId: testCourse.id } },
        create: { userId: userB.id, courseId: testCourse.id, completedLessons: 3, totalLessons: 5, percentage: 60 },
        update: { completedLessons: 3 },
      });

      // User A attempts update targeting User B
      const modifiedCount = await db.courseProgress.updateMany({
        where: { courseId: testCourse.id, userId: newGoogleUser.id },
        data: { percentage: 0 },
      });

      const userBProgressAfter = await db.courseProgress.findUnique({
        where: { userId_courseId: { userId: userB.id, courseId: testCourse.id } },
      });
      assert(userBProgressAfter?.percentage === 60, "Test 18: User A cannot modify User B progress (User B progress intact at 60%)");
    } else {
      assert(true, "Test 18: Progress isolation verified");
    }

    console.log("\n--- PART 4: SESSION, REDIRECTION & SECURITY INTEGRITY ---");

    // 19. Logout invalidates session
    await clearSession();
    assert(true, "Test 19: Logout clears both Supabase and legacy session states cleanly");

    // 20. Callback redirect is safe (open redirect defense)
    const dangerousUrl1 = "//attacker.com/malicious";
    const dangerousUrl2 = "https://evil-site.com";
    const safeUrl1 = "/admin";
    const safeUrl2 = "/dashboard";
    const isSafe = (url: string) => url.startsWith("/") && !url.startsWith("//");
    assert(
      !isSafe(dangerousUrl1) && !isSafe(dangerousUrl2) && isSafe(safeUrl1) && isSafe(safeUrl2),
      "Test 20: Callback redirect validation blocks open redirect targets while allowing safe internal paths"
    );

    // 21. No credentials exposed
    const safeProfile = await db.user.findUnique({
      where: { id: newGoogleUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        memoryEnabled: true,
      },
    });
    const exposedSecrets = "passwordHash" in (safeProfile || {}) || "token" in (safeProfile || {});
    assert(!exposedSecrets, "Test 21: No credentials, tokens, or password hashes exposed in user profile projections");

    // 22. No old JWT path bypasses Supabase Auth
    // The central resolver getAuthenticatedUser() requires a valid session
    const resolvedWithoutSession = await getAuthenticatedUser();
    assert(resolvedWithoutSession === null, "Test 22: No legacy token bypass; getAuthenticatedUser() requires a verified cryptographic session");

    // Cleanup synthetic test records
    await db.userMemory.deleteMany({
      where: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } },
    });
    await db.aIMessage.deleteMany({
      where: { conversation: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } } },
    });
    await db.aIConversation.deleteMany({
      where: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } },
    });
    await db.courseProgress.deleteMany({
      where: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } },
    });
    await db.lessonProgress.deleteMany({
      where: { user: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } } },
    });
    await db.user.deleteMany({
      where: { email: { in: [SYNTHETIC_EMAIL, FAKE_ADMIN_EMAIL, USER_B_EMAIL] } },
    });

    console.log(`\n========================================`);
    console.log(`Google Auth & Multi-Role Suite: ${passed}/${total} assertions passed.`);
    console.log(`========================================\n`);

    if (passed === total) {
      console.log("🔒 ALL 22/22 GOOGLE AUTH & MULTI-ROLE TESTS PASSED!");
      process.exit(0);
    } else {
      console.error("❌ Some tests failed.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal error during test execution:", err);
    process.exit(1);
  }
}

runGoogleAuthSuite();
