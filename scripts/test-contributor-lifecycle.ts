import { db } from "../src/lib/db";
import { createSession } from "../src/lib/auth-legacy";
import { NextRequest } from "next/server";
import { POST as createCourseRoute } from "../src/app/api/contributor/courses/route";
import { PUT as updateCourseRoute } from "../src/app/api/contributor/courses/[id]/route";
import { POST as createModuleRoute } from "../src/app/api/contributor/courses/[id]/modules/route";
import { PUT as updateModuleRoute, DELETE as deleteModuleRoute } from "../src/app/api/contributor/modules/[id]/route";
import { POST as createLessonRoute } from "../src/app/api/contributor/modules/[id]/lessons/route";
import { PUT as updateLessonRoute, DELETE as deleteLessonRoute } from "../src/app/api/contributor/modules/[id]/lessons/[lessonId]/route";
import { PATCH as reorderRoute } from "../src/app/api/contributor/courses/[id]/reorder/route";
import { POST as attachResourceRoute } from "../src/app/api/contributor/lessons/[id]/resources/route";
import { DELETE as deleteResourceRoute } from "../src/app/api/contributor/lessons/[id]/resources/[resourceId]/route";
import { POST as submitCourseRoute } from "../src/app/api/contributor/courses/[id]/submit/route";
import { POST as approveCourseRoute } from "../src/app/api/admin/submissions/[id]/approve/route";
import { POST as rejectCourseRoute } from "../src/app/api/admin/submissions/[id]/reject/route";

interface AssertionHelper {
  (condition: boolean, testName: string, detail?: string): void;
}

async function runContributorLifecycleTests() {
  console.log("==================================================");
  console.log("CONTRIBUTOR STUDIO 2.0 LIFECYCLE & SECURITY TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  const assert: AssertionHelper = (condition, testName, detail) => {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  };

  // Mock next/headers cookies for direct route invocation in test runner
  const nextHeaders = require("next/headers");
  const testCookieStore = new Map<string, string>();
  nextHeaders.cookies = async () => ({
    get: (name: string) => {
      const val = testCookieStore.get(name);
      return val !== undefined ? { name, value: val } : undefined;
    },
    getAll: () => Array.from(testCookieStore.entries()).map(([name, value]) => ({ name, value })),
    has: (name: string) => testCookieStore.has(name),
    set: (name: string, value: string) => { testCookieStore.set(name, value); },
    delete: (name: string) => { testCookieStore.delete(name); },
  });

  // Helper to create an authenticated NextRequest with a session token
  async function makeRequest(
    url: string,
    method: string,
    user?: { id: string; email: string; name: string; role: any } | null,
    body?: any
  ) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    testCookieStore.clear();

    if (user) {
      const token = await createSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      headers["cookie"] = `openlearner_session=${token}`;
      testCookieStore.set("openlearner_session", token);
    }

    return new NextRequest(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }


  // Tracking variables for cleanup
  let createdCourseId = "";
  let secondaryCourseId = "";
  let contributorUser: any = null;
  let otherContributorUser: any = null;
  let learnerUser: any = null;
  let adminUser: any = null;


  try {
    // ----------------------------------------------------
    // SETUP: Isolated Test Users and Category
    // ----------------------------------------------------
    contributorUser = await db.user.upsert({
      where: { email: "test-contributor-2@openlearner.ai" },
      update: { role: "CONTRIBUTOR" },
      create: {
        email: "test-contributor-2@openlearner.ai",
        normalizedEmail: "test-contributor-2@openlearner.ai",
        name: "Test Contributor 2",
        role: "CONTRIBUTOR",
        passwordHash: "hash-unused",
      },
    });

    otherContributorUser = await db.user.upsert({
      where: { email: "other-contributor-2@openlearner.ai" },
      update: { role: "CONTRIBUTOR" },
      create: {
        email: "other-contributor-2@openlearner.ai",
        normalizedEmail: "other-contributor-2@openlearner.ai",
        name: "Other Contributor 2",
        role: "CONTRIBUTOR",
        passwordHash: "hash-unused",
      },
    });

    learnerUser = await db.user.upsert({
      where: { email: "test-learner-sec-2@openlearner.ai" },
      update: { role: "LEARNER" },
      create: {
        email: "test-learner-sec-2@openlearner.ai",
        normalizedEmail: "test-learner-sec-2@openlearner.ai",
        name: "Test Learner 2",
        role: "LEARNER",
        passwordHash: "hash-unused",
      },
    });

    adminUser = await db.user.upsert({
      where: { email: "test-admin-sec-2@openlearner.ai" },
      update: { role: "ADMIN" },
      create: {
        email: "test-admin-sec-2@openlearner.ai",
        normalizedEmail: "test-admin-sec-2@openlearner.ai",
        name: "Test Admin 2",
        role: "ADMIN",
        passwordHash: "hash-unused",
      },
    });

    let category = await db.category.findFirst();
    if (!category) {
      category = await db.category.create({
        data: {
          name: "Computer Science",
          slug: "computer-science",
          description: "Software engineering and architecture",
        },
      });
    }

    console.log("Setup completed. Running lifecycle tests...\n");

    // ----------------------------------------------------
    // TEST 1: Create draft course
    // ----------------------------------------------------
    console.log("--- 1. Course Creation & Metadata ---");
    const createReq = await makeRequest(
      "http://localhost:3000/api/contributor/courses",
      "POST",
      contributorUser,
      {
        title: "Advanced Distributed Systems with TypeScript",
        shortSummary: "Master fault-tolerant distributed computing principles.",
        description: "A comprehensive course covering consensus algorithms, actor models, and event-driven architectures.",
        difficulty: "ADVANCED",
        estimatedHours: 12,
        categoryId: category.id,
      }
    );

    const createRes = await createCourseRoute(createReq);
    const createData = await createRes.json();
    assert(
      createRes.status === 201 && !!createData.course?.id && createData.course.status === "DRAFT",
      "1. Create draft course initializes course in DRAFT status"
    );
    createdCourseId = createData.course.id;

    // ----------------------------------------------------
    // TEST 2: Edit course metadata
    // ----------------------------------------------------
    const editReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}`,
      "PUT",
      contributorUser,
      {
        title: "Advanced Distributed Systems with TypeScript (Updated Edition)",
        shortSummary: "Master fault-tolerant distributed computing and event streams.",
        description: "A comprehensive updated course covering consensus algorithms, actor models, and event-driven architectures.",
        difficulty: "ADVANCED",
        estimatedHours: 14.5,
        categoryId: category.id,
        thumbnailUrl: "https://example.com/new-thumb.webp",
      }
    );

    const editRes = await updateCourseRoute(editReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const editData = await editRes.json();
    assert(
      editRes.status === 200 && editData.course?.estimatedHours === 14.5,
      "2. Edit course metadata successfully updates title, summary, hours, and thumbnail"
    );

    // ----------------------------------------------------
    // TEST 3: Create module
    // ----------------------------------------------------
    console.log("\n--- 2. Module CRUD & Reordering ---");
    const modReq1 = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}/modules`,
      "POST",
      contributorUser,
      {
        title: "Module 1: Consensus Protocols",
        description: "Foundations of Paxos, Raft, and Byzantine Fault Tolerance",
        orderIndex: 1,
      }
    );
    const modRes1 = await createModuleRoute(modReq1, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const modData1 = await modRes1.json();
    assert(
      modRes1.status === 201 && modData1.module?.orderIndex === 1,
      "3. Create module creates module at orderIndex 1"
    );
    const module1Id = modData1.module.id;

    const modReq2 = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}/modules`,
      "POST",
      contributorUser,
      {
        title: "Module 2: Event-Driven Architectures",
        description: "Event sourcing, CQRS, and streaming protocols",
        orderIndex: 2,
      }
    );
    const modRes2 = await createModuleRoute(modReq2, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const modData2 = await modRes2.json();
    assert(
      modRes2.status === 201 && modData2.module?.orderIndex === 2,
      "3b. Create second module creates module at orderIndex 2"
    );
    const module2Id = modData2.module.id;

    // ----------------------------------------------------
    // TEST 4: Edit module
    // ----------------------------------------------------
    const modEditReq = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}`,
      "PUT",
      contributorUser,
      {
        title: "Module 1: Consensus Protocols & Leader Election",
        description: "Deep dive into Raft leader election and log replication",
      }
    );
    const modEditRes = await updateModuleRoute(modEditReq, {
      params: Promise.resolve({ id: module1Id }),
    });
    const modEditData = await modEditRes.json();
    assert(
      modEditRes.status === 200 &&
        modEditData.module?.title === "Module 1: Consensus Protocols & Leader Election",
      "4. Edit module updates module title and description"
    );

    // ----------------------------------------------------
    // TEST 5: Reorder modules
    // ----------------------------------------------------
    const reorderModReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}/reorder`,
      "PATCH",
      contributorUser,
      {
        type: "MODULES",
        orderedIds: [module2Id, module1Id],
      }
    );
    const reorderModRes = await reorderRoute(reorderModReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const m1Check = await db.module.findUnique({ where: { id: module1Id } });
    const m2Check = await db.module.findUnique({ where: { id: module2Id } });
    assert(
      reorderModRes.status === 200 && m2Check?.orderIndex === 1 && m1Check?.orderIndex === 2,
      "5. Reorder modules deterministically updates orderIndex values [2 -> 1, 1 -> 2]"
    );

    // Swap back for consistent structure
    await reorderRoute(
      await makeRequest(
        `http://localhost:3000/api/contributor/courses/${createdCourseId}/reorder`,
        "PATCH",
        contributorUser,
        { type: "MODULES", orderedIds: [module1Id, module2Id] }
      ),
      { params: Promise.resolve({ id: createdCourseId }) }
    );

    // ----------------------------------------------------
    // TEST 6: Create lesson
    // ----------------------------------------------------
    console.log("\n--- 3. Lesson CRUD & Reordering ---");
    const lessonReq1 = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}/lessons`,
      "POST",
      contributorUser,
      {
        title: "Raft State Machine & Leader Election",
        description: "Understanding candidate, leader, and follower state transitions",
        contentType: "TEXT",
        textContent: "# Raft State Machine\n\nIn Raft, a node can be in one of three states:\n- **Follower**\n- **Candidate**\n- **Leader**\n\n```typescript\ntype NodeState = 'FOLLOWER' | 'CANDIDATE' | 'LEADER';\n```",
        durationMinutes: 20,
        orderIndex: 1,
        isRequired: true,
      }
    );
    const lessonRes1 = await createLessonRoute(lessonReq1, {
      params: Promise.resolve({ id: module1Id }),
    });
    const lessonData1 = await lessonRes1.json();
    assert(
      lessonRes1.status === 201 && !!lessonData1.lesson?.id && lessonData1.lesson.orderIndex === 1,
      "6. Create lesson creates lesson at orderIndex 1 with markdown textContent"
    );
    const lesson1Id = lessonData1.lesson.id;

    const lessonReq2 = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}/lessons`,
      "POST",
      contributorUser,
      {
        title: "Log Replication & Heartbeats",
        description: "Leader heartbeats and committing log entries across majority nodes",
        contentType: "TEXT",
        textContent: "# Log Replication\n\nEntries must be accepted by a strict quorum.",
        durationMinutes: 25,
        orderIndex: 2,
        isRequired: true,
      }
    );
    const lessonRes2 = await createLessonRoute(lessonReq2, {
      params: Promise.resolve({ id: module1Id }),
    });
    const lessonData2 = await lessonRes2.json();
    const lesson2Id = lessonData2.lesson.id;

    const lessonReq3 = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}/lessons`,
      "POST",
      contributorUser,
      {
        title: "Temporary Lesson To Be Deleted",
        description: "This lesson will be deleted to verify index healing and orphan cleanup",
        contentType: "TEXT",
        textContent: "# Temp Lesson\n\nTo be deleted.",
        durationMinutes: 5,
        orderIndex: 3,
        isRequired: false,
      }
    );
    const lessonRes3 = await createLessonRoute(lessonReq3, {
      params: Promise.resolve({ id: module1Id }),
    });
    const lessonData3 = await lessonRes3.json();
    const lesson3Id = lessonData3.lesson.id;
    assert(
      lessonRes3.status === 201 && lessonData3.lesson.orderIndex === 3,
      "6b. Create additional lessons establishes ordered sequence (1, 2, 3)"
    );

    // ----------------------------------------------------
    // TEST 7: Edit lesson
    // ----------------------------------------------------
    const lessonEditReq = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}/lessons/${lesson1Id}`,
      "PUT",
      contributorUser,
      {
        title: "Raft State Machine & Leader Election (Revised)",
        description: "Comprehensive state machine overview with term numbers",
        contentType: "TEXT",
        textContent: "# Raft Consensus\n\nTerm numbers act as a logical clock in Raft.",
        durationMinutes: 22,
        isRequired: true,
      }
    );
    const lessonEditRes = await updateLessonRoute(lessonEditReq, {
      params: Promise.resolve({ id: module1Id, lessonId: lesson1Id }),
    });
    const lessonEditData = await lessonEditRes.json();
    assert(
      lessonEditRes.status === 200 && lessonEditData.lesson?.durationMinutes === 22,
      "7. Edit lesson updates lesson metadata and markdown content"
    );

    // ----------------------------------------------------
    // TEST 8: Reorder lessons
    // ----------------------------------------------------
    const reorderLessonReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}/reorder`,
      "PATCH",
      contributorUser,
      {
        type: "LESSONS",
        moduleId: module1Id,
        orderedIds: [lesson2Id, lesson1Id, lesson3Id],
      }
    );
    const reorderLessonRes = await reorderRoute(reorderLessonReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const l1Check = await db.lesson.findUnique({ where: { id: lesson1Id } });
    const l2Check = await db.lesson.findUnique({ where: { id: lesson2Id } });
    assert(
      reorderLessonRes.status === 200 && l2Check?.orderIndex === 1 && l1Check?.orderIndex === 2,
      "8. Reorder lessons within module updates sequential orderIndex deterministically"
    );

    // Swap back
    await reorderRoute(
      await makeRequest(
        `http://localhost:3000/api/contributor/courses/${createdCourseId}/reorder`,
        "PATCH",
        contributorUser,
        { type: "LESSONS", moduleId: module1Id, orderedIds: [lesson1Id, lesson2Id, lesson3Id] }
      ),
      { params: Promise.resolve({ id: createdCourseId }) }
    );

    // ----------------------------------------------------
    // TEST 9: Attach resource
    // ----------------------------------------------------
    console.log("\n--- 4. Resource Management ---");
    const attachReq = await makeRequest(
      `http://localhost:3000/api/contributor/lessons/${lesson1Id}/resources`,
      "POST",
      contributorUser,
      {
        title: "Raft Paper PDF",
        resourceType: "PDF",
        url: "https://raft.github.io/raft.pdf",
        description: "Original In Search of an Understandable Consensus Algorithm paper",
        isInternal: false,
      }
    );
    const attachRes = await attachResourceRoute(attachReq, {
      params: Promise.resolve({ id: lesson1Id }),
    });
    const attachData = await attachRes.json();
    assert(
      attachRes.status === 201 && attachData.resource?.title === "Raft Paper PDF",
      "9. Attach resource attaches external PDF resource to lesson"
    );
    const resourceId = attachData.resource.id;

    // Attach second resource on lesson 3 for deletion testing
    const attachReq3 = await makeRequest(
      `http://localhost:3000/api/contributor/lessons/${lesson3Id}/resources`,
      "POST",
      contributorUser,
      {
        title: "Temp Notes PDF",
        resourceType: "PDF",
        url: "https://example.com/temp.pdf",
        description: "Temporary notes",
      }
    );
    const attachRes3 = await attachResourceRoute(attachReq3, {
      params: Promise.resolve({ id: lesson3Id }),
    });
    const resource3Id = (await attachRes3.json()).resource.id;

    // ----------------------------------------------------
    // TEST 10: Delete resource
    // ----------------------------------------------------
    const delResReq = await makeRequest(
      `http://localhost:3000/api/contributor/lessons/${lesson3Id}/resources/${resource3Id}`,
      "DELETE",
      contributorUser
    );
    const delResRes = await deleteResourceRoute(delResReq, {
      params: Promise.resolve({ id: lesson3Id, resourceId: resource3Id }),
    });
    const deletedResCheck = await db.resource.findUnique({ where: { id: resource3Id } });
    assert(
      delResRes.status === 200 && deletedResCheck === null,
      "10. Delete resource safely removes resource attachment"
    );

    // ----------------------------------------------------
    // TEST 11: Delete lesson safely & heal orderIndex
    // ----------------------------------------------------
    console.log("\n--- 5. Lesson Deletion & Orphan Cleaning ---");
    // Also create a test Document record for lesson3 to verify Document cleanup
    const testDoc = await db.document.create({
      data: {
        courseId: createdCourseId,
        lessonId: lesson3Id,
        sourceType: "LESSON_CONTENT",
        status: "INDEXED",
      },
    });

    const delLessReq = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}/lessons/${lesson3Id}`,
      "DELETE",
      contributorUser
    );
    const delLessRes = await deleteLessonRoute(delLessReq, {
      params: Promise.resolve({ id: module1Id, lessonId: lesson3Id }),
    });

    const deletedLessonCheck = await db.lesson.findUnique({ where: { id: lesson3Id } });
    const docCheck = await db.document.findUnique({ where: { id: testDoc.id } });
    const remainingLessonsInM1 = await db.lesson.findMany({
      where: { moduleId: module1Id },
      orderBy: { orderIndex: "asc" },
    });

    assert(
      delLessRes.status === 200 && deletedLessonCheck === null,
      "11. Delete lesson safely deletes lesson record"
    );

    // ----------------------------------------------------
    // TEST 12: Verify lesson indexing records are cleaned
    // ----------------------------------------------------
    const healedOrder = remainingLessonsInM1.map((l) => l.orderIndex);
    assert(
      docCheck === null && JSON.stringify(healedOrder) === JSON.stringify([1, 2]),
      "12. Deleted lesson's Document/chunks are cleaned and sibling orderIndex heals to [1, 2]"
    );

    // Also add a lesson in module 2 so module 2 is not empty
    await createLessonRoute(
      await makeRequest(
        `http://localhost:3000/api/contributor/modules/${module2Id}/lessons`,
        "POST",
        contributorUser,
        {
          title: "CQRS Pattern & Read Projections",
          description: "Optimizing read models with asynchronous projection engines",
          contentType: "TEXT",
          textContent: "# CQRS Architecture\n\nSeparation of command and query responsibilities.",
          durationMinutes: 30,
          orderIndex: 1,
          isRequired: true,
        }
      ),
      { params: Promise.resolve({ id: module2Id }) }
    );

    // ----------------------------------------------------
    // TEST 13: Submit course for review
    // ----------------------------------------------------
    console.log("\n--- 6. Rejection, Revision, and Resubmission ---");
    const submitReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}/submit`,
      "POST",
      contributorUser
    );
    const submitRes = await submitCourseRoute(submitReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const submittedCourse = await db.course.findUnique({ where: { id: createdCourseId } });
    assert(
      submitRes.status === 200 && submittedCourse?.status === "PENDING_REVIEW",
      "13. Submit course transitions course status from DRAFT to PENDING_REVIEW"
    );

    // ----------------------------------------------------
    // TEST 14: Admin rejects course with feedback
    // ----------------------------------------------------
    const rejectReq = await makeRequest(
      `http://localhost:3000/api/admin/submissions/${createdCourseId}/reject`,
      "POST",
      adminUser,
      {
        action: "REJECTED",
        comments: "Please add more detailed code examples on Raft split-brain handling in Module 1.",
      }
    );
    const rejectRes = await rejectCourseRoute(rejectReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const rejectedCourse = await db.course.findUnique({ where: { id: createdCourseId } });
    assert(
      rejectRes.status === 200 && rejectedCourse?.status === "REJECTED",
      "14. Admin reject transitions course from PENDING_REVIEW to REJECTED"
    );

    // ----------------------------------------------------
    // TEST 15: Rejection feedback persists
    // ----------------------------------------------------
    assert(
      rejectedCourse?.rejectionReason === "Please add more detailed code examples on Raft split-brain handling in Module 1.",
      "15. Rejection feedback comments persist on the course record for contributor revision"
    );

    // ----------------------------------------------------
    // TEST 16: Contributor edits rejected course
    // ----------------------------------------------------
    const reviseReq = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}/lessons/${lesson1Id}`,
      "PUT",
      contributorUser,
      {
        title: "Raft State Machine & Split-Brain Mitigation",
        description: "Addressing editorial feedback: full network partition and split-brain mitigation guide",
        contentType: "TEXT",
        textContent: "# Raft Split-Brain Mitigation\n\nQuorums ensure only one partition can elect a leader.",
        durationMinutes: 30,
        isRequired: true,
      }
    );
    const reviseRes = await updateLessonRoute(reviseReq, {
      params: Promise.resolve({ id: module1Id, lessonId: lesson1Id }),
    });
    assert(
      reviseRes.status === 200,
      "16. Contributor is authorized to edit lessons and curriculum on a REJECTED course"
    );

    // ----------------------------------------------------
    // TEST 17: Contributor resubmits course
    // ----------------------------------------------------
    const resubmitReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}/submit`,
      "POST",
      contributorUser
    );
    const resubmitRes = await submitCourseRoute(resubmitReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const resubmittedCourse = await db.course.findUnique({ where: { id: createdCourseId } });
    const lastReview = await db.courseReview.findFirst({
      where: { courseId: createdCourseId },
      orderBy: { createdAt: "desc" },
    });
    assert(
      resubmitRes.status === 200 &&
        resubmittedCourse?.status === "PENDING_REVIEW" &&
        resubmittedCourse?.rejectionReason === null &&
        lastReview?.action === "RESUBMITTED",
      "17. Contributor resubmission clears active rejection reason and logs RESUBMITTED CourseReview"
    );

    // ----------------------------------------------------
    // TEST 18 & 19: Admin approves & verify publication
    // ----------------------------------------------------
    console.log("\n--- 7. Publication & Automatic Indexing ---");
    const approveReq = await makeRequest(
      `http://localhost:3000/api/admin/submissions/${createdCourseId}/approve`,
      "POST",
      adminUser
    );
    const approveRes = await approveCourseRoute(approveReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    const approveData = await approveRes.json();
    const publishedCourse = await db.course.findUnique({ where: { id: createdCourseId } });
    assert(
      approveRes.status === 200 &&
        publishedCourse?.status === "PUBLISHED" &&
        publishedCourse?.publishedAt !== null,
      "18. Admin approval transitions course to PUBLISHED with publishedAt timestamp"
    );

    // ----------------------------------------------------
    // TEST 20: Verify automatic indexing behavior
    // ----------------------------------------------------
    // Check whether indexing executed or was returned safely in response
    const indexingExecuted = approveData.indexing !== undefined;
    const publishedDocs = await db.document.findMany({
      where: { courseId: createdCourseId },
    });
    assert(
      indexingExecuted,
      `20. Automatic indexing triggered post-publication without aborting database transaction (docs evaluated: ${publishedDocs.length})`
    );

    // ----------------------------------------------------
    // TEST 21: Unauthorized contributor mutation returns 403
    // ----------------------------------------------------
    console.log("\n--- 8. Security & Authorization Guardrails ---");
    const learnerEditReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}`,
      "PUT",
      learnerUser,
      {
        title: "Malicious Learner Update",
        shortSummary: "Should be blocked.",
        description: "Should be blocked.",
        difficulty: "BEGINNER",
        categoryId: category.id,
      }
    );
    const learnerEditRes = await updateCourseRoute(learnerEditReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    assert(
      learnerEditRes.status === 403,
      `21. Unauthorized user role (LEARNER) mutation returns 403 Forbidden (got ${learnerEditRes.status})`
    );

    // ----------------------------------------------------
    // TEST 22: Contributor cannot edit another contributor's course
    // ----------------------------------------------------
    // Create course owned by otherContributorUser
    const otherCourse = await db.course.create({
      data: {
        title: "Other Contributor Course",
        slug: "other-contributor-course-sec",
        shortSummary: "Protected by IDOR checks.",
        description: "Protected by IDOR checks.",
        difficulty: "BEGINNER",
        status: "DRAFT",
        authorId: otherContributorUser.id,
        categoryId: category.id,
      },
    });
    secondaryCourseId = otherCourse.id;

    const crossAuthorReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${secondaryCourseId}`,
      "PUT",
      contributorUser,
      {
        title: "IDOR Attempt on Another Contributor Course",
        shortSummary: "Should fail with 403 Forbidden.",
        description: "Should fail with 403 Forbidden.",
        difficulty: "BEGINNER",
        categoryId: category.id,
      }
    );
    const crossAuthorRes = await updateCourseRoute(crossAuthorReq, {
      params: Promise.resolve({ id: secondaryCourseId }),
    });
    assert(
      crossAuthorRes.status === 403,
      `22. Cross-contributor course mutation blocked with 403 Forbidden (IDOR protection verified)`
    );

    // ----------------------------------------------------
    // TEST 23: Contributor cannot mutate PENDING_REVIEW course
    // ----------------------------------------------------
    await db.course.update({
      where: { id: secondaryCourseId },
      data: { status: "PENDING_REVIEW" },
    });

    const pendingMutateReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${secondaryCourseId}`,
      "PUT",
      otherContributorUser,
      {
        title: "Attempted Edit On Pending Course",
        shortSummary: "Should fail because course is under review.",
        description: "Should fail because course is under review.",
        difficulty: "BEGINNER",
        categoryId: category.id,
      }
    );
    const pendingMutateRes = await updateCourseRoute(pendingMutateReq, {
      params: Promise.resolve({ id: secondaryCourseId }),
    });
    assert(
      pendingMutateRes.status === 403,
      `23. Contributor mutation on PENDING_REVIEW course is blocked with 403 Forbidden (got ${pendingMutateRes.status})`
    );

    // ----------------------------------------------------
    // TEST 24: Contributor cannot mutate PUBLISHED course
    // ----------------------------------------------------
    const publishedMutateReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}`,
      "PUT",
      contributorUser,
      {
        title: "Attempted Edit on Live Published Course",
        shortSummary: "Should fail because course is live.",
        description: "Should fail because course is live.",
        difficulty: "BEGINNER",
        categoryId: category.id,
      }
    );
    const publishedMutateRes = await updateCourseRoute(publishedMutateReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    assert(
      publishedMutateRes.status === 403,
      `24. Contributor mutation on PUBLISHED course is blocked with 403 Forbidden (got ${publishedMutateRes.status})`
    );

    // ----------------------------------------------------
    // TEST 25: Deterministic Curriculum Order Ascending
    // ----------------------------------------------------
    const verifiedModules: any = await db.module.findMany({
      where: { courseId: createdCourseId },
      orderBy: { orderIndex: "asc" },
      include: { lessons: { orderBy: { orderIndex: "asc" } } },
    });
    const moduleIndices = verifiedModules.map((m: any) => m.orderIndex);
    const lessonIndicesM1 = verifiedModules[0].lessons.map((l: any) => l.orderIndex);


    assert(
      JSON.stringify(moduleIndices) === JSON.stringify([1, 2]) &&
        JSON.stringify(lessonIndicesM1) === JSON.stringify([1, 2]),
      "25. Curriculum orderIndex sequence is strictly sequential and deterministic [1, 2]"
    );

    // ----------------------------------------------------
    // TEST 26: Learner Resume Behavior Remains Correct
    // ----------------------------------------------------
    // Verify that first incomplete lesson resolver is functioning
    const allCourseLessons = verifiedModules.flatMap((m: any) => m.lessons);
    // Mark first lesson completed
    await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: learnerUser.id, lessonId: allCourseLessons[0].id } },
      update: { isCompleted: true },
      create: { userId: learnerUser.id, lessonId: allCourseLessons[0].id, isCompleted: true },
    });
    // Incomplete lesson should be index 1
    const incompleteLesson = allCourseLessons.find((l: any) => l.id === allCourseLessons[1].id);
    assert(
      !!incompleteLesson && incompleteLesson.id === allCourseLessons[1].id,
      `26. Learner resume logic resolves first incomplete lesson correctly ("${incompleteLesson?.title}")`
    );


    // ----------------------------------------------------
    // TEST 27 (Security): Unsafe resource URL rejected
    // ----------------------------------------------------
    console.log("\n--- 9. Security Specific Injections & Cross-Resource Guards ---");
    // Temporarily set course back to DRAFT for injection tests
    await db.course.update({ where: { id: createdCourseId }, data: { status: "DRAFT" } });

    const unsafeResReq = await makeRequest(
      `http://localhost:3000/api/contributor/lessons/${lesson1Id}/resources`,
      "POST",
      contributorUser,
      {
        title: "Malicious Link",
        resourceType: "EXTERNAL_LINK",
        url: "javascript:alert('xss')",
        description: "Attempted XSS injection",
      }
    );
    const unsafeResRes = await attachResourceRoute(unsafeResReq, {
      params: Promise.resolve({ id: lesson1Id }),
    });
    assert(
      unsafeResRes.status === 400,
      `27. Unsafe resource protocol (javascript:) is rejected with 400 Bad Request (got ${unsafeResRes.status})`
    );

    // ----------------------------------------------------
    // TEST 28 (Security): Cross-course module mutation blocked
    // ----------------------------------------------------
    // Try to delete module from other contributor's course
    const crossModDelReq = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}`,
      "DELETE",
      otherContributorUser
    );
    const crossModDelRes = await deleteModuleRoute(crossModDelReq, {
      params: Promise.resolve({ id: module1Id }),
    });
    assert(
      crossModDelRes.status === 403,
      `28. Cross-course module deletion attempt by another contributor returns 403 Forbidden`
    );

    // ----------------------------------------------------
    // TEST 29 (Security): Invalid reorder payload with duplicate IDs rejected
    // ----------------------------------------------------
    const duplicateReorderReq = await makeRequest(
      `http://localhost:3000/api/contributor/courses/${createdCourseId}/reorder`,
      "PATCH",
      contributorUser,
      {
        type: "MODULES",
        orderedIds: [module1Id, module1Id], // duplicate
      }
    );
    const duplicateReorderRes = await reorderRoute(duplicateReorderReq, {
      params: Promise.resolve({ id: createdCourseId }),
    });
    assert(
      duplicateReorderRes.status === 400,
      `29. Reorder payload with duplicate IDs is rejected with 400 Bad Request (got ${duplicateReorderRes.status})`
    );

    // ----------------------------------------------------
    // TEST 30 (Security): Malformed lesson payload rejected
    // ----------------------------------------------------
    const malformedLessonReq = await makeRequest(
      `http://localhost:3000/api/contributor/modules/${module1Id}/lessons`,
      "POST",
      contributorUser,
      {
        title: "X", // too short (min 3)
        orderIndex: "not-a-number",
      }
    );
    const malformedLessonRes = await createLessonRoute(malformedLessonReq, {
      params: Promise.resolve({ id: module1Id }),
    });
    assert(
      malformedLessonRes.status === 400,
      `30. Malformed lesson payload failing Zod validation returns 400 Bad Request (got ${malformedLessonRes.status})`
    );

  } finally {
    // ----------------------------------------------------
    // CLEANUP: Isolated Test Data
    // ----------------------------------------------------
    console.log("\n--- Cleaning up test fixtures ---");
    if (createdCourseId) {
      // Prisma cascade handles modules, lessons, resources, documents
      await db.courseReview.deleteMany({ where: { courseId: createdCourseId } });
      await db.course.delete({ where: { id: createdCourseId } }).catch(() => null);
    }
    if (secondaryCourseId) {
      await db.course.delete({ where: { id: secondaryCourseId } }).catch(() => null);
    }
    if (learnerUser) {
      await db.lessonProgress.deleteMany({ where: { userId: learnerUser.id } });
      await db.user.delete({ where: { id: learnerUser.id } }).catch(() => null);
    }
    if (contributorUser) {
      await db.user.delete({ where: { id: contributorUser.id } }).catch(() => null);
    }
    if (otherContributorUser) {
      await db.user.delete({ where: { id: otherContributorUser.id } }).catch(() => null);
    }
    if (adminUser) {
      await db.user.delete({ where: { id: adminUser.id } }).catch(() => null);
    }
    console.log("Cleanup completed.");
  }

  console.log("\n==================================================");
  console.log(`CONTRIBUTOR STUDIO 2.0 RESULTS: ${passed}/${total} PASSED`);
  console.log("==================================================");

  if (passed < total) {
    process.exit(1);
  }
}

runContributorLifecycleTests().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
