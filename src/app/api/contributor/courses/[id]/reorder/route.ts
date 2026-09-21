import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorCourseAccess } from "@/lib/contributor-guard";
import { reorderSchema } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  // 1. Verify contributor access (role, ownership, DRAFT/REJECTED status)
  const auth = await verifyContributorCourseAccess(courseId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  try {
    const body = await req.json();
    const result = reorderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid reorder payload." },
        { status: 400 }
      );
    }

    const { type, moduleId, orderedIds } = result.data;

    // Check for duplicates in client payload
    const uniqueIds = new Set(orderedIds);
    if (uniqueIds.size !== orderedIds.length) {
      return NextResponse.json(
        { error: "Duplicate IDs detected in reorder list." },
        { status: 400 }
      );
    }

    if (type === "MODULES") {
      // Fetch all existing modules for this course
      const existingModules = await db.module.findMany({
        where: { courseId },
        select: { id: true },
      });

      const existingIdSet = new Set(existingModules.map((m) => m.id));

      if (orderedIds.length !== existingModules.length || !orderedIds.every((id) => existingIdSet.has(id))) {
        return NextResponse.json(
          { error: "Provided module IDs do not match the complete set of modules for this course." },
          { status: 400 }
        );
      }

      // Execute collision-safe 2-pass update inside a transaction
      await db.$transaction(async (tx) => {
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.module.update({
            where: { id: orderedIds[i] },
            data: { orderIndex: -(i + 1) },
          });
        }

        for (let i = 0; i < orderedIds.length; i++) {
          await tx.module.update({
            where: { id: orderedIds[i] },
            data: { orderIndex: i + 1 },
          });
        }
      });

      return NextResponse.json({
        message: "Modules reordered successfully.",
        success: true,
      });
    }

    if (type === "LESSONS") {
      if (!moduleId) {
        return NextResponse.json(
          { error: "moduleId is required when reordering lessons." },
          { status: 400 }
        );
      }

      // Verify module belongs to this course
      const targetModule = await db.module.findFirst({
        where: { id: moduleId, courseId },
      });

      if (!targetModule) {
        return NextResponse.json(
          { error: "Module not found in this course." },
          { status: 404 }
        );
      }

      const existingLessons = await db.lesson.findMany({
        where: { moduleId },
        select: { id: true },
      });

      const existingIdSet = new Set(existingLessons.map((l) => l.id));

      if (orderedIds.length !== existingLessons.length || !orderedIds.every((id) => existingIdSet.has(id))) {
        return NextResponse.json(
          { error: "Provided lesson IDs do not match the complete set of lessons for this module." },
          { status: 400 }
        );
      }

      // Execute collision-safe 2-pass update inside a transaction
      await db.$transaction(async (tx) => {
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.lesson.update({
            where: { id: orderedIds[i] },
            data: { orderIndex: -(i + 1) },
          });
        }

        for (let i = 0; i < orderedIds.length; i++) {
          await tx.lesson.update({
            where: { id: orderedIds[i] },
            data: { orderIndex: i + 1 },
          });
        }
      });

      return NextResponse.json({
        message: "Lessons reordered successfully.",
        success: true,
      });
    }

    return NextResponse.json({ error: "Invalid reorder type." }, { status: 400 });
  } catch (error: any) {
    console.error("Reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder curriculum items." }, { status: 500 });
  }
}
