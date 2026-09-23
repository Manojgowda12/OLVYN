import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import {
  BookOpen,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  Layers,
  Compass,
  Zap,
  Target,
} from "lucide-react";
import type { Metadata } from "next";
import { getCachedCategories } from "@/modules/courses/course.service";

import {
  KnowledgeGlobeClient,
  NovaOrbitalClient,
  WireframeGlobeClient,
} from "@/components/home/client-wrappers";
import { ScrollNav } from "@/components/home/scroll-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "OLVYN — Open Learning Platform",
  description:
    "Access high-quality learning experiences, learn at your own pace, build real skills, and use AI guidance when you need it.",
};

/* ─── PRISMA TYPES ─────────────────────────────────────────────────── */
type HomePageCourse = Prisma.CourseGetPayload<{
  include: {
    category: true;
    author: { select: { name: true; avatarUrl: true } };
    modules: {
      include: { lessons: { select: { id: true; durationMinutes: true } } };
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

/* ─── FEATURE PILLARS DATA ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: BookOpen,
    title: "Structured Learning",
    body: "Complete courses with guided lessons, clear module progression, and full syllabus transparency before you enroll.",
    accent: "var(--blue-bright)",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Guidance",
    body: "Learn with Nova AI — grounded in your exact lesson notes, curriculum context, and course materials.",
    accent: "var(--cyan)",
  },
  {
    icon: Zap,
    title: "Project-Based Learning",
    body: "Turn knowledge into practical skills through applied projects and real-world learning paths.",
    accent: "var(--violet)",
  },
  {
    icon: Target,
    title: "Open Knowledge",
    body: "Learn from accessible educational resources with no paywalls, no hidden curricula, and zero barriers.",
    accent: "#10b981",
  },
] as const;

/* ─── PAGE ─────────────────────────────────────────────────────────── */
export default async function HomePage() {
  // 1. Concurrent fetch
  const [session, courses, categories] = await Promise.all([
    getSession().catch(() => null),
    db.course
      .findMany({
        where: { status: "PUBLISHED" },
        include: {
          category: true,
          author: { select: { name: true, avatarUrl: true } },
          modules: {
            include: { lessons: { select: { id: true, durationMinutes: true } } },
          },
        },
        take: 6,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => [] as HomePageCourse[]),
    getCachedCategories().catch(() => [] as HomePageCategory[]),
  ]);

  // 2. Authenticated user data
  let userEnrollments: UserEnrollmentWithCourse[] = [];
  const progressMap = new Map<string, { percentage: number; completedLessons: number; isCompleted: boolean }>();

  if (session?.userId) {
    try {
      const [enrollments, progressRecords] = await Promise.all([
        db.enrollment.findMany({
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
        }),
        db.courseProgress.findMany({ where: { userId: session.userId } }),
      ]);

      userEnrollments = enrollments;
      for (const prog of progressRecords) {
        progressMap.set(prog.courseId, {
          percentage: Math.round(prog.percentage),
          completedLessons: prog.completedLessons,
          isCompleted: prog.isCompleted,
        });
      }
    } catch {
      userEnrollments = [];
    }
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Background celestial aurora lighting */}
      <div className="aurora-1" style={{ top: "-100px", left: "15%" }} />
      <div className="aurora-2" style={{ top: "300px", right: "5%" }} />

      {/* Scroll observer for navbar background transition */}
      <ScrollNav />

      {/* ================================================================
          §1  HERO
          ================================================================ */}
      <section
        className="relative min-h-[92vh] flex items-center"
        style={{ paddingTop: "24px" }}
      >
        {/* Fine dot grid background with subtle radial mask */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(37,99,235,0.14) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full py-16 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* LEFT — copy */}
            <div className="space-y-8 lg:pr-6">
              {/* Eyebrow */}
              <div
                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                style={{
                  background: "rgba(6, 182, 212, 0.1)",
                  border: "1px solid rgba(6, 182, 212, 0.35)",
                  color: "var(--cyan)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--cyan)",
                    boxShadow: "0 0 8px var(--cyan)",
                    display: "inline-block",
                  }}
                />
                Open Learning Platform
              </div>

              {/* Headline */}
              <h1
                className="font-extrabold leading-[1.06] tracking-tight"
                style={{ fontSize: "clamp(40px, 5.2vw, 68px)", color: "#F5F7FF" }}
              >
                Open Learning
                <br />
                <span
                  style={{
                    background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  For a Brighter
                </span>
                <br />
                Tomorrow.
              </h1>

              {/* Subtext — Strict Contrast Requirement: #B8C4D9 */}
              <p
                className="text-base sm:text-lg leading-relaxed max-w-[490px]"
                style={{ color: "#B8C4D9" }}
              >
                Access high-quality learning experiences, learn at your own pace,
                build real skills, and use AI guidance when you need it.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Primary Button — blue gradient surface with white text */}
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm text-white transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    boxShadow: "0 0 24px rgba(37,99,235,0.45), 0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Courses</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {/* Secondary Button — dark glass, visible blue border, light text */}
                <Link
                  href="/nova"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm transition-all duration-200"
                  style={{
                    background: "rgba(13, 22, 41, 0.75)",
                    border: "1px solid rgba(59, 130, 246, 0.45)",
                    color: "#F5F7FF",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: "var(--cyan)" }} />
                  <span>Ask Nova AI</span>
                </Link>
              </div>

              {/* Category pills — Strict Contrast Requirement: #B8C6DD */}
              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs font-semibold" style={{ color: "#7F8CA8" }}>
                    Explore:
                  </span>
                  {categories.slice(0, 5).map((cat: HomePageCategory) => (
                    <Link
                      key={cat.id}
                      href={`/explore?category=${cat.slug}`}
                      className="px-3.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 hover:border-blue-400 hover:text-white"
                      style={{
                        background: "rgba(13, 22, 41, 0.75)",
                        border: "1px solid rgba(59, 130, 246, 0.28)",
                        color: "#B8C6DD",
                      }}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — 3D Knowledge Globe */}
            <div className="flex items-center justify-center lg:justify-end relative">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(37,99,235,0.16) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />
              <div className="hidden lg:flex items-center justify-center w-full max-w-[560px]">
                <KnowledgeGlobeClient />
              </div>
              {/* Mobile fallback globe */}
              <div
                className="flex lg:hidden w-64 h-64 rounded-full items-center justify-center"
                style={{
                  background: "radial-gradient(ellipse at 30% 30%, #153875, #030c1a)",
                  boxShadow: "0 0 60px rgba(37,99,235,0.3)",
                  border: "1px solid rgba(59,130,246,0.35)",
                }}
              >
                <Compass className="w-16 h-16" style={{ color: "rgba(147,197,253,0.7)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade to next section */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
            background: "linear-gradient(to bottom, transparent, var(--bg-base))",
            pointerEvents: "none",
          }}
        />
      </section>

      {/* ================================================================
          §2  CONTINUE LEARNING (authenticated only)
          ================================================================ */}
      {session && (
        <section
          className="py-16 px-6 lg:px-12 relative"
          style={{ borderTop: "1px solid rgba(37,99,235,0.15)" }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: "#7F8CA8" }}
                >
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  <span>Your Learning Workspace</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#F5F7FF" }}>
                  Welcome back, {session.name.split(" ")[0]}
                </h2>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:text-white"
                style={{ color: "var(--blue-bright)" }}
              >
                <span>Full dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {userEnrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {userEnrollments.map(({ course }) => {
                  const prog = progressMap.get(course.id);
                  const percentage = prog?.percentage ?? 0;
                  const completedLessons = prog?.completedLessons ?? 0;
                  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
                  const isDone = percentage >= 100;
                  const firstLesson = course.modules[0]?.lessons[0];
                  const resumeUrl = firstLesson
                    ? `/learn/${course.slug}/${firstLesson.slug}`
                    : `/courses/${course.slug}`;

                  return (
                    <div
                      key={course.id}
                      className="p-5 rounded-2xl flex flex-col justify-between transition-all duration-200"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div>
                        <div
                          className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-2"
                          style={{ color: "#7F8CA8" }}
                        >
                          <span style={{ color: "var(--cyan)" }}>{course.category?.name || "General"}</span>
                          {isDone ? (
                            <span className="flex items-center gap-1" style={{ color: "#10b981" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                            </span>
                          ) : (
                            <span style={{ color: "#F5F7FF" }}>{percentage}%</span>
                          )}
                        </div>
                        <h3 className="font-bold text-base leading-snug line-clamp-2 mb-2" style={{ color: "#F5F7FF" }}>
                          {course.title}
                        </h3>
                        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "#A8B4CC" }}>
                          {course.shortSummary}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 space-y-3" style={{ borderTop: "1px solid rgba(37,99,235,0.15)" }}>
                        <div>
                          <div
                            className="flex items-center justify-between text-xs mb-1.5"
                            style={{ color: "#7F8CA8" }}
                          >
                            <span>{completedLessons} of {totalLessons} lessons</span>
                            <span style={{ color: "#F5F7FF", fontWeight: 700 }}>{percentage}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(37,99,235,0.18)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                background: isDone ? "#10b981" : "linear-gradient(90deg, #2563eb, #06b6d4)",
                              }}
                            />
                          </div>
                        </div>
                        <Link
                          href={resumeUrl}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200"
                          style={
                            isDone
                              ? { background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }
                              : { background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }
                          }
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
              <div
                className="p-8 rounded-2xl text-center max-w-xl mx-auto space-y-3"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
              >
                <BookOpen className="w-10 h-10 mx-auto text-blue-400" />
                <h3 className="text-lg font-bold" style={{ color: "#F5F7FF" }}>Start Your Learning Journey</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#A8B4CC" }}>
                  You haven&apos;t enrolled in any courses yet. Explore the catalog to find your first course.
                </p>
                <div className="pt-2">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-xs transition-all text-white"
                    style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 0 16px rgba(37,99,235,0.4)" }}
                  >
                    Browse Catalog <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================================================
          §3  LEARN WITH PURPOSE (features bento)
          ================================================================ */}
      <section
        className="py-24 px-6 lg:px-12 relative"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4"
              style={{ color: "#F5F7FF" }}
            >
              Learn With Purpose
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "#B8C4D9" }}>
              Four core capabilities that make OLVYN the most transparent
              and guided learning platform available.
            </p>
          </div>

          {/* 2×2 bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-7 rounded-2xl flex flex-col gap-4 transition-all duration-200 group hover:border-blue-500/40 hover:bg-[#101e35]"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${f.accent}20`,
                    border: `1px solid ${f.accent}45`,
                  }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: "#F5F7FF" }}>
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#B8C4D9" }}>
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          §4  FEATURED COURSES (real data)
          ================================================================ */}
      <section className="py-24 px-6 lg:px-12 relative" style={{ background: "var(--bg-base)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
                style={{ color: "#F5F7FF" }}
              >
                Start Your Learning Journey
              </h2>
              <p className="text-base mt-2" style={{ color: "#B8C4D9" }}>
                Published courses authored and verified by contributors.
              </p>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all hover:text-white"
              style={{
                background: "rgba(37,99,235,0.15)",
                border: "1px solid rgba(59,130,246,0.35)",
                color: "var(--blue-bright)",
              }}
            >
              Browse All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {courses.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-blue-400" />
              <h3 className="text-lg font-bold" style={{ color: "#F5F7FF" }}>No courses published yet</h3>
              <p className="text-sm mt-1" style={{ color: "#A8B4CC" }}>Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: HomePageCourse) => {
                const totalLessons = course.modules.reduce(
                  (acc, m) => acc + m.lessons.length,
                  0
                );

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="group rounded-2xl flex flex-col transition-all duration-200 overflow-hidden hover:border-blue-500/50 hover:bg-[#101e35]"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden" style={{ background: "#0a1836" }}>
                      {course.thumbnailUrl ? (
                        <Image
                          src={course.thumbnailUrl}
                          alt={course.title}
                          fill
                          sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-10 h-10" style={{ color: "rgba(59,130,246,0.4)" }} />
                        </div>
                      )}
                      {/* Overlay gradient */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(13,22,41,0.7) 0%, transparent 50%)",
                        }}
                      />
                      {/* Difficulty badge */}
                      <div className="absolute top-3 left-3">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{
                            background: "rgba(5,8,22,0.85)",
                            color: "var(--cyan)",
                            border: "1px solid rgba(6,182,212,0.4)",
                            backdropFilter: "blur(6px)",
                          }}
                        >
                          {course.difficulty ? course.difficulty.replace("_", " ") : "ALL LEVELS"}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1 gap-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span style={{ color: "var(--cyan)" }}>{course.category?.name || "Open Studies"}</span>
                        <span style={{ color: "#A8B4CC" }}>by {course.author.name}</span>
                      </div>
                      <h4
                        className="font-bold text-base leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors"
                        style={{ color: "#F5F7FF" }}
                      >
                        {course.title}
                      </h4>
                      <p className="text-xs leading-relaxed line-clamp-2 flex-1" style={{ color: "#A8B4CC" }}>
                        {course.shortSummary}
                      </p>
                      <div
                        className="flex items-center justify-between text-xs font-semibold pt-3 mt-1"
                        style={{ borderTop: "1px solid rgba(37,99,235,0.15)" }}
                      >
                        <span className="flex items-center gap-1.5" style={{ color: "#7F8CA8" }}>
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          {totalLessons} lessons{course.estimatedHours ? ` · ${course.estimatedHours}h` : ""}
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-black"
                          style={{
                            background: "rgba(37,99,235,0.2)",
                            color: "var(--blue-bright)",
                            border: "1px solid rgba(59,130,246,0.35)",
                          }}
                        >
                          Free Access
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          §5  MEET NOVA
          ================================================================ */}
      <section
        className="py-24 px-6 lg:px-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #050816 0%, #07112a 50%, #050816 100%)",
          borderTop: "1px solid rgba(37,99,235,0.15)",
        }}
      >
        {/* Subtle background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — copy */}
            <div className="space-y-7">
              <div>
                <h2
                  className="font-extrabold tracking-tight leading-none"
                  style={{ fontSize: "clamp(40px, 6vw, 72px)", color: "#F5F7FF" }}
                >
                  MEET NOVA
                </h2>
                <p
                  className="text-xl font-semibold mt-2"
                  style={{ color: "var(--cyan)" }}
                >
                  Your AI learning copilot.
                </p>
              </div>
              <p className="text-base leading-relaxed max-w-[460px]" style={{ color: "#B8C4D9" }}>
                Nova understands your exact lesson notes and curriculum context.
                Ask questions, clarify difficult concepts, and get grounded answers
                without hallucinations — right inside every lesson.
              </p>
              <Link
                href="/nova"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm text-white transition-all duration-200 group"
                style={{
                  background: "linear-gradient(135deg, #2563eb, #0891b2)",
                  boxShadow: "0 0 30px rgba(37,99,235,0.4), 0 4px 16px rgba(0,0,0,0.4)",
                }}
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Ask Nova AI</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Right — orbital visualization */}
            <div className="flex items-center justify-center lg:justify-end">
              <NovaOrbitalClient />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          §6  ONE WORLD. ENDLESS KNOWLEDGE.
          ================================================================ */}
      <section
        className="py-24 px-6 lg:px-12 relative overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          borderTop: "1px solid rgba(37,99,235,0.15)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — text */}
            <div className="space-y-6">
              <h2
                className="font-extrabold tracking-tight leading-none"
                style={{ fontSize: "clamp(44px, 6vw, 80px)", color: "#F5F7FF" }}
              >
                ONE WORLD.
                <br />
                <span style={{ fontSize: "0.75em", color: "var(--cyan)" }}>
                  ENDLESS KNOWLEDGE.
                </span>
              </h2>
              <p className="text-base leading-relaxed max-w-[440px]" style={{ color: "#B8C4D9" }}>
                Learning becomes more powerful when knowledge is open and shared.
                OLVYN connects learners and educators worldwide through
                transparent, verified curriculum.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 text-sm font-bold transition-colors hover:text-white"
                style={{ color: "var(--blue-bright)" }}
              >
                Explore the Catalog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right — wireframe globe */}
            <div className="flex items-center justify-center lg:justify-end">
              <WireframeGlobeClient />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          §7  BROWSE BY CATEGORY
          ================================================================ */}
      <section
        id="categories"
        className="py-24 px-6 lg:px-12 relative scroll-mt-20"
        style={{ background: "var(--bg-base)", borderTop: "1px solid rgba(37,99,235,0.15)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
            <div>
              <div
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color: "#7F8CA8" }}
              >
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Curriculum Domains</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-extrabold tracking-tight"
                style={{ color: "#F5F7FF" }}
              >
                Browse by Category
              </h2>
            </div>
            <Link
              href="/explore"
              className="text-xs font-bold flex items-center gap-1 self-start sm:self-auto transition-colors hover:text-white"
              style={{ color: "var(--blue-bright)" }}
            >
              <span>View all courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {categories.length === 0 ? (
            <div
              className="p-8 rounded-2xl text-center max-w-md mx-auto"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <Layers className="w-10 h-10 mx-auto mb-2 text-blue-400" />
              <p className="text-xs" style={{ color: "#A8B4CC" }}>
                Categories will appear as curriculum is populated.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat: HomePageCategory) => (
                <Link
                  key={cat.id}
                  href={`/explore?category=${cat.slug}`}
                  className="group p-6 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:border-blue-500/40 hover:bg-[#101e35]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-200"
                      style={{
                        background: "rgba(37,99,235,0.18)",
                        border: "1px solid rgba(59,130,246,0.3)",
                      }}
                    >
                      <BookOpen className="w-5 h-5" style={{ color: "var(--blue-bright)" }} />
                    </div>
                    <h3 className="font-bold text-base mb-1" style={{ color: "#F5F7FF" }}>
                      {cat.name}
                    </h3>
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#B8C6DD" }}>
                      {cat.description || "Curated learning paths and transparent lesson syllabi."}
                    </p>
                  </div>

                  <div
                    className="mt-5 pt-3 flex items-center justify-between text-xs font-bold"
                    style={{ borderTop: "1px solid rgba(37,99,235,0.15)" }}
                  >
                    <span style={{ color: "#7F8CA8" }}>
                      {cat._count.courses} {cat._count.courses === 1 ? "course" : "courses"}
                    </span>
                    <span
                      className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      style={{ color: "var(--blue-bright)" }}
                    >
                      Explore <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          §8  CREATOR STUDIO CTA
          ================================================================ */}
      <section className="py-8 px-6 lg:px-12 pb-24" style={{ background: "var(--bg-base)" }}>
        <div className="max-w-7xl mx-auto">
          <div
            className="p-8 sm:p-12 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.14) 0%, rgba(124,58,237,0.08) 100%)",
              border: "1px solid rgba(59,130,246,0.35)",
            }}
          >
            {/* Background glow */}
            <div
              style={{
                position: "absolute",
                right: "-10%",
                top: "50%",
                transform: "translateY(-50%)",
                width: 300,
                height: 300,
                borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)",
                filter: "blur(30px)",
                pointerEvents: "none",
              }}
            />

            <div className="space-y-3 max-w-xl relative">
              <h3
                className="text-2xl sm:text-3xl font-extrabold"
                style={{ color: "#F5F7FF" }}
              >
                Want to Author an Open Course?
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#B8C4D9" }}>
                Educators and engineers can build rich curricula with modules, markdown notes,
                and video embeds in the Creator Studio. Courses undergo editorial review before going live.
              </p>
            </div>

            <Link
              href="/contributor"
              className="px-8 py-4 rounded-full font-bold text-sm text-white transition-all whitespace-nowrap relative"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                boxShadow: "0 0 24px rgba(124,58,237,0.4), 0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              Open Creator Studio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
