import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SessionPayload } from "@/lib/auth-legacy";
import { Course, Module, Lesson, Resource } from "@prisma/client";

export type ContributorAuthSuccess<T = Course> = {
  success: true;
  session: SessionPayload;
  course: Course;
  entity: T;
};

export type ContributorAuthFailure = {
  success: false;
  response: NextResponse;
  status: number;
  error: string;
};

export type ContributorAuthResult<T = Course> =
  | ContributorAuthSuccess<T>
  | ContributorAuthFailure;

interface GuardOptions {
  requireEditableStatus?: boolean; // Default true: must be DRAFT or REJECTED
}

/**
 * Centralized contributor authorization guard for courses.
 * Enforces:
 * 1. Authenticated session (401)
 * 2. Role = CONTRIBUTOR or ADMIN (403)
 * 3. Course existence (404)
 * 4. Course ownership: contributor must own course, or user must be ADMIN (403)
 * 5. Course status: contributor can only edit DRAFT or REJECTED courses (403)
 */
export async function verifyContributorCourseAccess(
  courseId: string,
  options: GuardOptions = { requireEditableStatus: true }
): Promise<ContributorAuthResult<Course>> {
  const session = await getSession();

  if (!session) {
    return {
      success: false,
      status: 401,
      error: "Unauthorized. Please sign in.",
      response: NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 }),
    };
  }

  if (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN") {
    return {
      success: false,
      status: 403,
      error: "Forbidden. Contributor access required.",
      response: NextResponse.json({ error: "Forbidden. Contributor access required." }, { status: 403 }),
    };
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return {
      success: false,
      status: 404,
      error: "Course not found.",
      response: NextResponse.json({ error: "Course not found." }, { status: 404 }),
    };
  }

  const isAuthor = course.authorId === session.userId;
  const isAdmin = session.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    return {
      success: false,
      status: 403,
      error: "Forbidden. You do not own this course.",
      response: NextResponse.json({ error: "Forbidden. You do not own this course." }, { status: 403 }),
    };
  }

  const isEditable = course.status === "DRAFT" || course.status === "REJECTED";

  if (options.requireEditableStatus !== false) {
    // Contributors can only edit DRAFT or REJECTED courses
    if (!isEditable && !isAdmin) {
      return {
        success: false,
        status: 403,
        error: `Cannot modify course in ${course.status} status. Only DRAFT and REJECTED courses can be edited.`,
        response: NextResponse.json(
          {
            error: `Cannot modify course in ${course.status} status. Only DRAFT and REJECTED courses can be edited.`,
          },
          { status: 403 }
        ),
      };
    }
  }

  return {
    success: true,
    session,
    course,
    entity: course,
  };
}

/**
 * Verifies contributor access to a specific module and its parent course.
 */
export async function verifyContributorModuleAccess(
  moduleId: string,
  options: GuardOptions = { requireEditableStatus: true }
): Promise<ContributorAuthResult<Module & { course: Course }>> {
  const moduleItem = await db.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });

  if (!moduleItem) {
    return {
      success: false,
      status: 404,
      error: "Module not found.",
      response: NextResponse.json({ error: "Module not found." }, { status: 404 }),
    };
  }

  const courseAuth = await verifyContributorCourseAccess(moduleItem.courseId, options);
  if (!courseAuth.success) {
    return courseAuth;
  }

  return {
    success: true,
    session: courseAuth.session,
    course: courseAuth.course,
    entity: moduleItem,
  };
}

/**
 * Verifies contributor access to a specific lesson and its parent course.
 */
export async function verifyContributorLessonAccess(
  lessonId: string,
  options: GuardOptions = { requireEditableStatus: true }
): Promise<ContributorAuthResult<Lesson & { module: Module & { course: Course } }>> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: true },
      },
    },
  });

  if (!lesson || !lesson.module || !lesson.module.course) {
    return {
      success: false,
      status: 404,
      error: "Lesson not found.",
      response: NextResponse.json({ error: "Lesson not found." }, { status: 404 }),
    };
  }

  const courseAuth = await verifyContributorCourseAccess(lesson.module.courseId, options);
  if (!courseAuth.success) {
    return courseAuth;
  }

  return {
    success: true,
    session: courseAuth.session,
    course: courseAuth.course,
    entity: lesson,
  };
}

/**
 * Verifies contributor access to a resource and its parent course.
 */
export async function verifyContributorResourceAccess(
  resourceId: string,
  options: GuardOptions = { requireEditableStatus: true }
): Promise<ContributorAuthResult<Resource & { lesson: Lesson & { module: Module & { course: Course } } }>> {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: {
      lesson: {
        include: {
          module: {
            include: { course: true },
          },
        },
      },
    },
  });

  if (!resource || !resource.lesson || !resource.lesson.module || !resource.lesson.module.course) {
    return {
      success: false,
      status: 404,
      error: "Resource not found.",
      response: NextResponse.json({ error: "Resource not found." }, { status: 404 }),
    };
  }

  const courseAuth = await verifyContributorCourseAccess(resource.lesson.module.courseId, options);
  if (!courseAuth.success) {
    return courseAuth;
  }

  return {
    success: true,
    session: courseAuth.session,
    course: courseAuth.course,
    entity: resource,
  };
}

