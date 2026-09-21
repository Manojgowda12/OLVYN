import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorModuleAccess } from "@/lib/contributor-guard";
import { updateModuleSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: moduleId } = await params;

  // Verify authentication, role, ownership, and DRAFT/REJECTED course status
  const auth = await verifyContributorModuleAccess(moduleId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const result = updateModuleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid module data." },
        { status: 400 }
      );
    }

    const { title, description } = result.data;

    const updated = await db.module.update({
      where: { id: moduleId },
      data: {
        title,
        description: description || null,
      },
    });

    return NextResponse.json({ module: updated });
  } catch (error: any) {
    console.error("Module update error:", error);
    return NextResponse.json({ error: "Failed to update module." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: moduleId } = await params;

  // Verify authentication, role, ownership, and DRAFT/REJECTED course status
  const auth = await verifyContributorModuleAccess(moduleId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  const courseId = auth.course.id;

  try {
    await db.$transaction(async (tx) => {
      // 1. Delete module (Prisma cascades to lessons, resources, and documents)
      await tx.module.delete({
        where: { id: moduleId },
      });

      // 2. Fetch remaining modules in ascending orderIndex
      const remainingModules = await tx.module.findMany({
        where: { courseId },
        orderBy: { orderIndex: "asc" },
      });

      // 3. Collision-safe 2-pass re-indexing to maintain 1, 2, 3... sequence
      for (let i = 0; i < remainingModules.length; i++) {
        await tx.module.update({
          where: { id: remainingModules[i].id },
          data: { orderIndex: -(i + 1) },
        });
      }

      for (let i = 0; i < remainingModules.length; i++) {
        await tx.module.update({
          where: { id: remainingModules[i].id },
          data: { orderIndex: i + 1 },
        });
      }
    });

    return NextResponse.json({
      message: "Module and all nested lessons deleted successfully.",
      success: true,
    });
  } catch (error: any) {
    console.error("Module deletion error:", error);
    return NextResponse.json({ error: "Failed to delete module." }, { status: 500 });
  }
}
