import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateCourseForm } from "./create-course-form";

export const revalidate = 0;

export default async function NewCoursePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/contributor/courses/new");
  }

  if (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-6 lg:px-12 max-w-4xl mx-auto w-full text-slate-900">
      <div className="mb-8 pb-4 border-b border-slate-200">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-[#d2f835] text-xs font-black uppercase tracking-wider mb-2 shadow-xs">
          <span>Course Creation Wizard</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
          Start a New Open Course
        </h1>
        <p className="text-sm font-medium text-slate-600 mt-1">
          Configure initial curriculum details. You can structure modules and attach video lessons in the next step.
        </p>
      </div>

      <CreateCourseForm categories={categories} />
    </div>
  );
}
