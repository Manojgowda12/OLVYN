export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full animate-in fade-in duration-150">
      {/* Welcome Banner Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-blue-500/20 rounded-full animate-pulse" />
          <div className="h-8 w-60 bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-4 w-80 bg-slate-800/60 rounded-md animate-pulse" />
        </div>
        <div className="h-10 w-44 bg-blue-600/30 rounded-xl animate-pulse" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-800 animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-24 bg-slate-800 rounded-full animate-pulse" />
              <div className="h-6 w-12 bg-slate-700 rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Enrolled Courses Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-44 bg-slate-800 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4"
            >
              <div className="h-4 w-28 bg-slate-800 rounded-full animate-pulse" />
              <div className="h-5 w-4/5 bg-slate-700 rounded-md animate-pulse" />
              <div className="h-2 w-full bg-slate-800 rounded-full animate-pulse" />
              <div className="h-10 w-full bg-slate-800 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
