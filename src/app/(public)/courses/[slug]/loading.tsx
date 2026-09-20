export default function CourseDetailsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full text-slate-900 animate-in fade-in duration-150">
      {/* Breadcrumbs Skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-3 w-14 bg-slate-200 rounded-full animate-pulse" />
        <span className="text-slate-300">/</span>
        <div className="h-3 w-20 bg-slate-200 rounded-full animate-pulse" />
        <span className="text-slate-300">/</span>
        <div className="h-3 w-40 bg-slate-200 rounded-full animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-10">
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="h-6 w-24 bg-rose-50 rounded-full border border-rose-200 animate-pulse" />
              <div className="h-6 w-20 bg-slate-100 rounded-full border border-slate-200 animate-pulse" />
            </div>
            <div className="h-9 w-4/5 bg-slate-200 rounded-xl mb-3 animate-pulse" />
            <div className="h-4 w-full bg-slate-100 rounded-md mb-2 animate-pulse" />
            <div className="h-4 w-3/5 bg-slate-100 rounded-md animate-pulse" />

            <div className="flex items-center gap-3.5 mt-6 pt-5 border-t border-slate-200/80">
              <div className="w-11 h-11 rounded-full bg-slate-200 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-24 bg-slate-200 rounded-full animate-pulse" />
                <div className="h-4 w-32 bg-slate-300 rounded-md animate-pulse" />
              </div>
            </div>
          </div>

          {/* Description Skeleton */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200/80 space-y-3">
            <div className="h-5 w-40 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-4 w-full bg-slate-100 rounded-md animate-pulse" />
            <div className="h-4 w-5/6 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-4 w-4/6 bg-slate-100 rounded-md animate-pulse" />
          </div>

          {/* Syllabus Modules Skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-52 bg-slate-200 rounded-md animate-pulse mb-4" />
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden"
              >
                <div className="p-4 bg-slate-50 flex items-center justify-between border-b border-slate-200/70">
                  <div className="space-y-1">
                    <div className="h-3 w-16 bg-rose-100 rounded-full animate-pulse" />
                    <div className="h-4 w-48 bg-slate-200 rounded-md animate-pulse" />
                  </div>
                  <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-slate-100 rounded-md animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded-md animate-pulse" />
                  <div className="h-4 w-4/5 bg-slate-100 rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-6">
            <div className="aspect-video w-full rounded-2xl bg-slate-200 animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-100 rounded-md animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 rounded-md animate-pulse" />
            </div>
            <div className="h-12 w-full bg-slate-900 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
