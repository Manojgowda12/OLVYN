import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReviewInspector } from "./review-inspector";

interface ReviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 0;

export default async function ReviewPage({ params }: ReviewPageProps) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login?redirect=/admin");
  }

  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, email: true } },
      category: { select: { name: true } },
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <ReviewInspector course={course} />
    </div>
  );
}
