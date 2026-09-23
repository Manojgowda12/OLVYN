"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Lock, Mail, User, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
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
            ONBOARDING // FREE ACCESS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F5F7FF]">Create your account</h1>
          <p className="text-sm font-medium text-[#A8B4CC] mt-1.5">
            Join OLVYN to explore courses, track your 0-100% progress, and get Nova AI tutoring
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
            href="/api/auth/google?next=/dashboard"
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
            <span className="flex-shrink mx-3 text-[10px] font-mono font-bold text-[#7F8CA8] uppercase tracking-wider">Or register with email</span>
            <div className="flex-grow border-t border-white/[0.08]"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A8B4CC] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7F8CA8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#050816]/75 border border-white/10 text-[#F5F7FF] placeholder-[#7F8CA8] text-sm font-medium focus:bg-[#070d1e] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

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
                  placeholder="alex@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#050816]/75 border border-white/10 text-[#F5F7FF] placeholder-[#7F8CA8] text-sm font-medium focus:bg-[#070d1e] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A8B4CC] mb-1.5">
                Password
              </label>
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
              <p className="text-[11px] font-mono text-[#7F8CA8] mt-1.5">
                Must be at least 8 characters with 1 number and 1 capital letter.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 text-white font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer tactile-button"
              suppressHydrationWarning
            >
              <span>{isLoading ? "Creating account..." : "Create Free Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm font-medium text-[#7F8CA8] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-bold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

