import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyContributorCourseAccess } from "@/lib/contributor-guard";
import { moduleSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  // Verify authentication, ownership, and DRAFT/REJECTED status
  const auth = await verifyContributorCourseAccess(courseId, { requireEditableStatus: true });
  if (!auth.success) {
    return auth.response;
  }


  try {
    const body = await req.json();
    const result = moduleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid module data." },
        { status: 400 }
      );
    }

    const { title, description, orderIndex } = result.data;

    // Check if requested orderIndex already exists; if so, assign next highest orderIndex
    let finalOrderIndex = orderIndex;
    const existingWithIndex = await db.module.findUnique({
      where: {
        courseId_orderIndex: {
          courseId,
          orderIndex: finalOrderIndex,
        },
      },
    });

    if (existingWithIndex) {
      const maxAgg = await db.module.aggregate({
        where: { courseId },
        _max: { orderIndex: true },
      });
      finalOrderIndex = (maxAgg._max.orderIndex || 0) + 1;
    }

    const moduleItem = await db.module.create({
      data: {
        courseId,
        title,
        description: description || null,
        orderIndex: finalOrderIndex,
      },
    });

    return NextResponse.json({ module: moduleItem }, { status: 201 });
  } catch (error: any) {
    console.error("Module creation error:", error);
    return NextResponse.json({ error: "Failed to create module." }, { status: 500 });
  }
}
