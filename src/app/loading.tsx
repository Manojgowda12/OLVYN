export default function RootLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 animate-in fade-in duration-150">
      <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
        {/* Animated Pill Indicator */}
        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-[#d2f835] flex items-center justify-center shadow-md animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d2f835]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-200 rounded-full mx-auto animate-pulse" />
          <div className="h-3 w-48 bg-slate-100 rounded-full mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  );
}
