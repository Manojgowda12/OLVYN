"use client";

import { useState } from "react";
import Link from "next/link";
import { PenTool, ArrowRight, BookOpen, Sparkles, CheckCircle2, Shield, ArrowLeft } from "lucide-react";

interface ContributorOnboardingProps {
  userName: string;
  userEmail: string;
}

export function ContributorOnboarding({ userName, userEmail }: ContributorOnboardingProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    setIsActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/contributor/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate Creator Studio.");
      }

      // Reload to reflect newly activated Contributor role and load dashboard
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-12 px-6 lg:px-12 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-[#d2f835] text-xs font-black uppercase tracking-wider shadow-xs">
              <PenTool className="w-3.5 h-3.5" />
              <span>Creator Studio Onboarding</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Start Authoring Courses on OpenLearner
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              You are currently signed in with a <strong>Learner</strong> account. To build syllabi, author Markdown lessons, and submit courses for peer review, activate your Contributor workspace.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Account Profile Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-[#d2f835] font-black text-sm flex items-center justify-center shadow-xs">
                {userName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500 font-medium">{userEmail}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 text-xs font-bold uppercase tracking-wider">
              Current: Learner
            </span>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#d2f835] text-slate-950 flex items-center justify-center font-black">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Curriculum Studio</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Design modules, lessons, and resources with our split Markdown editor.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-[#d2f835] flex items-center justify-center font-black">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Editorial Review</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Submit courses to editors with transparent revision and feedback cycles.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#d2f835] text-slate-950 flex items-center justify-center font-black">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Nova AI Indexing</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Approved courses are automatically indexed to power AI-guided tutoring.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleActivate}
              disabled={isActivating}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
            >
              <span>{isActivating ? "Activating Contributor Access..." : "Activate Creator Studio"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors text-center"
            >
              Back to Learner Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
