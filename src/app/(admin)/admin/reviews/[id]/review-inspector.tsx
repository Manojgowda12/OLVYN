"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ExternalLink,
  AlertCircle,
  FileText,
  Video
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  contentType: string;
  textContent: string | null;
  mediaUrl: string | null;
  durationMinutes: number | null;
  orderIndex: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Lesson[];
}

interface ReviewInspectorProps {
  course: {
    id: string;
    title: string;
    slug: string;
    shortSummary: string;
    description: string;
    difficulty: string;
    status: string;
    rejectionReason: string | null;
    author: { name: string; email: string };
    category: { name: string } | null;
    modules: Module[];
  };
}

export function ReviewInspector({ course }: ReviewInspectorProps) {
  const router = useRouter();

  const [comments, setComments] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Approve action
  const handleApprove = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${course.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed.");

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  // Reject action
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comments.trim().length < 5) {
      setError("Rejection feedback must be at least 5 characters.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${course.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECTED", comments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed.");

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin Console
        </Link>
        <span className="text-xs font-mono text-slate-500">ID: {course.id}</span>
      </div>

      {/* Decision Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase ${
                course.status === "PENDING_REVIEW"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : course.status === "PUBLISHED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              Status: {course.status.replace("_", " ")}
            </span>
            <span className="text-xs text-slate-400">
              Submitted by <strong className="text-slate-200">{course.author.name}</strong> ({course.author.email})
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{course.title}</h1>
        </div>

        {course.status === "PENDING_REVIEW" ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRejectBox(!showRejectBox)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" /> Reject Course
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> {isProcessing ? "Publishing..." : "Approve & Publish"}
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium">
            Course is already {course.status.toLowerCase()}.
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reject Drawer */}
      {showRejectBox && (
        <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-4">
          <h3 className="text-sm font-bold text-red-300 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Mandatory Editorial Rejection Feedback
          </h3>
          <p className="text-xs text-slate-400">
            Explain what revisions the contributor must complete before this course can be approved.
          </p>
          <form onSubmit={handleReject} className="space-y-3">
            <textarea
              required
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Please add clearer code examples in Module 1, Lesson 2 and fix the external video link..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-red-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectBox(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Syllabus Inspection */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Curriculum Verification ({course.modules.length} Modules, {totalLessons} Lessons)</h2>

        <div className="space-y-6">
          {course.modules.map((m, mIdx) => (
            <div key={m.id} className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                    Module {mIdx + 1}
                  </span>
                  <h3 className="text-base font-bold text-white">{m.title}</h3>
                </div>
                <span className="text-xs text-slate-500">{m.lessons.length} lessons</span>
              </div>

              <div className="divide-y divide-slate-800/60 p-4 space-y-4">
                {m.lessons.map((l, lIdx) => (
                  <div key={l.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-white">
                        {lIdx + 1}. {l.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {l.contentType}
                        </span>
                        <span>{l.durationMinutes || 0} mins</span>
                      </div>
                    </div>

                    {l.mediaUrl && (
                      <div className="text-xs text-blue-400 flex items-center gap-1 font-mono">
                        <ExternalLink className="w-3.5 h-3.5" /> Media: {l.mediaUrl}
                      </div>
                    )}

                    {l.textContent && (
                      <div className="p-3 rounded-lg bg-slate-900 text-xs text-slate-300 whitespace-pre-line font-mono border border-slate-800/80 max-h-48 overflow-y-auto">
                        {l.textContent}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
