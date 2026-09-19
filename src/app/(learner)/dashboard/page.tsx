import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookOpen, Award, CheckCircle2, ArrowRight, Clock, Sparkles } from "lucide-react";

export const revalidate = 0;

export default async function LearnerDashboard() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  // Fetch enrollments with course details and user progress
  const enrollments = await db.enrollment.findMany({
    where: { userId: session.userId },
    include: {
      course: {
        include: {
          category: true,
          modules: {
            orderBy: { orderIndex: "asc" },
            include: {
              lessons: {
                orderBy: { orderIndex: "asc" },
                select: { id: true, slug: true },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const progressRecords = await db.courseProgress.findMany({
    where: { userId: session.userId },
  });

  const progressMap = new Map(progressRecords.map((p) => [p.courseId, p]));

  const completedCoursesCount = progressRecords.filter((p) => p.isCompleted).length;
  const inProgressCoursesCount = enrollments.length - completedCoursesCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Learner Workspace
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Welcome, {session.name}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your ongoing curriculum, resume lessons, and celebrate your completed courses.
          </p>
        </div>

        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all self-start md:self-auto"
        >
          Browse More Courses
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Enrolled Courses</p>
            <p className="text-2xl font-bold text-white mt-0.5">{enrollments.length}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">In Progress</p>
            <p className="text-2xl font-bold text-white mt-0.5">{inProgressCoursesCount}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Completed Courses</p>
            <p className="text-2xl font-bold text-white mt-0.5">{completedCoursesCount}</p>
          </div>
        </div>
      </div>

      {/* Enrolled Courses */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Your Courses</h2>

        {enrollments.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl bg-slate-900/30 border border-slate-800">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No enrolled courses yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Explore our free course catalog and enroll in your first skill to start learning.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              Explore Catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map(({ course }) => {
              const prog = progressMap.get(course.id);
              const percentage = prog ? Math.round(prog.percentage) : 0;
              const completedLessons = prog ? prog.completedLessons : 0;
              const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
              const isDone = percentage >= 100;

              const firstLesson = course.modules[0]?.lessons[0];

              return (
                <div
                  key={course.id}
                  className="flex flex-col rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden hover:border-slate-700 transition-all shadow-lg shadow-black/20"
                >
                  {course.thumbnailUrl && (
                    <div className="aspect-video w-full overflow-hidden bg-slate-950 relative">
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      {isDone ? (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/90 text-white flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-950/80 backdrop-blur-md text-blue-400 border border-slate-800">
                          {percentage}% Done
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {course.category && (
                        <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
                          {course.category.name}
                        </p>
                      )}
                      <h3 className="font-bold text-lg text-white line-clamp-1">{course.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{course.shortSummary}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                          <span>
                            {completedLessons} of {totalLessons} lessons
                          </span>
                          <span className="font-semibold text-white">{percentage}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isDone ? "bg-emerald-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <Link
                        href={firstLesson ? `/learn/${course.slug}/${firstLesson.slug}` : `/courses/${course.slug}`}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          isDone
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
                        }`}
                      >
                        {isDone ? "Review Course" : "Continue Learning"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
