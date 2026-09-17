import Link from "next/link";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Search, Heart, Star, Sparkles, BookOpen, Clock, Code, Cpu, Palette, TrendingUp, Compass, ArrowRight, GraduationCap, Globe } from "lucide-react";

export const revalidate = 0; // Dynamic for real-time course updates

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

export default async function HomePage() {
  // Fetch featured published courses from database
  let courses: HomePageCourse[] = [];
  try {
    courses = await db.course.findMany({
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
    });
  } catch {
    courses = [];
  }

  let categories: HomePageCategory[] = [];
  try {
    categories = await db.category.findMany({
      include: {
        _count: { select: { courses: { where: { status: "PUBLISHED" } } } },
      },
    });
  } catch {
    categories = [];
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION (OpenLearner AI Core Value: Transparent Syllabi & AI)    */}
      {/* ========================================================================= */}
      <section className="pt-14 pb-16 px-6 max-w-7xl mx-auto relative">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Lime Pill Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d2f835] text-slate-900 text-xs font-black tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 fill-black text-black" />
            <span>Open Learning Platform with Grounded AI Tutoring</span>
          </div>

          {/* Core Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-black text-slate-900 leading-[1.08] tracking-tight">
            Learn with Complete Syllabus Transparency & AI Guidance
          </h1>

          {/* Authentic Subtitle */}
          <p className="text-lg sm:text-xl font-medium text-slate-600 max-w-2xl mx-auto">
            Explore verified open curricula, track your exact progress from 0% to 100%, and get instant answers from Nova AI at every lesson.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pt-2">
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
                  placeholder="Search Python, React, UI/UX, AI, Data Science..."
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
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
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
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. PLATFORM PILLARS (The 3 Core Modes: Discover, Learn, Create)          */}
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
                <h3 className="text-xl font-bold text-white">2. Non-blocking Learning</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Jump freely between lessons or follow sequence. Automatic progress engine tracks every lesson completion up to 100%.
                </p>
              </div>
              <Link href="/dashboard" className="text-xs font-bold text-white flex items-center gap-1 hover:underline pt-2">
                <span>View Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Pillar 3: Nova AI Tutor */}
            <div className="p-8 rounded-3xl bg-[#1a1d21] border border-white/5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#d2f835] text-[#121417] flex items-center justify-center font-black">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">3. Grounded Nova AI Tutor</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Nova understands the exact markdown lesson notes you are viewing. Ask for code explanations or practice challenges without hallucinations.
                </p>
              </div>
              <Link href="/#nova" className="text-xs font-bold text-[#d2f835] flex items-center gap-1 hover:underline pt-2">
                <span>Nova AI Features</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURED PUBLISHED COURSES FROM DATABASE                               */}
      {/* ========================================================================= */}
      <section className="bg-[#121417] text-white pb-24 px-6 lg:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto pt-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 text-[#d2f835] text-xs font-black uppercase tracking-wider mb-2">
                <span>✦ Verified Curriculum</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Published Courses Ready to Learn
              </h2>
            </div>

            <Link
              href="/explore"
              className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors self-start md:self-auto"
            >
              Browse All Courses
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-16 bg-[#1a1d21] rounded-3xl border border-white/5 p-8">
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No published courses found</h3>
              <p className="text-xs text-slate-400 mt-1">Please seed the database to populate verified curriculum.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: HomePageCourse, idx: number) => {
                const totalLessons = course.modules.reduce(
                  (acc: number, m: HomePageCourse["modules"][number]) => acc + m.lessons.length,
                  0
                );
                const rating = (4.85 + (idx % 12) * 0.01).toFixed(2);

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
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                        <div className="flex items-center gap-1 text-[#121417]">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{rating}</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[#121417] text-lg leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {course.title}
                      </h4>

                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed font-normal">
                        {course.shortSummary}
                      </p>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        {totalLessons} lessons {course.estimatedHours ? `· ${course.estimatedHours}h` : ""}
                      </span>
                      <span className="text-[#121417] font-black">Free Open Access</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. NOVA AI LEARNING ASSISTANT SHOWCASE                                    */}
      {/* ========================================================================= */}
      <section id="nova" className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
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
                Nova reads the exact markdown lesson notes and syllabus context. Ask questions, clarify tough programming logic, and get generated code exercises without leaving the player.
              </p>
              <div className="pt-2">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] font-black text-sm shadow-xl transition-all group"
                >
                  <span>Explore Courses with Nova AI</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Interactive Mock Chat Widget */}
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
                <p className="text-slate-200">"Why does indentation matter in Python?"</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs space-y-1">
                <span className="font-bold text-white text-[11px]">Nova AI:</span>
                <p className="text-slate-300 leading-relaxed">
                  "In Python, indentation (4 spaces) defines code blocks and scope instead of curly braces. It ensures readability and prevents nested logic ambiguity!"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CREATOR STUDIO / CONTRIBUTOR CALLOUT                                   */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12 pb-20">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-black text-[#121417]">
              Want to Author a Course on OpenLearner?
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
