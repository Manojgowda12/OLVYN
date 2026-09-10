import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PenTool,
  Plus,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  ArrowRight,
  ExternalLink
} from "lucide-react";

export const revalidate = 0;

export default async function ContributorDashboard() {
  const session = await getSession();

  if (!session || (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN")) {
    redirect("/login?redirect=/contributor");
  }

  const courses = await db.course.findMany({
    where: { authorId: session.userId },
    include: {
      category: true,
      modules: {
        include: { lessons: { select: { id: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const drafts = courses.filter((c) => c.status === "DRAFT");
  const pending = courses.filter((c) => c.status === "PENDING_REVIEW");
  const published = courses.filter((c) => c.status === "PUBLISHED");
  const rejected = courses.filter((c) => c.status === "REJECTED");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Creator Studio
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Course Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Author and structure your courses, add modules & lessons, and submit for editorial review.
          </p>
        </div>

        <Link
          href="/contributor/courses/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Course
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-slate-400 font-medium">Drafts</p>
          <p className="text-2xl font-bold text-white mt-1">{drafts.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-amber-400 font-medium">Pending Review</p>
          <p className="text-2xl font-bold text-white mt-1">{pending.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-emerald-400 font-medium">Published</p>
          <p className="text-2xl font-bold text-white mt-1">{published.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-red-400 font-medium">Needs Revisions</p>
          <p className="text-2xl font-bold text-white mt-1">{rejected.length}</p>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white mb-4">Your Authored Courses</h2>

        {courses.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl bg-slate-900/30 border border-slate-800">
            <PenTool className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No courses created yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Start building your first open educational course and share your expertise with the world.
            </p>
            <Link
              href="/contributor/courses/new"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Start First Course
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
            {courses.map((course) => {
              const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

              const statusBadge = {
                DRAFT: (
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    Draft
                  </span>
                ),
                PENDING_REVIEW: (
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> In Review
                  </span>
                ),
                PUBLISHED: (
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Published
                  </span>
                ),
                REJECTED: (
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Revision Needed
                  </span>
                ),
              }[course.status as "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED"];

              return (
                <div key={course.id} className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {statusBadge}
                        {course.category && (
                          <span className="text-xs text-blue-400 font-medium">
                            {course.category.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white">{course.title}</h3>
                      <p className="text-xs text-slate-400">
                        {course.modules.length} modules • {totalLessons} lessons • Difficulty: {course.difficulty}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {course.status === "PUBLISHED" && (
                        <Link
                          href={`/courses/${course.slug}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1"
                        >
                          View Live <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}

                      <Link
                        href={`/contributor/courses/${course.id}/edit`}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        Course Studio
                      </Link>
                    </div>
                  </div>

                  {/* Rejection Notice & Feedback Banner */}
                  {course.status === "REJECTED" && course.rejectionReason && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-red-400">
                        <AlertTriangle className="w-4 h-4" /> Editorial Feedback from Reviewer:
                      </p>
                      <p className="pl-5 text-slate-300 italic">&ldquo;{course.rejectionReason}&rdquo;</p>
                      <p className="pl-5 text-[11px] text-slate-400">
                        Please update your course structure or content in the Course Studio and resubmit for review.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
