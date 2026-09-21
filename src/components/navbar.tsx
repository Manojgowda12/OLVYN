import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { LogOut } from "lucide-react";

import { NavLinks } from "./nav-links";

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto h-20 px-6 lg:px-12 flex items-center justify-between">
        {/* Brand Logo + Wordmark */}
        <Link href="/" prefetch={true} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#050812] flex-shrink-0 overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200">
            <Image
              src="/logo.jpg"
              alt="OpenLearnerAI"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <span className="font-extrabold text-[22px] tracking-tight text-slate-900">
            OpenLearner<span className="text-[#d2f835] bg-slate-900 px-1 rounded-sm ml-0.5 text-sm font-black">AI</span>
          </span>
        </Link>

        {/* Center & Mobile Navigation Links with Active Detection */}
        <NavLinks session={session} />

        {/* Right Action Pill */}
        <div className="hidden sm:flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
              <Link
                href={session.role === "ADMIN" ? "/admin" : session.role === "CONTRIBUTOR" ? "/contributor" : "/dashboard"}
                prefetch={true}
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
