"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Menu, X, BookOpen, Compass, Layers, Shield, PenTool } from "lucide-react";

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

  // Active state determinations
  const isHomeActive = pathname === "/";
  const isCoursesActive = pathname.startsWith("/explore") || pathname.startsWith("/courses");
  const isNovaActive = pathname.startsWith("/nova");
  const isStudioActive = pathname.startsWith("/contributor");
  const isAdminActive = pathname.startsWith("/admin");

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
            isCoursesActive
              ? "bg-slate-900 text-white shadow-xs font-bold"
              : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          }`}
          aria-current={isCoursesActive ? "page" : undefined}
        >
          Courses
        </Link>

        <Link
          href="/#categories"
          className="px-3 py-1.5 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
        >
          Categories
        </Link>

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

        {/* Role-aware link: Admin if ADMIN, else Studio */}
        {session?.role === "ADMIN" ? (
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
        ) : (
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
        )}
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
        <div className="absolute top-20 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xl py-5 px-6 md:hidden flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
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
            className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
              isCoursesActive
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span>Explore Courses</span>
            {isCoursesActive && <span className="w-2 h-2 rounded-full bg-[#d2f835]" />}
          </Link>

          <Link
            href="/#categories"
            onClick={closeMobileMenu}
            className="flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all"
          >
            <span>Categories</span>
          </Link>

          <Link
            href="/nova"
            prefetch={true}
            onClick={closeMobileMenu}
            className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
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

          {session?.role === "ADMIN" ? (
            <Link
              href="/admin"
              prefetch={true}
              onClick={closeMobileMenu}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                isAdminActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-amber-800 bg-amber-50/60 hover:bg-amber-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Admin Portal</span>
              </div>
            </Link>
          ) : (
            <Link
              href="/contributor"
              prefetch={true}
              onClick={closeMobileMenu}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                isStudioActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-800 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-slate-700" />
                <span>Creator Studio</span>
              </div>
            </Link>
          )}

          {session && (
            <Link
              href={session.role === "ADMIN" ? "/admin" : session.role === "CONTRIBUTOR" ? "/contributor" : "/dashboard"}
              prefetch={true}
              onClick={closeMobileMenu}
              className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-600"
            >
              <span>Logged in as {session.name}</span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                {session.role}
              </span>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
