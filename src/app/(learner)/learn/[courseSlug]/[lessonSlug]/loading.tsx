export default function LearnPlayerLoading() {
  return (
    <div className="w-full min-h-screen bg-[#0d1117] text-slate-100 flex flex-col lg:flex-row animate-in fade-in duration-150">
      {/* Main Content Area */}
      <div className="flex-1 px-6 lg:px-12 py-8 max-w-4xl space-y-8">
        {/* Top Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-24 bg-slate-800 rounded-full animate-pulse" />
          <span className="text-slate-700">/</span>
          <div className="h-3 w-32 bg-slate-800 rounded-full animate-pulse" />
        </div>

        {/* Lesson Header Skeleton */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <div className="h-3 w-28 bg-emerald-500/20 rounded-full animate-pulse" />
          <div className="h-8 w-3/4 bg-slate-800 rounded-xl animate-pulse" />
        </div>

        {/* Lesson Content Lines Skeleton */}
        <div className="space-y-4 pt-2">
          <div className="h-4 w-full bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-4 w-5/6 bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-4 w-4/6 bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-32 w-full bg-slate-800/40 rounded-2xl border border-slate-800 animate-pulse my-6" />
          <div className="h-4 w-full bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-4 w-3/4 bg-slate-800/80 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Sidebar Curriculum Skeleton */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 space-y-4 bg-slate-900/40">
        <div className="h-4 w-36 bg-slate-800 rounded-full animate-pulse mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="h-3 w-20 bg-slate-800 rounded-full animate-pulse" />
            <div className="h-4 w-full bg-slate-700/60 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
