import Link from "next/link";
import Image from "next/image";
import { getPublishedCourses, getCachedCategories, resolveCategorySlug } from "@/modules/courses/course.service";
import { Search, Heart, Star, BookOpen, Clock } from "lucide-react";

interface ExplorePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    difficulty?: string;
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";
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
    getCachedCategories(),
  ]);

  const resolvedParamSlug = resolveCategorySlug(category);
  const isCatActive = (cat: { slug: string; name: string }) => {
    if (!category || category === "all") return false;
    const param = category.toLowerCase().trim();
    const slug = cat.slug.toLowerCase();
    const name = cat.name.toLowerCase();
    return (
      slug === resolvedParamSlug ||
      param === slug ||
      param === name ||
      param === slug.replace(/-/g, " ")
    );
  };

  const isAllActive = !category || category === "all" || !categories.some(isCatActive);

  return (
    <div className="min-h-[100dvh] text-[#F5F7FF] py-10 px-6 lg:px-12 max-w-7xl mx-auto w-full" style={{ background: "var(--bg-base)" }}>
      {/* Top Filter & Search Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#00F0FF] mb-1.5">
            OPEN_SYLLABUS // COURSE_INDEX
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F7FF]">
            {q ? `Search results for "${q}"` : "Explore All Courses"}
          </h1>
        </div>

        {/* Compact Search Bar Pill — Liquid Glass */}
        <form
          method="GET"
          action="/explore"
          className="flex items-center p-1.5 rounded-full border transition-all w-full md:w-auto"
          style={{
            background: "rgba(10, 18, 36, 0.8)",
            borderColor: "rgba(255, 255, 255, 0.1)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 24px -6px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)",
          }}
          suppressHydrationWarning
        >
          <div className="flex items-center pl-3.5 gap-2.5 flex-1">
            <Search className="w-4 h-4 text-[#7F8CA8]" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search topics or skills..."
              className="text-sm text-[#F5F7FF] placeholder:text-[#7F8CA8] bg-transparent focus:outline-none w-full md:w-64 py-1"
              suppressHydrationWarning
            />
          </div>
          {category !== "all" && <input type="hidden" name="category" value={category} />}
          {difficulty !== "all" && <input type="hidden" name="difficulty" value={difficulty} />}
          <button
            type="submit"
            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 flex items-center justify-center text-white flex-shrink-0 transition-colors shadow-sm cursor-pointer tactile-button"
            suppressHydrationWarning
          >
            <Search className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto py-4 scrollbar-none border-b border-white/[0.06]">
        <Link
          href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(difficulty !== "all" ? { difficulty } : {}), category: "all" })}`}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap tactile-button ${
            isAllActive
              ? "bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.3)] border border-white/20"
              : "bg-[#0d1629]/70 text-[#A8B4CC] border border-white/[0.08] hover:border-white/20 hover:text-white"
          }`}
        >
          All Topics
        </Link>
        {categories.map((cat) => {
          const active = isCatActive(cat);
          return (
            <Link
              key={cat.id}
              href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(difficulty !== "all" ? { difficulty } : {}), category: cat.slug })}`}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap tactile-button ${
                active
                  ? "bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.3)] border border-white/20"
                  : "bg-[#0d1629]/70 text-[#A8B4CC] border border-white/[0.08] hover:border-white/20 hover:text-white"
              }`}
            >
              {cat.name} <span className="opacity-70 font-mono text-[10px]">({cat._count.courses})</span>
            </Link>
          );
        })}
      </div>

      {/* Difficulty Filters */}
      <div className="flex items-center justify-between py-4 text-xs font-mono">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="font-semibold text-[#7F8CA8] mr-1">DIFFICULTY:</span>
          {["all", "BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((diff) => (
            <Link
              key={diff}
              href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(category !== "all" ? { category } : {}), difficulty: diff })}`}
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all whitespace-nowrap tactile-button ${
                difficulty === diff
                  ? "bg-cyan-950/70 text-[#00F0FF] border border-cyan-500/40 shadow-xs"
                  : "bg-[#0d1629]/70 text-[#7F8CA8] border border-white/[0.08] hover:border-white/20 hover:text-white"
              }`}
            >
              {diff === "all" ? "All Levels" : diff.replace("_", " ")}
            </Link>
          ))}
        </div>

        <p className="text-[#7F8CA8] text-xs hidden sm:block">
          Showing <span className="font-bold text-[#F5F7FF]">{pagination.total}</span> vetted courses
        </p>
      </div>

      {/* Listing Grid (4-up on desktop) */}
      {courses.length === 0 ? (
        <div className="text-center py-20 bg-[#0d1629] rounded-3xl border border-blue-500/20 my-8 p-8">
          <BookOpen className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#F5F7FF]">No courses found</h3>
          <p className="text-sm text-[#A8B4CC] mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or clearing filter tags.
          </p>
          <Link
            href="/explore"
            className="inline-flex mt-6 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
          {courses.map((course, idx) => {
            const totalLessons = course.totalLessons || 0;
            const rating = (4.84 + (idx % 15) * 0.01).toFixed(2);

            return (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="group flex flex-col p-3.5 rounded-3xl transition-all duration-300 tactile-button hover:-translate-y-1 hover:border-cyan-400/40"
                style={{
                  background: "rgba(10, 17, 34, 0.72)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 16px 36px -12px rgba(0, 0, 0, 0.5)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* Image plate — Contained with explicit aspect-[4/3] */}
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#07101f] border border-white/[0.08] mb-3.5">
                  {course.thumbnailUrl ? (
                    <Image
                      src={course.thumbnailUrl}
                      alt={course.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#07101f]">
                      <BookOpen className="w-10 h-10 text-blue-500/40" />
                    </div>
                  )}

                  {/* Difficulty Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#050816]/85 backdrop-blur-md text-[#00F0FF] shadow-xs border border-cyan-500/40">
                      {course.difficulty ? course.difficulty.replace("_", " ") : "All Levels"}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white/80 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
                      <Heart className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Course Metadata */}
                <div className="px-1.5 pb-1 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#7F8CA8] font-medium mb-1">
                      <span className="truncate text-[#00F0FF] font-mono text-[11px] font-semibold">{course.category?.name || "Open Studies"}</span>
                      <div className="flex items-center gap-1 text-[#F5F7FF] font-semibold font-mono text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="metric-mono">{rating}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-[#F5F7FF] text-base leading-snug group-hover:text-blue-300 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                  </div>

                  <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#A8B4CC] font-mono">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#7F8CA8]" />
                      <span className="metric-mono">{totalLessons} lessons</span>
                    </div>
                    {course.estimatedHours ? (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#7F8CA8]" />
                        <span className="metric-mono">{course.estimatedHours}h</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
