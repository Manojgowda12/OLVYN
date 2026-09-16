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

      // Check role to redirect appropriately if default
      if (data.user?.role === "ADMIN" && (redirect === "/dashboard" || redirect === "/explore")) {
        router.push("/admin");
      } else if (data.user?.role === "CONTRIBUTOR" && (redirect === "/dashboard" || redirect === "/explore")) {
        router.push("/contributor");
      } else {
        router.push(redirect);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#f6f8f5]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#121417] text-[#d2f835] shadow-md mb-4 hover:scale-105 transition-transform">
            <BookOpen className="w-6 h-6 text-[#d2f835]" />
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-[#121417]">Welcome back</h1>
          <p className="text-sm font-medium text-[#475467] mt-1.5">
            Sign in to continue learning, teaching, and managing courses
          </p>
        </div>

        {/* Card */}
        <div className="p-7 sm:p-9 rounded-3xl bg-white border border-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
              <span>{isLoading ? "Signing in..." : "Sign In to OpenLearner"}</span>
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

