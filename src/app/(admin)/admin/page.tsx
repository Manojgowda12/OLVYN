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
  ExternalLink
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> Editorial Administration
        </span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
          Admin Console
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review submitted courses, enforce educational quality standards, and manage published curriculum.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Pending Review Queue</p>
            <p className="text-2xl font-bold text-white mt-0.5">{pendingCourses.length}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Published Courses</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalPublished}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Registered Users</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalUsers}</p>
          </div>
        </div>
      </div>

      {/* Pending Review Queue Section */}
      <div className="space-y-4 mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Courses Pending Editorial Review</span>
              {pendingCourses.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {pendingCourses.length} Action Needed
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect curriculum content, check resources, and either approve for public catalog or provide rejection feedback.
            </p>
          </div>
        </div>

        {pendingCourses.length === 0 ? (
          <div className="text-center py-12 p-8 rounded-2xl bg-slate-900/40 border border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-white">Review queue is empty</h3>
            <p className="text-xs text-slate-400 mt-1">All submitted curriculum has been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
            {pendingCourses.map((course) => {
              const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

              return (
                <div
                  key={course.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Awaiting Review
                      </span>
                      {course.category && (
                        <span className="text-xs text-blue-400 font-medium">
                          {course.category.name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white">{course.title}</h3>
                    <p className="text-xs text-slate-400">
                      Author: <span className="text-slate-300 font-medium">{course.author.name}</span> ({course.author.email}) •{" "}
                      {course.modules.length} Modules • {totalLessons} Lessons
                    </p>
                  </div>

                  <Link
                    href={`/admin/reviews/${course.id}`}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-500/20 flex items-center gap-1.5 self-start sm:self-auto transition-all"
                  >
                    Inspect & Review <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Platform Courses Directory */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">All Platform Courses</h2>
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">Title</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {recentCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-medium text-white">{c.title}</td>
                    <td className="p-4">{c.author.name}</td>
                    <td className="p-4 text-blue-400">{c.category?.name || "Unassigned"}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : c.status === "PENDING_REVIEW"
                            ? "bg-amber-500/10 text-amber-400"
                            : c.status === "REJECTED"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link
                        href={`/admin/reviews/${c.id}`}
                        className="text-blue-400 hover:text-blue-300 font-semibold"
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
