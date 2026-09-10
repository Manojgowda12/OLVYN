import Link from "next/link";
import { getSession } from "@/lib/auth";
import { BookOpen, Sparkles, User, LogOut, LayoutDashboard, ShieldAlert, PenTool } from "lucide-react";

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>
              Open<span className="text-blue-400">Learner</span>
              <span className="text-xs ml-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/explore"
              className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              Explore Courses
            </Link>
            <Link
              href="/#nova"
              className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              Nova AI
            </Link>
          </nav>
        </div>

        {/* User / Auth Controls */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              {session.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Admin Console
                </Link>
              )}

              {(session.role === "CONTRIBUTOR" || session.role === "ADMIN") && (
                <Link
                  href="/contributor"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Creator Studio
                </Link>
              )}

              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700/60"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">My Dashboard</span>
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-medium text-slate-200 leading-tight">{session.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{session.role}</p>
                </div>

                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    title="Sign Out"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
