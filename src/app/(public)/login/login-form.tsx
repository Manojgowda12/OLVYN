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

  const quickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-[#d2f835] shadow-md mb-4 hover:scale-105 transition-transform">
            <BookOpen className="w-6 h-6 text-[#d2f835]" />
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Welcome back</h1>
          <p className="text-sm font-medium text-slate-600 mt-1.5">
            Sign in to continue learning, teaching, and managing courses
          </p>
        </div>

        {/* Card */}
        <div className="p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In */}
          <a
            href={`/api/auth/google?next=${encodeURIComponent(redirect)}`}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200/90 shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer mb-5 active:scale-[0.99]"
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
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Or continue with email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@openlearner.ai"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] focus:ring-1 focus:ring-[#121417] transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#121417]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] focus:ring-1 focus:ring-[#121417] transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-full bg-[#121417] hover:bg-black disabled:opacity-60 text-[#d2f835] font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              suppressHydrationWarning
            >
              <span>{isLoading ? "Signing in..." : "Sign In to OLVYN"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick autofill for developer & admin testing */}
          <div className="mt-7 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Quick Test Accounts (Click to Fill):</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickFill("admin@openlearner.ai", "AdminSecure2026!")}
                className="px-2.5 py-2 rounded-xl bg-[#121417] hover:bg-black text-[#d2f835] text-center text-xs font-black transition-all shadow-xs"
                suppressHydrationWarning
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => quickFill("contributor@openlearner.ai", "Contributor123!")}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#121417] text-center text-xs font-bold transition-all border border-slate-200"
                suppressHydrationWarning
              >
                Contributor
              </button>
              <button
                type="button"
                onClick={() => quickFill("learner@openlearner.ai", "Learner123!")}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#121417] text-center text-xs font-bold transition-all border border-slate-200"
                suppressHydrationWarning
              >
                Learner
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm font-medium text-slate-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#121417] hover:underline font-bold">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}

