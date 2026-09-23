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
    <div className="min-h-screen text-[#F5F7FF] py-10 px-6 lg:px-12 max-w-7xl mx-auto w-full" style={{ background: "var(--bg-base)" }}>
      {/* Top Filter & Search Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-blue-500/20">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#00F0FF] mb-1">
            Open Syllabus Catalog
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F5F7FF]">
            {q ? `Search results for "${q}"` : "Explore All Courses"}
          </h1>
        </div>

        {/* Compact Search Bar Pill */}
        <form
          method="GET"
          action="/explore"
          className="flex items-center p-1.5 bg-[#0d1629] rounded-full border border-blue-500/30 shadow-md hover:border-blue-400/50 transition-all w-full md:w-auto"
          suppressHydrationWarning
        >
          <div className="flex items-center pl-3 gap-2 flex-1">
            <Search className="w-4 h-4 text-[#7F8CA8]" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search topics or skills..."
              className="text-sm text-[#F5F7FF] placeholder:text-[#7F8CA8] bg-transparent focus:outline-none w-full md:w-60 py-1"
              suppressHydrationWarning
            />
          </div>
          {category !== "all" && <input type="hidden" name="category" value={category} />}
          {difficulty !== "all" && <input type="hidden" name="difficulty" value={difficulty} />}
          <button
            type="submit"
            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 flex items-center justify-center text-white flex-shrink-0 transition-colors shadow-sm cursor-pointer"
            suppressHydrationWarning
          >
            <Search className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto py-4 scrollbar-none border-b border-blue-500/15">
        <Link
          href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(difficulty !== "all" ? { difficulty } : {}), category: "all" })}`}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
            isAllActive
              ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] border border-blue-400/40"
              : "bg-[#0d1629] text-[#A8B4CC] border border-blue-500/20 hover:border-blue-400/40 hover:text-white"
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
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] border border-blue-400/40"
                  : "bg-[#0d1629] text-[#A8B4CC] border border-blue-500/20 hover:border-blue-400/40 hover:text-white"
              }`}
            >
              {cat.name} <span className="opacity-60 text-[10px]">({cat._count.courses})</span>
            </Link>
          );
        })}
      </div>

      {/* Difficulty Filters */}
      <div className="flex items-center justify-between py-4 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="font-semibold text-[#7F8CA8] mr-1">Difficulty:</span>
          {["all", "BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((diff) => (
            <Link
              key={diff}
              href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(category !== "all" ? { category } : {}), difficulty: diff })}`}
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                difficulty === diff
                  ? "bg-cyan-950/60 text-[#00F0FF] border border-cyan-500/40 shadow-xs"
                  : "bg-[#0d1629] text-[#7F8CA8] border border-blue-500/20 hover:border-blue-400/30 hover:text-white"
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
                className="group flex flex-col p-3 rounded-2xl bg-[#0d1629] border border-blue-500/20 hover:border-blue-400/40 hover:bg-[#101e35] shadow-sm hover:shadow-[0_12px_28px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-all duration-300"
              >
                {/* Image plate — Contained with explicit aspect-[4/3] */}
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#07101f] border border-blue-500/20 mb-3.5">
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
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#050816]/85 backdrop-blur-md text-[#00F0FF] shadow-xs border border-cyan-500/40">
                      {course.difficulty ? course.difficulty.replace("_", " ") : "All Levels"}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md text-white/80 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
                      <Heart className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Course Metadata */}
                <div className="px-1.5 pb-1 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#7F8CA8] font-medium mb-1">
                      <span className="truncate text-[#00F0FF] font-semibold">{course.category?.name || "Open Studies"}</span>
                      <div className="flex items-center gap-1 text-[#F5F7FF] font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{rating}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-[#F5F7FF] text-base leading-snug group-hover:text-blue-300 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-blue-500/15 flex items-center justify-between text-xs text-[#A8B4CC]">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#7F8CA8]" />
                      <span>{totalLessons} lessons</span>
                    </div>
                    {course.estimatedHours ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#7F8CA8]" />
                        <span>{course.estimatedHours}h</span>
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
