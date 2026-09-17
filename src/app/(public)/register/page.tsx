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

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-[#d2f835] shadow-md mb-4 hover:scale-105 transition-transform">
            <BookOpen className="w-6 h-6 text-[#d2f835]" />
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Create your account</h1>
          <p className="text-sm font-medium text-slate-600 mt-1.5">
            Join OpenLearner to explore courses, track your 0-100% progress, and get Nova AI tutoring
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

          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] focus:ring-1 focus:ring-[#121417] transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

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
                  placeholder="alex@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] focus:ring-1 focus:ring-[#121417] transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
                Password
              </label>
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
              <p className="text-[11px] font-medium text-slate-400 mt-1.5">
                Must be at least 8 characters with 1 number and 1 capital letter.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-full bg-[#121417] hover:bg-black disabled:opacity-60 text-[#d2f835] font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              suppressHydrationWarning
            >
              <span>{isLoading ? "Creating account..." : "Create Free Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm font-medium text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#121417] hover:underline font-bold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

