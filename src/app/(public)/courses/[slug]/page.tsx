import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseBySlug } from "@/modules/courses/course.service";
import { getSession } from "@/lib/auth";
import { BookOpen, Clock, BarChart3, CheckCircle2, Circle, ArrowRight, User, Sparkles, FileText, Video } from "lucide-react";

interface CourseDetailsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const revalidate = 0;

export default async function CourseDetailsPage({ params }: CourseDetailsPageProps) {
  const { slug } = await params;
  const session = await getSession();
  const course = await getCourseBySlug(slug, session?.userId);

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  const firstLesson = course.modules[0]?.lessons[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Top Banner / Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/explore" className="hover:text-white transition-colors">Courses</Link>
        <span>/</span>
        {course.category && (
          <>
            <Link href={`/explore?category=${course.category.slug}`} className="hover:text-white transition-colors">
              {course.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-200 truncate">{course.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Column (2 cols) */}
        <div className="lg:col-span-2 space-y-10">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {course.category && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {course.category.name}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {course.difficulty}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-slate-300 text-base sm:text-lg mt-3 leading-relaxed">
              {course.shortSummary}
            </p>

            {/* Author bar */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800/80">
              {course.author.avatarUrl ? (
                <img
                  src={course.author.avatarUrl}
                  alt={course.author.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">Created by</p>
                <p className="text-sm font-semibold text-white">{course.author.name}</p>
              </div>
            </div>
          </div>

          {/* Description Content */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">About this Course</h2>
            <div className="prose-dark whitespace-pre-line text-sm text-slate-300 leading-relaxed">
              {course.description}
            </div>
          </div>

          {/* Complete Course Syllabus (Modules & Lessons) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Complete Course Syllabus</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {course.modules.length} modules • {course.totalLessons} lessons
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {course.modules.map((module, mIdx) => (
                <div
                  key={module.id}
                  className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden"
                >
                  <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                        Module {mIdx + 1}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">{module.title}</h3>
                      {module.description && (
                        <p className="text-xs text-slate-400 mt-1">{module.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {module.lessons.length} lessons
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/60">
                    {module.lessons.map((lesson, lIdx) => {
                      const isDone = course.progress[lesson.id];
                      return (
                        <div
                          key={lesson.id}
                          className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {course.isEnrolled ? (
                              isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                              )
                            ) : (
                              <span className="text-xs font-mono text-slate-500 w-4 text-center">
                                {lIdx + 1}
                              </span>
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-200">{lesson.title}</p>
                              {lesson.description && (
                                <p className="text-xs text-slate-400 line-clamp-1">{lesson.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {lesson.durationMinutes && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.durationMinutes}m
                              </span>
                            )}
                            {course.isEnrolled && (
                              <Link
                                href={`/learn/${course.slug}/${lesson.slug}`}
                                className="text-xs font-medium text-blue-400 hover:text-blue-300"
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
          </div>
        </div>

        {/* Sidebar Sticky Column */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-6">
            {course.thumbnailUrl && (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Course Meta Stats */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Difficulty
                </span>
                <span className="font-semibold text-white">{course.difficulty}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Total Lessons
                </span>
                <span className="font-semibold text-white">{course.totalLessons}</span>
              </div>
              {course.estimatedHours && (
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Estimated Duration
                  </span>
                  <span className="font-semibold text-white">{course.estimatedHours} hrs</span>
                </div>
              )}
            </div>

            {/* Enrollment / Learning Action CTA */}
            {course.isEnrolled ? (
              <div className="space-y-3">
                {course.courseProgress && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-400">Your Progress</span>
                      <span className="text-blue-400">{course.courseProgress.percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${course.courseProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                <Link
                  href={firstLesson ? `/learn/${course.slug}/${firstLesson.slug}` : `/dashboard`}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                >
                  Continue Learning
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <form action={`/api/courses/${course.id}/enroll`} method="POST">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                >
                  Enroll in Course (Free)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Nova AI Helper teaser */}
            <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-violet-300">Nova AI Tutor Included</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Get instant explanations, code breakdowns, and quizzes while taking this course.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
