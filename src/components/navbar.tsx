import Link from "next/link";
import { getSession } from "@/lib/auth";
import { BookOpen, Sparkles, PenTool, Globe, Menu, User, ShieldAlert, LogOut, LayoutDashboard } from "lucide-react";

import { NavLinks } from "./nav-links";

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto h-20 px-6 lg:px-12 flex items-center justify-between">
        {/* Brand Wordmark with vibrant badge dot */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-[#d2f835] shadow-xs group-hover:rotate-6 transition-transform">
            <BookOpen className="w-5 h-5 text-[#d2f835]" />
          </div>
          <span className="font-extrabold text-[22px] tracking-tight text-slate-900">
            OpenLearner<span className="text-[#d2f835] bg-slate-900 px-1 rounded-sm ml-0.5 text-sm font-black">AI</span>
          </span>
        </Link>

        {/* Center & Mobile Navigation Links with Active Detection */}
        <NavLinks session={session} />

        {/* Right Action Pill */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
              <Link
                href={session.role === "ADMIN" ? "/admin" : session.role === "CONTRIBUTOR" ? "/contributor" : "/dashboard"}
                className="flex items-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-full bg-[#121417] text-[#d2f835] flex items-center justify-center text-xs font-black uppercase shadow-xs">
                  {session.name.charAt(0)}
                </div>
                <span className="text-xs font-bold text-[#121417] max-w-[90px] truncate hidden sm:inline-block">
                  {session.name.split(" ")[0]}
                </span>
              </Link>
              <form action="/api/auth/logout" method="POST" className="inline" suppressHydrationWarning>
                <button
                  type="submit"
                  title="Sign Out"
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                  suppressHydrationWarning
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-[14px] font-bold text-[#121417] hover:underline px-2 py-1"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-[14px] font-bold bg-white hover:bg-slate-50 text-[#121417] px-6 py-2.5 rounded-full border border-black/10 shadow-xs hover:shadow-sm transition-all"
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
