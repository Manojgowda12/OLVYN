import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import {
  Search,
  Sparkles,
  BookOpen,
  Clock,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Layers,
  Compass,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 0; // Dynamic for real-time course and user progress updates

export const metadata: Metadata = {
  title: "OpenLearner AI — Open Learning Platform",
  description: "Learn with complete syllabus transparency and grounded Nova AI tutoring. Explore verified courses, track your learning progress, and build real skills.",
};

type HomePageCourse = Prisma.CourseGetPayload<{
  include: {
    category: true;
    author: { select: { name: true; avatarUrl: true } };
    modules: {
      include: {
        lessons: { select: { id: true; durationMinutes: true } };
      };
    };
  };
}>;

type HomePageCategory = Prisma.CategoryGetPayload<{
  include: {
    _count: { select: { courses: { where: { status: "PUBLISHED" } } } };
  };
}>;

type UserEnrollmentWithCourse = Prisma.EnrollmentGetPayload<{
  include: {
    course: {
      include: {
        category: true;
        modules: {
          orderBy: { orderIndex: "asc" };
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" };
              select: { id: true; slug: true; title: true };
            };
          };
        };
      };
    };
  };
}>;

export default async function HomePage() {
  // 1. Concurrently fetch session, featured courses, and categories in parallel
  const [session, courses, categories] = await Promise.all([
    getSession().catch(() => null),
    db.course
      .findMany({
        where: { status: "PUBLISHED" },
        include: {
          category: true,
          author: { select: { name: true, avatarUrl: true } },
          modules: {
            include: {
              lessons: { select: { id: true, durationMinutes: true } },
            },
          },
        },
        take: 6,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => [] as HomePageCourse[]),
    db.category
      .findMany({
        include: {
          _count: { select: { courses: { where: { status: "PUBLISHED" } } } },
        },
        orderBy: { name: "asc" },
      })
      .catch(() => [] as HomePageCategory[]),
  ]);

  // 3. For authenticated users, fetch personal enrollments and progress (strictly scoped to session.userId)
  let userEnrollments: UserEnrollmentWithCourse[] = [];
  const progressMap = new Map<string, { percentage: number; completedLessons: number; isCompleted: boolean }>();

  if (session?.userId) {
    try {
      userEnrollments = await db.enrollment.findMany({
        where: { userId: session.userId },
        take: 3,
        orderBy: { lastAccessedAt: "desc" },
        include: {
          course: {
            include: {
              category: true,
              modules: {
                orderBy: { orderIndex: "asc" },
                include: {
                  lessons: {
                    orderBy: { orderIndex: "asc" },
                    select: { id: true, slug: true, title: true },
                  },
                },
              },
            },
          },
        },
      });

      if (userEnrollments.length > 0) {
        const courseIds = userEnrollments.map((e) => e.courseId);
        const progressRecords = await db.courseProgress.findMany({
          where: {
            userId: session.userId,
            courseId: { in: courseIds },
          },
        });

        for (const prog of progressRecords) {
          progressMap.set(prog.courseId, {
            percentage: Math.round(prog.percentage),
            completedLessons: prog.completedLessons,
            isCompleted: prog.isCompleted,
          });
        }
      }
    } catch {
      userEnrollments = [];
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION (OpenLearnerAI Core Value: Learn Anything. Build Everything) */}
      {/* ========================================================================= */}
      <section className="pt-16 pb-16 px-6 max-w-7xl mx-auto relative">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d2f835] text-slate-900 text-xs font-black tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 fill-black text-black" />
            <span>OpenLearnerAI · Open Learning Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-black text-slate-900 leading-[1.08] tracking-tight">
            Learn anything. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
              Build everything.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-xl font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Explore verified open curricula with complete syllabus transparency, track your linear progress, and get instant, grounded guidance from Nova AI at every lesson.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/explore"
              className="px-8 py-3.5 rounded-full bg-slate-900 hover:bg-black text-white font-extrabold text-sm flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all"
            >
              <Compass className="w-4 h-4 text-[#d2f835]" />
              <span>Explore Courses</span>
            </Link>

            <Link
              href="/nova"
              className="px-8 py-3.5 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm flex items-center gap-2 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-slate-900" />
              <span>Ask Nova AI</span>
            </Link>
          </div>

          {/* Integrated Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <form
              method="GET"
              action="/explore"
              className="p-2 bg-white rounded-full border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:border-slate-300 transition-all flex items-center justify-between gap-3"
              suppressHydrationWarning
            >
              <div className="flex-1 flex items-center pl-4 gap-3">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  name="q"
                  placeholder="Search Python, Product Management, Machine Learning, Data Science..."
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none py-2 font-medium"
                  suppressHydrationWarning
                />
              </div>

              <button
                type="submit"
                className="bg-[#d2f835] hover:bg-[#c4ec23] active:scale-[0.98] text-slate-900 font-black text-sm px-7 py-3 rounded-full flex items-center gap-2 transition-all flex-shrink-0 shadow-xs cursor-pointer"
                suppressHydrationWarning
              >
                <span>Search</span>
              </button>
            </form>
          </div>

          {/* Category Chips Preview */}
          {categories.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-500">Domains:</span>
              {categories.map((cat: HomePageCategory) => (
                <Link
                  key={cat.id}
                  href={`/explore?category=${cat.slug}`}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-800 hover:text-slate-950 transition-colors shadow-2xs"
                >
                  {cat.name} ({cat._count.courses})
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. AUTHENTICATED LEARNER EXPERIENCE — CONTINUE LEARNING                   */}
      {/* ========================================================================= */}
      {session && (
        <section className="bg-white border-y border-slate-200/80 py-14 px-6 lg:px-12 relative shadow-xs">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  <GraduationCap className="w-4 h-4 text-slate-800" />
                  <span>Your Learning Workspace</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Welcome back, {session.name.split(" ")[0]}
                </h2>
              </div>

              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline self-start sm:self-auto"
              >
                <span>Go to full dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {userEnrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {userEnrollments.map(({ course }) => {
                  const prog = progressMap.get(course.id);
                  const percentage = prog ? prog.percentage : 0;
                  const completedLessons = prog ? prog.completedLessons : 0;
                  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
                  const isDone = percentage >= 100;

                  const firstLesson = course.modules[0]?.lessons[0];
                  const resumeUrl = firstLesson
                    ? `/learn/${course.slug}/${firstLesson.slug}`
                    : `/courses/${course.slug}`;

                  return (
                    <div
                      key={course.id}
                      className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                          <span className="text-slate-800 uppercase tracking-wider">
                            {course.category?.name || "General"}
                          </span>
                          {isDone ? (
                            <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Complete
                            </span>
                          ) : (
                            <span className="font-extrabold text-slate-900">{percentage}%</span>
                          )}
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 leading-snug line-clamp-2 mb-2">
                          {course.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {course.shortSummary}
                        </p>
                      </div>

                      <div className="pt-5 mt-5 border-t border-slate-200/80 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
                            <span>{completedLessons} of {totalLessons} lessons completed</span>
                            <span className="font-bold text-slate-900">{percentage}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isDone ? "bg-emerald-500" : "bg-slate-900"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        <Link
                          href={resumeUrl}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                            isDone
                              ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                              : "bg-slate-900 hover:bg-black text-[#d2f835] shadow-xs"
                          }`}
                        >
                          <span>{isDone ? "Review Course" : "Continue Learning"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/90 text-center max-w-xl mx-auto space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">Start Your Learning Journey</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You haven&apos;t enrolled in any courses yet. Choose a topic below to inspect the syllabus and begin learning.
                </p>
                <div className="pt-2">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs transition-all shadow-xs"
                  >
                    <span>Browse Catalog</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. PLATFORM PILLARS (How OpenLearner Works)                               */}
      {/* ========================================================================= */}
      <section className="bg-slate-950 text-white py-20 px-6 lg:px-12 relative border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <div className="text-[#d2f835] text-xs font-black uppercase tracking-widest">
              How OpenLearner Works
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Built for Serious Learners & Open Educators
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              An open-source ecosystem designed for linear progression, lesson note transparency, and contextual AI support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Transparent Syllabi */}
            <div className="p-8 rounded-3xl bg-[#1a1d21] border border-white/5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#d2f835] text-[#121417] flex items-center justify-center font-black">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">1. Full Syllabus Transparency</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Inspect every module, topic, and estimated lesson duration before you enroll. No paywalls or hidden curricula.
                </p>
              </div>
              <Link href="/explore" className="text-xs font-bold text-[#d2f835] flex items-center gap-1 hover:underline pt-2">
                <span>Explore Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Pillar 2: Non-blocking Player */}
            <div className="p-8 rounded-3xl bg-[#1a1d21] border border-white/5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white text-[#121417] flex items-center justify-center font-black">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">2. Non-blocking Progression</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Jump freely between lessons or follow chronological sequence. The progress engine tracks lesson completions up to 100%.
                </p>
              </div>
              <Link href="/explore" className="text-xs font-bold text-white flex items-center gap-1 hover:underline pt-2">
                <span>Browse Lessons</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Pillar 3: Grounded Nova AI Tutor */}
            <div className="p-8 rounded-3xl bg-[#1a1d21] border border-white/5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#d2f835] text-[#121417] flex items-center justify-center font-black">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">3. Grounded Nova AI Tutor</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Nova understands the exact markdown lesson notes and curriculum context. Ask for code explanations or concept clarity without hallucinations.
                </p>
              </div>
              <Link href="/nova" className="text-xs font-bold text-[#d2f835] flex items-center gap-1 hover:underline pt-2">
                <span>Try Nova AI</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. COURSE DISCOVERY — PUBLISHED COURSES FROM DATABASE                     */}
      {/* ========================================================================= */}
      <section className="bg-[#121417] text-white py-20 px-6 lg:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 text-[#d2f835] text-xs font-black uppercase tracking-wider mb-2">
                <span>✦ Verified Curriculum</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Explore Published Courses
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Authored by contributors and verified for transparent learning.
              </p>
            </div>

            <Link
              href="/explore"
              className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors self-start md:self-auto flex items-center gap-1.5"
            >
              <span>Browse All Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-16 bg-[#1a1d21] rounded-3xl border border-white/5 p-8 max-w-md mx-auto">
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No published courses yet</h3>
              <p className="text-xs text-slate-400 mt-1">Courses are being added. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: HomePageCourse) => {
                const totalLessons = course.modules.reduce(
                  (acc: number, m: HomePageCourse["modules"][number]) => acc + m.lessons.length,
                  0
                );

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="group p-5 rounded-3xl bg-white text-[#121417] shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Thumbnail plate */}
                      <div className="relative aspect-16/10 w-full rounded-2xl overflow-hidden bg-slate-100 mb-4">
                        {course.thumbnailUrl ? (
                          <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <BookOpen className="w-10 h-10 text-slate-300" />
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#121417] text-[#d2f835]">
                            {course.difficulty ? course.difficulty.replace("_", " ") : "ALL LEVELS"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                        <span className="text-emerald-700 font-bold">{course.category?.name || "Open Studies"}</span>
                        <span className="text-slate-500 font-medium">By {course.author.name}</span>
                      </div>

                      <h4 className="font-bold text-[#121417] text-lg leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {course.title}
                      </h4>

                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed font-normal">
                        {course.shortSummary}
                      </p>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1 text-slate-600">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        {totalLessons} lessons {course.estimatedHours ? `· ${course.estimatedHours}h` : ""}
                      </span>
                      <span className="text-slate-900 font-black bg-[#d2f835] px-2 py-0.5 rounded-full text-[11px]">
                        Free Access
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. BROWSE BY CATEGORY SECTION (#categories Anchor)                       */}
      {/* ========================================================================= */}
      <section id="categories" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <Layers className="w-4 h-4 text-slate-800" />
              <span>Curriculum Domains</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Browse by Category
            </h2>
          </div>

          <Link
            href="/explore"
            className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View all courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center max-w-md mx-auto">
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Categories will appear as curriculum is populated.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((cat: HomePageCategory) => (
              <Link
                key={cat.id}
                href={`/explore?category=${cat.slug}`}
                className="group p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 group-hover:bg-[#d2f835] text-slate-900 flex items-center justify-center font-black mb-4 transition-colors">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-slate-950 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {cat.description || "Curated learning paths and transparent lesson syllabi."}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="text-slate-500">{cat._count.courses} {cat._count.courses === 1 ? "course" : "courses"}</span>
                  <span className="text-slate-900 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>Explore</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6. NOVA AI LEARNING ASSISTANT SHOWCASE                                    */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12 pb-20">
        <div className="p-8 sm:p-14 rounded-3xl bg-[#d2f835] text-[#121417] relative overflow-hidden shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#121417] text-[#d2f835] text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nova AI Tutor Architecture</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#121417] leading-tight">
                Context-aware tutoring for every lesson in your syllabus.
              </h2>
              <p className="text-base sm:text-lg font-semibold text-[#121417]/80 leading-relaxed max-w-xl">
                Nova reads the exact markdown lesson notes and syllabus context. Ask questions, clarify difficult programming logic, and get grounded answers with verified course citations.
              </p>
              <div className="pt-2">
                <Link
                  href="/nova"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] font-black text-sm shadow-xl transition-all group"
                >
                  <span>Ask Nova AI</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Interactive Demonstration Chat Box */}
            <div className="lg:col-span-5 bg-[#121417] text-white p-5 rounded-2xl shadow-2xl border border-black/20 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-[#d2f835]" />
                  <span>Nova Lesson Assistant</span>
                </div>
                <span className="text-[10px] font-black uppercase bg-[#d2f835] text-black px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              <div className="bg-[#1a1d21] p-3 rounded-xl text-xs space-y-1">
                <span className="font-bold text-[#d2f835] text-[11px]">Learner Question:</span>
                <p className="text-slate-200">&quot;Why does indentation matter in Python?&quot;</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs space-y-1">
                <span className="font-bold text-white text-[11px]">Nova AI:</span>
                <p className="text-slate-300 leading-relaxed">
                  &quot;In Python, indentation (4 spaces) defines code blocks and scope instead of curly braces. It ensures readability and prevents nested logic ambiguity!&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CREATOR STUDIO / CONTRIBUTOR CALLOUT                                   */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-24">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-black text-[#121417]">
              Want to Author an Open Course?
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Educators and engineers can build rich curricula with modules, markdown notes, and video embeds in the Creator Studio. Courses undergo transparent editorial review before going live.
            </p>
          </div>
          <Link
            href="/contributor"
            className="px-8 py-4 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] font-black text-sm transition-all whitespace-nowrap shadow-md"
          >
            Open Creator Studio
          </Link>
        </div>
      </section>
    </div>
  );
}
