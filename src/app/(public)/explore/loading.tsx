export default function ExploreLoading() {
  return (
    <div className="min-h-screen text-slate-900 py-10 px-6 lg:px-12 max-w-7xl mx-auto w-full animate-in fade-in duration-150">
      {/* Top Filter & Search Section Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200/80">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-rose-100 rounded-full animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-10 w-full md:w-80 bg-slate-100 rounded-full border border-slate-200 animate-pulse" />
      </div>

      {/* Category Pills Strip Skeleton */}
      <div className="flex items-center gap-2.5 overflow-x-auto py-4 border-b border-slate-200/70">
        <div className="h-7 w-24 bg-slate-900 rounded-full shrink-0 animate-pulse" />
        <div className="h-7 w-28 bg-slate-100 rounded-full shrink-0 border border-slate-200 animate-pulse" />
        <div className="h-7 w-32 bg-slate-100 rounded-full shrink-0 border border-slate-200 animate-pulse" />
        <div className="h-7 w-24 bg-slate-100 rounded-full shrink-0 border border-slate-200 animate-pulse" />
        <div className="h-7 w-36 bg-slate-100 rounded-full shrink-0 border border-slate-200 animate-pulse" />
        <div className="h-7 w-28 bg-slate-100 rounded-full shrink-0 border border-slate-200 animate-pulse" />
      </div>

      {/* Difficulty Filters Skeleton */}
      <div className="flex items-center justify-between py-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 bg-rose-50 rounded-full border border-rose-200 animate-pulse" />
          <div className="h-6 w-20 bg-slate-100 rounded-full border border-slate-200 animate-pulse" />
          <div className="h-6 w-24 bg-slate-100 rounded-full border border-slate-200 animate-pulse" />
          <div className="h-6 w-20 bg-slate-100 rounded-full border border-slate-200 animate-pulse" />
        </div>
        <div className="h-4 w-32 bg-slate-100 rounded-full animate-pulse hidden sm:block" />
      </div>

      {/* Course Cards Grid Skeleton (8-up) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
          >
            {/* Image Skeleton */}
            <div className="aspect-4/3 w-full rounded-xl bg-slate-200 animate-pulse mb-3.5" />

            {/* Metadata Skeleton */}
            <div className="px-1.5 pb-1 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-3 w-10 bg-slate-200 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-full bg-slate-200 rounded-md animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-100 rounded-md animate-pulse" />
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-3 w-10 bg-slate-100 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
