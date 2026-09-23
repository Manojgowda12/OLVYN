"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Menu, X, BookOpen, Shield, PenTool, LogOut, LayoutDashboard } from "lucide-react";

interface SessionUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface NavLinksProps {
  session: SessionUser | null;
}

export function NavLinks({ session }: NavLinksProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Deterministic active state determinations
  const isHomeActive = pathname === "/";
  const isExploreActive = pathname === "/explore" || pathname.startsWith("/explore?") || pathname.startsWith("/courses");
  const isStudioActive = pathname.startsWith("/contributor");
  const isDashboardActive = pathname.startsWith("/dashboard");
  const isAdminActive = pathname.startsWith("/admin");
  const isNovaActive = pathname.startsWith("/nova");

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 text-[13px]" aria-label="Main Navigation">
        <Link
          href="/"
          prefetch={true}
          className={`px-3.5 py-1.5 rounded-full transition-all duration-200 tactile-button ${
            isHomeActive
              ? "text-[#F5F7FF] bg-white/[0.08] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.3)] font-semibold"
              : "text-[#A8B4CC] hover:text-[#F5F7FF] hover:bg-white/[0.05] border border-transparent font-medium"
          }`}
          aria-current={isHomeActive ? "page" : undefined}
        >
          Home
        </Link>

        <Link
          href="/explore"
          prefetch={true}
          className={`px-3.5 py-1.5 rounded-full transition-all duration-200 tactile-button ${
            isExploreActive
              ? "text-[#F5F7FF] bg-white/[0.08] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.3)] font-semibold"
              : "text-[#A8B4CC] hover:text-[#F5F7FF] hover:bg-white/[0.05] border border-transparent font-medium"
          }`}
          aria-current={isExploreActive ? "page" : undefined}
        >
          Explore
        </Link>

        {session && (
          <Link
            href="/dashboard"
            prefetch={true}
            className={`px-3.5 py-1.5 rounded-full transition-all duration-200 tactile-button ${
              isDashboardActive
                ? "text-[#F5F7FF] bg-white/[0.08] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.3)] font-semibold"
                : "text-[#A8B4CC] hover:text-[#F5F7FF] hover:bg-white/[0.05] border border-transparent font-medium"
            }`}
            aria-current={isDashboardActive ? "page" : undefined}
          >
            Dashboard
          </Link>
        )}

        <Link
          href="/contributor"
          prefetch={true}
          className={`px-3.5 py-1.5 rounded-full transition-all duration-200 tactile-button ${
            isStudioActive
              ? "text-[#F5F7FF] bg-white/[0.08] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.3)] font-semibold"
              : "text-[#A8B4CC] hover:text-[#F5F7FF] hover:bg-white/[0.05] border border-transparent font-medium"
          }`}
          aria-current={isStudioActive ? "page" : undefined}
        >
          Studio
        </Link>

        {session?.role === "ADMIN" && (
          <Link
            href="/admin"
            prefetch={true}
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 tactile-button ${
              isAdminActive
                ? "text-[#F5F7FF] bg-white/[0.08] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.3)] font-semibold"
                : "text-[#A8B4CC] hover:text-[#F5F7FF] hover:bg-white/[0.05] border border-transparent font-medium"
            }`}
            aria-current={isAdminActive ? "page" : undefined}
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Admin</span>
          </Link>
        )}

        <Link
          href="/nova"
          prefetch={true}
          className={`px-3.5 py-1.5 rounded-full flex items-center gap-2 transition-all duration-200 tactile-button ${
            isNovaActive
              ? "text-[#F5F7FF] bg-cyan-500/15 border border-cyan-400/30 shadow-[inset_0_1px_0_rgba(6,182,212,0.2),0_2px_12px_rgba(6,182,212,0.25)] font-semibold"
              : "text-[#A8B4CC] hover:text-[#F5F7FF] hover:bg-white/[0.05] border border-transparent font-medium"
          }`}
          aria-current={isNovaActive ? "page" : undefined}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Nova AI</span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/35 text-cyan-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
            </span>
            Live
          </span>
        </Link>
      </nav>

      {/* Mobile Hamburger Button */}
      <div className="flex md:hidden items-center">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-full text-[#A8B4CC] hover:text-[#EAF2FF] border border-blue-500/20 hover:border-blue-500/40 transition-colors focus:outline-none"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-[72px] p-5 border-b shadow-2xl flex flex-col gap-3 transition-all z-50"
          style={{
            background: "rgba(5, 12, 30, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottomColor: "rgba(37, 99, 235, 0.25)",
          }}
        >
          <Link
            href="/"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              isHomeActive
                ? "bg-blue-600/20 text-[#F5F7FF] border border-blue-500/40"
                : "text-[#A8B4CC] hover:text-[#EAF2FF] hover:bg-white/[0.06]"
            }`}
          >
            <span>Home</span>
            {isHomeActive && <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
          </Link>

          <Link
            href="/explore"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              isExploreActive
                ? "bg-blue-600/20 text-[#F5F7FF] border border-blue-500/40"
                : "text-[#A8B4CC] hover:text-[#EAF2FF] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Explore Courses</span>
            </div>
            {isExploreActive && <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
          </Link>

          <Link
            href="/contributor"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              isStudioActive
                ? "bg-blue-600/20 text-[#F5F7FF] border border-blue-500/40"
                : "text-[#A8B4CC] hover:text-[#EAF2FF] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-blue-400" />
              <span>Studio</span>
            </div>
            {isStudioActive && <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
          </Link>

          {session && (
            <Link
              href="/dashboard"
              prefetch={true}
              onClick={closeMobileMenu}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isDashboardActive
                  ? "bg-blue-600/20 text-[#F5F7FF] border border-blue-500/40"
                  : "text-[#A8B4CC] hover:text-[#EAF2FF] hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>Dashboard</span>
              </div>
              {isDashboardActive && <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
            </Link>
          )}

          {session?.role === "ADMIN" && (
            <Link
              href="/admin"
              prefetch={true}
              onClick={closeMobileMenu}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isAdminActive
                  ? "bg-blue-600/20 text-[#F5F7FF] border border-blue-500/40"
                  : "text-[#A8B4CC] hover:text-[#EAF2FF] hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Admin Portal</span>
              </div>
              {isAdminActive && <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
            </Link>
          )}

          <Link
            href="/nova"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              isNovaActive
                ? "bg-cyan-600/20 text-[#F5F7FF] border border-cyan-500/40"
                : "text-[#A8B4CC] hover:text-[#EAF2FF] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Nova AI Tutor</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-full">
              Live
            </span>
          </Link>

          {/* User Auth Section in Mobile Drawer */}
          {session ? (
            <div className="mt-2 pt-3 border-t border-blue-900/30 flex flex-col gap-2">
              <div className="flex items-center justify-between px-2 text-xs font-semibold text-[#A8B4CC]">
                <span>Signed in as <strong className="text-[#F5F7FF]">{session.name}</strong></span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-500/30 text-blue-300">
                  {session.role}
                </span>
              </div>
              <form action="/api/auth/logout" method="POST" onSubmit={closeMobileMenu} className="w-full">
                <button
                  type="submit"
                  className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-2 pt-3 border-t border-blue-900/30 flex flex-col sm:flex-row gap-2">
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="flex-1 text-center py-2.5 rounded-xl border border-blue-500/40 bg-blue-950/40 text-[#F5F7FF] font-semibold text-sm hover:bg-blue-900/40 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={closeMobileMenu}
                className="flex-1 text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
