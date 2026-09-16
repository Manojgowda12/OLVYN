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
  ExternalLink,
  Sparkles
} from "lucide-react";

export const revalidate = 0;

export default async function ContributorDashboard() {
  const session = await getSession();

  if (!session) {
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
    <div className="min-h-screen bg-[#f6f8f5] py-10 px-6 lg:px-12 max-w-7xl mx-auto w-full text-[#121417]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#121417] text-[#d2f835] text-xs font-black uppercase tracking-wider mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#d2f835]" />
            <span>Open Creator Studio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#121417] tracking-tight">
            Curriculum Authoring & Management
          </h1>
          <p className="text-sm sm:text-base font-medium text-[#475467] mt-1.5 max-w-xl">
            Author open curricula, attach video lessons, and submit your syllabus for editorial review.
          </p>
        </div>

        <Link
          href="/contributor/courses/new"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] text-xs font-black shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Course</span>
        </Link>
      </div>

      {/* Overview Stats (4-grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-12">
        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Drafts</p>
          <p className="text-3xl font-black text-[#121417] mt-1">{drafts.length}</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">In Review</p>
          <p className="text-3xl font-black text-[#121417] mt-1">{pending.length}</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Published</p>
          <p className="text-3xl font-black text-[#121417] mt-1">{published.length}</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Revisions</p>
          <p className="text-3xl font-black text-[#121417] mt-1">{rejected.length}</p>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-5">
        <h2 className="text-2xl font-black text-[#121417] tracking-tight">Your Authored Courses</h2>

        {courses.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-3xl bg-white border border-black/10 shadow-xs">
            <PenTool className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#121417]">No courses authored yet</h3>
            <p className="text-sm font-medium text-slate-500 mt-1 max-w-sm mx-auto">
              Start building your first open educational course and submit for review.
            </p>
            <Link
              href="/contributor/courses/new"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] text-xs font-black transition-colors"
            >
              <Plus className="w-4 h-4" /> Start First Course
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => {
              const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

              const statusBadge = {
                DRAFT: (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Draft
                  </span>
                ),
                PENDING_REVIEW: (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Awaiting Admin Approval
                  </span>
                ),
                PUBLISHED: (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Live & Published
                  </span>
                ),
                REJECTED: (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Revision Requested
                  </span>
                ),
              }[course.status as "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED"];

              return (
                <div
                  key={course.id}
                  className="p-6 sm:p-7 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge}
                        {course.category && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {course.category.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-[#121417] leading-snug">{course.title}</h3>
                      <p className="text-xs font-medium text-slate-500">
                        {course.modules.length} modules • {totalLessons} lessons • Difficulty: {course.difficulty.replace("_", " ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                      {course.status === "PUBLISHED" && (
                        <Link
                          href={`/courses/${course.slug}`}
                          className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#121417] transition-colors flex items-center gap-1.5"
                        >
                          <span>View Live</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      <Link
                        href={`/contributor/courses/${course.id}/edit`}
                        className="px-5 py-2.5 rounded-full bg-[#121417] hover:bg-black text-xs font-black text-[#d2f835] shadow-md transition-all flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Edit Course</span>
                      </Link>
                    </div>
                  </div>

                  {/* Rejection Notice & Feedback Banner */}
                  {course.status === "REJECTED" && course.rejectionReason && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1 mt-1">
                      <p className="font-bold flex items-center gap-1.5 text-rose-700">
                        <AlertTriangle className="w-4 h-4 text-rose-600" /> Editorial Revision Feedback from Admin:
                      </p>
                      <p className="pl-5 text-rose-800 font-medium italic">&ldquo;{course.rejectionReason}&rdquo;</p>
                      <p className="pl-5 text-[11px] text-rose-600">
                        Please update your course structure or lesson videos in the editor and click &ldquo;Submit for Review&rdquo; again.
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

