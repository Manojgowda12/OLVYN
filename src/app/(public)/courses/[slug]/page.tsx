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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full text-slate-900">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-6">
        <Link href="/explore" className="hover:text-slate-900 transition-colors">Courses</Link>
        <span>/</span>
        {course.category && (
          <>
            <Link href={`/explore?category=${course.category.slug}`} className="hover:text-slate-900 transition-colors">
              {course.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-800 font-semibold truncate">{course.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Column (2 cols) */}
        <div className="lg:col-span-2 space-y-10">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              {course.category && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/70">
                  {course.category.name}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {course.difficulty ? course.difficulty.replace("_", " ") : "All Levels"}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-slate-600 text-base sm:text-lg mt-3 leading-relaxed">
              {course.shortSummary}
            </p>

            {/* Author bar */}
            <div className="flex items-center gap-3.5 mt-6 pt-5 border-t border-slate-200/80">
              {course.author.avatarUrl ? (
                <img
                  src={course.author.avatarUrl}
                  alt={course.author.name}
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 font-medium">Curriculum Author</p>
                <p className="text-sm font-bold text-slate-900">{course.author.name}</p>
              </div>
            </div>
          </div>

          {/* Description Content */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <h2 className="text-xl font-bold text-slate-900 mb-4">About this Course</h2>
            <div className="whitespace-pre-line text-sm text-slate-600 leading-relaxed font-normal">
              {course.description}
            </div>
          </div>

          {/* Complete Course Syllabus */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Complete Course Syllabus</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {course.modules.length} modules • {course.totalLessons} structured lessons • Full transparency
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {course.modules.map((module, mIdx) => (
                <div
                  key={module.id}
                  className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden"
                >
                  <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                        Module {mIdx + 1}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{module.title}</h3>
                      {module.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200">
                      {module.lessons.length} lessons
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {module.lessons.map((lesson, lIdx) => {
                      const isDone = course.progress[lesson.id];
                      return (
                        <div
                          key={lesson.id}
                          className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-3.5">
                            {course.isEnrolled ? (
                              isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                              )
                            ) : (
                              <span className="text-xs font-mono font-medium text-slate-400 w-5 text-center">
                                {lIdx + 1}
                              </span>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{lesson.title}</p>
                              {lesson.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{lesson.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {lesson.durationMinutes && (
                              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {lesson.durationMinutes}m
                              </span>
                            )}
                            {course.isEnrolled && (
                              <Link
                                href={`/learn/${course.slug}/${lesson.slug}`}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-full hover:bg-rose-50 transition-colors"
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

        {/* Sidebar Column */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-6">
            {course.thumbnailUrl && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60">
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Course Meta Stats */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <BarChart3 className="w-4 h-4 text-rose-500" /> Difficulty Level
                </span>
                <span className="font-bold text-slate-800">{course.difficulty ? course.difficulty.replace("_", " ") : "All Levels"}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> Total Lessons
                </span>
                <span className="font-bold text-slate-800">{course.totalLessons}</span>
              </div>
              {course.estimatedHours && (
                <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Clock className="w-4 h-4 text-emerald-500" /> Estimated Time
                  </span>
                  <span className="font-bold text-slate-800">{course.estimatedHours} hrs</span>
                </div>
              )}
            </div>

            {/* Action CTA */}
            {course.isEnrolled ? (
              <div className="space-y-3">
                {course.courseProgress && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                      <span className="text-slate-600">Your Progress</span>
                      <span className="text-rose-600">{course.courseProgress.percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full transition-all duration-500"
                        style={{ width: `${course.courseProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                <Link
                  href={firstLesson ? `/learn/${course.slug}/${firstLesson.slug}` : `/dashboard`}
                  className="w-full py-3.5 px-5 rounded-full bg-slate-900 hover:bg-black text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Continue Learning</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            ) : (
              <form action={`/api/courses/${course.id}/enroll`} method="POST" suppressHydrationWarning>
                <button
                  type="submit"
                  className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-semibold text-sm shadow-[0_4px_20px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-2 group"
                  suppressHydrationWarning
                >
                  <span>Enroll in Course (Free)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>
            )}

            {/* Nova AI Helper teaser */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/60 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-indigo-950">Nova AI Tutor Included</p>
                <p className="text-[11px] text-indigo-700 mt-1 leading-relaxed">
                  Interactive AI assistance grounded in this course's specific markdown lessons.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
