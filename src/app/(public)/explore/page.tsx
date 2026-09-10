import Link from "next/link";
import { getPublishedCourses } from "@/modules/courses/course.service";
import { db } from "@/lib/db";
import { Search, BookOpen, Clock, Filter, ArrowRight } from "lucide-react";

interface ExplorePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    difficulty?: string;
    page?: string;
  }>;
}

export const revalidate = 0; // Dynamic server component

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const category = params.category || "all";
  const difficulty = params.difficulty || "all";
  const page = parseInt(params.page || "1", 10);

  const [{ courses, pagination }, categories] = await Promise.all([
    getPublishedCourses({
      query: q,
      category,
      difficulty,
      page,
      limit: 12,
    }),
    db.category.findMany({
      include: {
        _count: {
          select: { courses: { where: { status: "PUBLISHED" } } },
        },
      },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Explore Courses
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Discover vetted, structured educational courses across multiple disciplines.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 mb-8 space-y-4">
        <form method="GET" action="/explore" className="flex flex-col md:flex-row gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by title, topic, or keyword (e.g. Python, UX, React)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Hidden preserve category & difficulty on text search submit if already selected */}
          {category !== "all" && <input type="hidden" name="category" value={category} />}
          {difficulty !== "all" && <input type="hidden" name="difficulty" value={difficulty} />}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            Search
          </button>
        </form>

        {/* Facet Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <span className="font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <Link
            href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(difficulty !== "all" ? { difficulty } : {}), category: "all" })}`}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              category === "all"
                ? "bg-blue-600/20 border-blue-500/40 text-blue-300 font-semibold"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Categories
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(difficulty !== "all" ? { difficulty } : {}), category: cat.slug })}`}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                category === cat.slug
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300 font-semibold"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {cat.name} ({cat._count.courses})
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-400 mr-1">Difficulty:</span>
          {["all", "BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((diff) => (
            <Link
              key={diff}
              href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(category !== "all" ? { category } : {}), difficulty: diff })}`}
              className={`px-3 py-1.5 rounded-lg border uppercase tracking-wider transition-colors ${
                difficulty === diff
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-semibold"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {diff === "all" ? "All Levels" : diff.replace("_", " ")}
            </Link>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-white">{courses.length}</span> of{" "}
          <span className="font-semibold text-white">{pagination.total}</span> published courses
        </p>
        {(q || category !== "all" || difficulty !== "all") && (
          <Link
            href="/explore"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Clear all filters
          </Link>
        )}
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-slate-900/30 border border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No courses match your criteria</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or clearing category and difficulty filters.
          </p>
          <Link
            href="/explore"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Reset Filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden hover:border-slate-700 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
            >
              {course.thumbnailUrl ? (
                <div className="aspect-video w-full overflow-hidden bg-slate-950 relative">
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-950/85 backdrop-blur-md text-slate-200 border border-slate-800">
                    {course.difficulty}
                  </span>
                </div>
              ) : (
                <div className="aspect-video w-full bg-slate-950 flex items-center justify-center border-b border-slate-800">
                  <BookOpen className="w-10 h-10 text-slate-700" />
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
                    {course.totalLessons} lessons
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
          ))}
        </div>
      )}
    </div>
  );
}
