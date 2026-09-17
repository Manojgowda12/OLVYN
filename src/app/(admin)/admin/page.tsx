import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ShieldAlert,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles
} from "lucide-react";

export const revalidate = 0;

export default async function AdminDashboard() {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login?redirect=/admin");
  }

  const [totalUsers, totalPublished, pendingCourses, recentCourses] = await Promise.all([
    db.user.count(),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.course.findMany({
      where: { status: "PENDING_REVIEW" },
      include: {
        author: { select: { name: true, email: true } },
        category: true,
        modules: {
          include: { lessons: { select: { id: true } } },
        },
      },
      orderBy: { updatedAt: "asc" },
    }),
    db.course.findMany({
      include: {
        author: { select: { name: true } },
        category: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-6 lg:px-12 max-w-7xl mx-auto w-full text-slate-900">
      {/* Header Banner */}
      <div className="mb-10 pb-6 border-b border-slate-200">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-[#d2f835] text-xs font-black uppercase tracking-wider mb-3 shadow-xs">
          <ShieldAlert className="w-3.5 h-3.5 text-[#d2f835]" />
          <span>Editorial Administration Console</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Curriculum Moderation & Admin
        </h1>
        <p className="text-sm sm:text-base font-medium text-slate-600 mt-1.5 max-w-2xl">
          Review open learner video submissions, enforce syllabus depth standards, and manage published platform courses.
        </p>
      </div>

      {/* KPI Cards (3-grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {/* Pending Queue */}
        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-5 hover:-translate-y-0.5 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Review Queue</p>
            <p className="text-3xl font-black text-[#121417] mt-0.5">{pendingCourses.length}</p>
          </div>
        </div>

        {/* Published Courses */}
        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-5 hover:-translate-y-0.5 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-[#121417] text-[#d2f835] flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Courses</p>
            <p className="text-3xl font-black text-[#121417] mt-0.5">{totalPublished}</p>
          </div>
        </div>

        {/* Total Users */}
        <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-5 hover:-translate-y-0.5 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Users</p>
            <p className="text-3xl font-black text-[#121417] mt-0.5">{totalUsers}</p>
          </div>
        </div>
      </div>

      {/* Pending Review Queue Section */}
      <div className="space-y-5 mb-14">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-[#121417] tracking-tight">
                Courses Pending Editorial Review
              </h2>
              {pendingCourses.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#d2f835] text-[#121417] shadow-xs">
                  {pendingCourses.length} Action Needed
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-[#475467] mt-1">
              Inspect video lessons, test links, and either publish to the open catalog or provide revision notes.
            </p>
          </div>
        </div>

        {pendingCourses.length === 0 ? (
          <div className="text-center py-14 p-8 rounded-3xl bg-white border border-black/10 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#121417]">Review Queue is Clear</h3>
            <p className="text-xs text-slate-500 mt-1">All submitted curriculum and video requests have been processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCourses.map((course) => {
              const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

              return (
                <div
                  key={course.id}
                  className="p-6 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Pending Admin Review
                      </span>
                      {course.category && (
                        <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {course.category.name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-[#121417] leading-snug">{course.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Author: <strong className="text-[#121417]">{course.author.name}</strong> ({course.author.email}) •{" "}
                      {course.modules.length} Modules • {totalLessons} Lessons
                    </p>
                  </div>

                  <Link
                    href={`/admin/reviews/${course.id}`}
                    className="px-6 py-3.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] font-black text-xs shadow-md flex items-center gap-2 self-start sm:self-auto transition-all active:scale-[0.98]"
                  >
                    <span>Inspect & Review</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Platform Courses Directory */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-[#121417] tracking-tight">All Platform Courses</h2>
        <div className="rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#121417]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4 pl-6">Title</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 pl-6 font-bold text-[#121417] text-sm">{c.title}</td>
                    <td className="p-4 font-medium text-slate-600">{c.author.name}</td>
                    <td className="p-4 font-medium text-slate-600">{c.category?.name || "Unassigned"}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          c.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : c.status === "PENDING_REVIEW"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : c.status === "REJECTED"
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Link
                        href={`/admin/reviews/${c.id}`}
                        className="font-bold text-[#121417] hover:underline"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

