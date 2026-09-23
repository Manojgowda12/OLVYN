import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseBySlug } from "@/modules/courses/course.service";
import { getSession } from "@/lib/auth";
import {
  BookOpen,
  Clock,
  BarChart3,
  CheckCircle2,
  Circle,
  ArrowRight,
  User,
  Sparkles,
} from "lucide-react";

interface CourseDetailsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CourseDetailsPage({ params }: CourseDetailsPageProps) {
  const { slug } = await params;
  const session = await getSession();
  const course = await getCourseBySlug(slug, session?.userId);

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const firstLesson = allLessons[0];
  const completedCount = allLessons.filter((l) => course.progress[l.id]).length;
  const totalLessons = allLessons.length;
  const isAllCompleted = totalLessons > 0 && completedCount === totalLessons;
  const isStarted = completedCount > 0;
  const firstIncompleteLesson = allLessons.find((l) => !course.progress[l.id]) || firstLesson;
  const progressPercentage =
    course.courseProgress?.percentage ??
    (totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0);

  return (
    <div className="min-h-screen w-full relative" style={{ background: "var(--bg-base)" }}>
      {/* Background ambient lighting */}
      <div
        className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute top-[400px] right-10 w-[500px] h-[350px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 relative z-10 w-full">
        {/* Top Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#7F8CA8] font-medium">
          <Link href="/explore" className="hover:text-[#F5F7FF] transition-colors">
            Courses
          </Link>
          <span>/</span>
          {course.category && (
            <>
              <Link
                href={`/explore?category=${course.category.slug}`}
                className="hover:text-[#F5F7FF] transition-colors"
              >
                {course.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-[#B8C4D9] font-semibold truncate max-w-xs sm:max-w-md">{course.title}</span>
        </nav>

        {/* ================================================================
            COURSE HERO: Contained thumbnail, title, summary, metadata, CTA
            ================================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Title, Summary, Metadata & Primary CTA */}
          <div className="lg:col-span-7 space-y-6">
            {/* Category & Difficulty Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              {course.category && (
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-950/60 text-[#00F0FF] border border-blue-500/30">
                  {course.category.name}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0d1629] text-[#B8C6DD] border border-blue-500/20">
                {course.difficulty ? course.difficulty.replace("_", " ") : "All Levels"}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold text-[#E7C77A] bg-[#d4af70]/10 border border-[#d4af70]/25">
                100% Free Access
              </span>
            </div>

            {/* Course Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F5F7FF] tracking-tight leading-tight">
              {course.title}
            </h1>

            {/* Course Short Summary */}
            <p className="text-base sm:text-lg text-[#B8C4D9] leading-relaxed max-w-2xl">
              {course.shortSummary}
            </p>

            {/* Metadata Badges Strip */}
            <div className="flex flex-wrap items-center gap-y-3 gap-x-6 pt-2 text-xs text-[#A8B4CC]">
              {/* Author Info */}
              <div className="flex items-center gap-3">
                {course.author.avatarUrl ? (
                  <img
                    src={course.author.avatarUrl}
                    alt={course.author.name}
                    width={38}
                    height={38}
                    loading="lazy"
                    decoding="async"
                    className="w-9 h-9 rounded-full object-cover border border-blue-500/30"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-950/60 flex items-center justify-center text-blue-300 border border-blue-500/30">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-[#7F8CA8] font-medium">Curriculum Author</p>
                  <p className="text-xs font-bold text-[#F5F7FF]">{course.author.name}</p>
                </div>
              </div>

              {/* Total Lessons */}
              <div className="flex items-center gap-2 border-l border-blue-500/20 pl-4 sm:pl-6">
                <BookOpen className="w-4 h-4 text-[#00F0FF]" />
                <div>
                  <p className="text-[11px] text-[#7F8CA8] font-medium">Total Lessons</p>
                  <p className="font-bold text-[#F5F7FF]">{totalLessons} lessons</p>
                </div>
              </div>

              {/* Estimated Duration */}
              {course.estimatedHours && (
                <div className="flex items-center gap-2 border-l border-blue-500/20 pl-4 sm:pl-6">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-[11px] text-[#7F8CA8] font-medium">Estimated Time</p>
                    <p className="font-bold text-[#F5F7FF]">{course.estimatedHours} hrs</p>
                  </div>
                </div>
              )}
            </div>

            {/* Learning Action CTA Bar */}
            <div className="pt-4 border-t border-blue-500/20">
              {course.isEnrolled ? (
                <div className="space-y-4 max-w-md">
                  {/* Progress Stats */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                      <span className="text-[#A8B4CC]">Your Progress</span>
                      <span className={isAllCompleted ? "text-emerald-400 font-bold" : "text-[#00F0FF]"}>
                        {progressPercentage}% ({completedCount}/{totalLessons} completed)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-blue-950/60 border border-blue-500/25 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAllCompleted
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-blue-600 to-cyan-400"
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Contextual CTA Buttons */}
                  {isAllCompleted ? (
                    <Link
                      href={firstLesson ? `/learn/${course.slug}/${firstLesson.slug}` : `/dashboard`}
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Review Course</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : isStarted ? (
                    <Link
                      href={`/learn/${course.slug}/${firstIncompleteLesson.slug}`}
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-white font-bold text-sm transition-all duration-200"
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        boxShadow: "0 0 24px rgba(37,99,235,0.45), 0 4px 12px rgba(0,0,0,0.3)",
                      }}
                    >
                      <span>Continue Learning</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link
                      href={firstLesson ? `/learn/${course.slug}/${firstLesson.slug}` : `/dashboard`}
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-white font-bold text-sm transition-all duration-200"
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        boxShadow: "0 0 24px rgba(37,99,235,0.45), 0 4px 12px rgba(0,0,0,0.3)",
                      }}
                    >
                      <span>Start Learning</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <form action={`/api/courses/${course.id}/enroll`} method="POST" suppressHydrationWarning>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-white font-bold text-sm transition-all duration-200 cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        boxShadow: "0 0 24px rgba(37,99,235,0.45), 0 4px 12px rgba(0,0,0,0.3)",
                      }}
                      suppressHydrationWarning
                    >
                      <span>Start Learning</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                  <span className="text-xs text-[#7F8CA8] font-medium">Free enrollment • Instant access</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Contained Thumbnail & Nova AI Callout */}
          <div className="lg:col-span-5 space-y-5">
            {/* Contained Course Thumbnail — Strictly bounded parent container */}
            {course.thumbnailUrl ? (
              <div
                className="relative w-full aspect-[16/9] max-w-full rounded-2xl overflow-hidden bg-[#07101f] border border-blue-500/30 shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_24px_rgba(37,99,235,0.25)]"
                style={{ maxHeight: "320px" }}
              >
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover block"
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050816]/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#050816]/85 text-[#00F0FF] border border-cyan-500/40 backdrop-blur-md">
                    {course.difficulty ? course.difficulty.replace("_", " ") : "ALL LEVELS"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative w-full aspect-[16/9] max-w-full rounded-2xl overflow-hidden bg-[#0d1629] border border-blue-500/20 flex items-center justify-center">
                <BookOpen className="w-14 h-14 text-blue-500/40" />
              </div>
            )}

            {/* Nova AI Tutor Callout Widget */}
            <div className="p-5 rounded-2xl bg-[#0d1629]/90 border border-cyan-500/30 backdrop-blur-md flex items-start gap-3.5 shadow-lg">
              <Sparkles className="w-5 h-5 text-[#00F0FF] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#F5F7FF]">Nova AI Tutor Included</p>
                <p className="text-xs text-[#A8B4CC] mt-1 leading-relaxed">
                  Interactive AI assistance grounded in this course&apos;s specific markdown lessons and curriculum context.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            COURSE DESCRIPTION / CONTENT
            ================================================================ */}
        <section className="p-7 sm:p-8 rounded-3xl bg-[#0d1629] border border-blue-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          <h2 className="text-xl sm:text-2xl font-bold text-[#F5F7FF] mb-4">About this Course</h2>
          <div className="whitespace-pre-line text-sm text-[#B8C4D9] leading-relaxed font-normal">
            {course.description}
          </div>
        </section>

        {/* ================================================================
            SYLLABUS / MODULES / LESSONS
            ================================================================ */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F7FF]">Complete Course Syllabus</h2>
              <p className="text-xs text-[#7F8CA8] mt-1">
                {course.modules.length} modules • {totalLessons} structured lessons • Full syllabus transparency
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {course.modules.map((module, mIdx) => (
              <div
                key={module.id}
                className="rounded-2xl bg-[#0d1629] border border-blue-500/20 shadow-sm overflow-hidden"
              >
                {/* Module Header */}
                <div className="p-4 sm:p-5 bg-[#07101f] border-b border-blue-500/15 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#00F0FF]">
                      Module {mIdx + 1}
                    </span>
                    <h3 className="text-base font-bold text-[#F5F7FF] mt-0.5">{module.title}</h3>
                    {module.description && (
                      <p className="text-xs text-[#A8B4CC] mt-0.5">{module.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#B8C6DD] font-semibold px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/25">
                    {module.lessons.length} lessons
                  </span>
                </div>

                {/* Lessons in Module */}
                <div className="divide-y divide-blue-500/10">
                  {module.lessons.map((lesson, lIdx) => {
                    const isDone = course.progress[lesson.id];
                    return (
                      <div
                        key={lesson.id}
                        className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-blue-950/30 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          {course.isEnrolled ? (
                            isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                            )
                          ) : (
                            <span className="text-xs font-mono font-medium text-[#7F8CA8] w-5 text-center">
                              {lIdx + 1}
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-[#F5F7FF]">{lesson.title}</p>
                            {lesson.description && (
                              <p className="text-xs text-[#7F8CA8] line-clamp-1 mt-0.5">{lesson.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {lesson.durationMinutes && (
                            <span className="text-xs text-[#A8B4CC] flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-[#7F8CA8]" />
                              {lesson.durationMinutes}m
                            </span>
                          )}
                          {course.isEnrolled && (
                            <Link
                              href={`/learn/${course.slug}/${lesson.slug}`}
                              className="text-xs font-semibold text-[#00F0FF] hover:text-white px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 hover:border-cyan-400 transition-colors"
                            >
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
