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
      <nav className="hidden md:flex items-center gap-2 lg:gap-3 text-[14px] font-semibold text-slate-700" aria-label="Main Navigation">
        <Link
          href="/"
          prefetch={true}
          className={`px-3 py-1.5 rounded-full transition-all duration-200 ${
            isHomeActive
              ? "bg-slate-900 text-white shadow-xs font-bold"
              : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          }`}
          aria-current={isHomeActive ? "page" : undefined}
        >
          Home
        </Link>

        <Link
          href="/explore"
          prefetch={true}
          className={`px-3 py-1.5 rounded-full transition-all duration-200 ${
            isExploreActive
              ? "bg-slate-900 text-white shadow-xs font-bold"
              : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          }`}
          aria-current={isExploreActive ? "page" : undefined}
        >
          Explore
        </Link>

        {session && (
          <Link
            href="/dashboard"
            prefetch={true}
            className={`px-3 py-1.5 rounded-full transition-all duration-200 ${
              isDashboardActive
                ? "bg-slate-900 text-white shadow-xs font-bold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
            aria-current={isDashboardActive ? "page" : undefined}
          >
            Dashboard
          </Link>
        )}

        <Link
          href="/contributor"
          prefetch={true}
          className={`px-3 py-1.5 rounded-full transition-all duration-200 ${
            isStudioActive
              ? "bg-slate-900 text-white shadow-xs font-bold"
              : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          }`}
          aria-current={isStudioActive ? "page" : undefined}
        >
          Studio
        </Link>

        {session?.role === "ADMIN" && (
          <Link
            href="/admin"
            prefetch={true}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 ${
              isAdminActive
                ? "bg-slate-900 text-white shadow-xs font-bold"
                : "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
            }`}
            aria-current={isAdminActive ? "page" : undefined}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </Link>
        )}

        <Link
          href="/nova"
          prefetch={true}
          className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 ${
            isNovaActive
              ? "bg-slate-900 text-white shadow-xs font-bold"
              : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          }`}
          aria-current={isNovaActive ? "page" : undefined}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isNovaActive ? "text-[#d2f835]" : "text-slate-900"}`} />
          <span>Nova AI</span>
          <span className="text-[10px] font-black uppercase tracking-wider bg-[#d2f835] text-slate-900 px-1.5 py-0.2 rounded-full flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse"></span>
            Live
          </span>
        </Link>
      </nav>

      {/* Mobile Hamburger Button */}
      <div className="flex md:hidden items-center">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-20 left-0 w-full bg-white/98 backdrop-blur-xl border-b border-slate-200 shadow-xl py-5 px-6 md:hidden flex flex-col gap-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-2.5 rounded-2xl font-bold text-sm transition-all ${
              isHomeActive
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span>Home</span>
            {isHomeActive && <span className="w-2 h-2 rounded-full bg-[#d2f835]" />}
          </Link>

          <Link
            href="/explore"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-2.5 rounded-2xl font-bold text-sm transition-all ${
              isExploreActive
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span>Explore</span>
            {isExploreActive && <span className="w-2 h-2 rounded-full bg-[#d2f835]" />}
          </Link>

          <Link
            href="/contributor"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-2.5 rounded-2xl font-bold text-sm transition-all ${
              isStudioActive
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-slate-700" />
              <span>Studio</span>
            </div>
            {isStudioActive && <span className="w-2 h-2 rounded-full bg-[#d2f835]" />}
          </Link>

          {session && (
            <Link
              href="/dashboard"
              prefetch={true}
              onClick={closeMobileMenu}
              className={`flex items-center justify-between px-4 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                isDashboardActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-800 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-slate-700" />
                <span>Dashboard</span>
              </div>
              {isDashboardActive && <span className="w-2 h-2 rounded-full bg-[#d2f835]" />}
            </Link>
          )}

          {session?.role === "ADMIN" && (
            <Link
              href="/admin"
              prefetch={true}
              onClick={closeMobileMenu}
              className={`flex items-center justify-between px-4 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                isAdminActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-amber-800 bg-amber-50/60 hover:bg-amber-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Admin Portal</span>
              </div>
              {isAdminActive && <span className="w-2 h-2 rounded-full bg-[#d2f835]" />}
            </Link>
          )}

          <Link
            href="/nova"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-2.5 rounded-2xl font-bold text-sm transition-all ${
              isNovaActive
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-900" />
              <span>Nova AI Tutor</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#d2f835] text-slate-900 px-2 py-0.5 rounded-full">
              Live
            </span>
          </Link>

          {/* User Auth Section in Mobile Drawer */}
          {session ? (
            <div className="mt-2 pt-3 border-t border-slate-200 flex flex-col gap-2">
              <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-600">
                <span>Signed in as <strong className="text-slate-900">{session.name}</strong></span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                  {session.role}
                </span>
              </div>
              <form action="/api/auth/logout" method="POST" onSubmit={closeMobileMenu} className="w-full">
                <button
                  type="submit"
                  className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-2 pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={closeMobileMenu}
                className="flex-1 text-center py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-black transition-colors"
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
