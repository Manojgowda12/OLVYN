import Link from "next/link";
import { db } from "@/lib/db";
import { BookOpen, Sparkles, CheckCircle2, ArrowRight, Code, Cpu, Palette, TrendingUp, Compass, Clock, Award, ShieldCheck } from "lucide-react";

export const revalidate = 0; // Dynamic for real-time course updates

export default async function HomePage() {
  // Fetch featured published courses
  const courses = await db.course.findMany({
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
  }).catch(() => []); // Graceful fallback if database has not migrated yet

  const categories = await db.category.findMany({
    include: {
      _count: { select: { courses: { where: { status: "PUBLISHED" } } } },
    },
    take: 6,
  }).catch(() => []);

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center">
        {/* Glow backdrop */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[350px] bg-blue-500/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="w-[400px] h-[250px] bg-violet-500/15 blur-[100px] rounded-full pointer-events-none" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300 mb-6 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Open Educational Platform • Fully Free & Legally Shareable</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          Master Any Skill with Structured Courses &{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
            AI-Powered Tutoring
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed">
          Discover vetted, transparent curriculum across programming, AI, business, and design. Complete lessons, track progress with zero lock-in, and ask <strong>Nova</strong> for help anytime.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
          >
            Explore Courses
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-base border border-slate-700 transition-all hover:scale-[1.02]"
          >
            Join as Learner
          </Link>
        </div>

        {/* Quick Demo Credentials Banner for Testing */}
        <div className="mt-12 w-full max-w-3xl p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Developer Test Credentials
            </span>
            <span className="text-xs text-slate-400">Database Seed Accounts</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
              <p className="font-semibold text-amber-400">Admin Account</p>
              <p className="font-mono text-[11px] text-slate-400 truncate">admin@openlearner.ai</p>
              <p className="font-mono text-[11px] text-slate-400">Admin123!</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
              <p className="font-semibold text-indigo-400">Contributor Account</p>
              <p className="font-mono text-[11px] text-slate-400 truncate">contributor@openlearner.ai</p>
              <p className="font-mono text-[11px] text-slate-400">Contributor123!</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
              <p className="font-semibold text-blue-400">Learner Account</p>
              <p className="font-mono text-[11px] text-slate-400 truncate">learner@openlearner.ai</p>
              <p className="font-mono text-[11px] text-slate-400">Learner123!</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">1. Discover</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Find exactly what you need with fast keyword search, category filters, difficulty sorting, and curated educational recommendations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">2. Learn</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Explore complete course structures with zero lock-in. Track your completed lessons, calculate completion percentage, and resume anytime.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">3. Understand</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nova AI acts as your personal learning assistant: explaining complex code, clarifying prerequisites, and providing tailored practice exercises.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Featured Courses</h2>
            <p className="text-slate-400 text-sm mt-1">Vetted and published open curriculum</p>
          </div>
          <Link
            href="/explore"
            className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Browse all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-12 p-8 rounded-2xl bg-slate-900/40 border border-slate-800">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No published courses available yet.</p>
            <p className="text-slate-500 text-sm mt-1">Run database seed to populate sample curriculum.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const totalLessons = course.modules.reduce(
                (acc, m) => acc + m.lessons.length,
                0
              );
              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden hover:border-slate-700 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                >
                  {course.thumbnailUrl && (
                    <div className="aspect-video w-full overflow-hidden bg-slate-950 relative">
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-950/80 backdrop-blur-md text-slate-200 border border-slate-800">
                        {course.difficulty}
                      </span>
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {course.category && (
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                          {course.category.name}
                        </p>
                      )}
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {course.shortSummary}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        {totalLessons} lessons
                      </span>
                      {course.estimatedHours && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {course.estimatedHours} hrs
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Explore by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/explore?category=${cat.slug}`}
              className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900 transition-all text-center group"
            >
              <p className="font-semibold text-sm text-slate-200 group-hover:text-blue-400 transition-colors">
                {cat.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">{cat._count.courses} courses</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
