import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateCourseForm } from "./create-course-form";

export const revalidate = 0;

export default async function NewCoursePage() {
  const session = await getSession();

  if (!session || (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN")) {
    redirect("/login?redirect=/contributor/courses/new");
  }

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
          Course Creation Wizard
        </span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
          Start a New Course
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Set up the core metadata for your course. Once created, you can add modules, lessons, and resources.
        </p>
      </div>

      <CreateCourseForm categories={categories} />
    </div>
  );
}
