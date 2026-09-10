import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseEditor } from "./course-editor";

interface EditCoursePageProps {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 0;

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const session = await getSession();

  if (!session || (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN")) {
    redirect("/login?redirect=/contributor");
  }

  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    include: {
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

  // Authorization check
  if (course.authorId !== session.userId && session.role !== "ADMIN") {
    redirect("/contributor");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <CourseEditor course={course} />
    </div>
  );
}
