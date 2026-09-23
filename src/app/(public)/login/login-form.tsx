"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Lock, Mail, ArrowRight, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTestAccount, setSelectedTestAccount] = useState<"admin" | "contributor" | "learner" | null>("admin");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }

      // Sanitize redirect target (must be strictly relative path, no open redirects)
      let safeRedirect = "/dashboard";
      if (
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//") &&
        !redirect.startsWith("/\\") &&
        !redirect.includes(":")
      ) {
        try {
          const parsed = new URL(redirect, "http://localhost");
          if (parsed.origin === "http://localhost") {
            safeRedirect = parsed.pathname + parsed.search;
          }
        } catch {
          safeRedirect = "/dashboard";
        }
      }

      let targetUrl = safeRedirect;
      if (data.user?.role === "ADMIN" && (safeRedirect === "/dashboard" || safeRedirect === "/explore")) {
        targetUrl = "/admin";
      } else if (data.user?.role === "CONTRIBUTOR" && (safeRedirect === "/dashboard" || safeRedirect === "/explore")) {
        targetUrl = "/contributor";
      }

      // Full document navigation ensures session cookie is refreshed and server layout updates immediately
      window.location.href = targetUrl;
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  const quickFill = (account: "admin" | "contributor" | "learner", demoEmail: string, demoPass: string) => {
    setSelectedTestAccount(account);
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[90dvh] flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Background ambient aurora lighting */}
      <div className="aurora-1" style={{ top: "-50px", left: "20%" }} />
      <div className="aurora-2" style={{ bottom: "0px", right: "15%" }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/35 text-cyan-400 shadow-[0_0_20px_rgba(37,99,235,0.3)] mb-4 hover:scale-105 transition-transform tactile-button">
            <BookOpen className="w-6 h-6 text-cyan-400" />
          </Link>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#00F0FF] mb-1.5">
            AUTHENTICATION // SECURE PORTAL
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F5F7FF]">Welcome back</h1>
          <p className="text-sm font-medium text-[#A8B4CC] mt-1.5">
            Sign in to continue learning, teaching, and managing courses
          </p>
        </div>

        {/* Card */}
        <div
          className="p-7 sm:p-9 rounded-3xl border transition-all"
          style={{
            background: "rgba(10, 18, 36, 0.8)",
            borderColor: "rgba(255, 255, 255, 0.09)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 24px 48px -15px rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(16px)",
          }}
        >
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In */}
          <a
            href={`/api/auth/google?next=${encodeURIComponent(redirect)}`}
            className="w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F7FF] font-semibold text-sm border border-white/10 shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer mb-5 tactile-button active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </a>

          <div className="relative flex py-1 items-center mb-5">
            <div className="flex-grow border-t border-white/[0.08]"></div>
            <span className="flex-shrink mx-3 text-[10px] font-mono font-bold text-[#7F8CA8] uppercase tracking-wider">Or continue with email</span>
            <div className="flex-grow border-t border-white/[0.08]"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A8B4CC] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7F8CA8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@openlearner.ai"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#050816]/75 border border-white/10 text-[#F5F7FF] placeholder-[#7F8CA8] text-sm font-medium focus:bg-[#070d1e] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A8B4CC]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7F8CA8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#050816]/75 border border-white/10 text-[#F5F7FF] placeholder-[#7F8CA8] text-sm font-medium focus:bg-[#070d1e] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 text-white font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer tactile-button"
              suppressHydrationWarning
            >
              <span>{isLoading ? "Signing in..." : "Sign In to OLVYN"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick autofill for developer & admin testing */}
          <div className="mt-7 pt-5 border-t border-white/[0.08]">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#7F8CA8] mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>TEST ACCOUNTS (CLICK TO AUTO-FILL):</span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => quickFill("admin", "admin@openlearner.ai", "AdminSecure2026!")}
                className={
                  selectedTestAccount === "admin"
                    ? "px-2.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 text-center text-xs font-bold transition-all border border-blue-500/30 tactile-button cursor-pointer"
                    : "px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F7FF] text-center text-xs font-semibold transition-all border border-white/10 tactile-button cursor-pointer"
                }
                suppressHydrationWarning
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => quickFill("contributor", "contributor@openlearner.ai", "Contributor123!")}
                className={
                  selectedTestAccount === "contributor"
                    ? "px-2.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 text-center text-xs font-bold transition-all border border-blue-500/30 tactile-button cursor-pointer"
                    : "px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F7FF] text-center text-xs font-semibold transition-all border border-white/10 tactile-button cursor-pointer"
                }
                suppressHydrationWarning
              >
                Contributor
              </button>
              <button
                type="button"
                onClick={() => quickFill("learner", "learner@openlearner.ai", "Learner123!")}
                className={
                  selectedTestAccount === "learner"
                    ? "px-2.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 text-center text-xs font-bold transition-all border border-blue-500/30 tactile-button cursor-pointer"
                    : "px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F7FF] text-center text-xs font-semibold transition-all border border-white/10 tactile-button cursor-pointer"
                }
                suppressHydrationWarning
              >
                Learner
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm font-medium text-[#7F8CA8] mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-bold">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}

