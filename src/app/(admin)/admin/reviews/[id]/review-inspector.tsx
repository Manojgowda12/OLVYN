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
  Video,
  Sparkles
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
          className="flex items-center gap-2 text-xs font-bold text-[#121417] hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin Console
        </Link>
        <span className="text-xs font-mono text-slate-400">Course ID: {course.id}</span>
      </div>

      {/* Decision Banner */}
      <div className="p-7 sm:p-9 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                course.status === "PENDING_REVIEW"
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : course.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-rose-100 text-rose-800 border border-rose-200"
              }`}
            >
              Status: {course.status.replace("_", " ")}
            </span>
            <span className="text-xs font-medium text-slate-500">
              Author: <strong className="text-[#121417]">{course.author.name}</strong> ({course.author.email})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#121417] leading-tight">{course.title}</h1>
          <p className="text-xs text-slate-500 max-w-xl">{course.shortSummary}</p>
        </div>

        {course.status === "PENDING_REVIEW" ? (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowRejectBox(!showRejectBox)}
              disabled={isProcessing}
              className="px-5 py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Reject Request</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-6 py-3.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 text-[#d2f835]" />
              <span>{isProcessing ? "Publishing..." : "Approve & Publish"}</span>
            </button>
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-500 px-4 py-2 rounded-full bg-slate-100 border border-slate-200">
            Course is {course.status.toLowerCase()}.
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reject Drawer */}
      {showRejectBox && (
        <div className="p-7 rounded-3xl bg-rose-50/70 border border-rose-200 space-y-4">
          <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600" /> Mandatory Editorial Rejection Feedback
          </h3>
          <p className="text-xs text-rose-700">
            Explain clearly what revisions the author must complete before this course can be accepted and published.
          </p>
          <form onSubmit={handleReject} className="space-y-3">
            <textarea
              required
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Please add clearer code examples in Module 1, Lesson 2 and verify video streaming quality..."
              className="w-full p-3.5 rounded-2xl bg-white border border-rose-200 text-xs text-[#121417] placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectBox(false)}
                className="px-5 py-2.5 rounded-full bg-white text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Syllabus Inspection */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-[#121417] tracking-tight">Curriculum Verification</h2>
          <p className="text-xs text-slate-500 mt-1">
            {course.modules.length} Modules • {totalLessons} Lessons • Review attached videos and markdown notes
          </p>
        </div>

        <div className="space-y-6">
          {course.modules.map((m, mIdx) => (
            <div key={m.id} className="rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Module {mIdx + 1}
                  </span>
                  <h3 className="text-base font-bold text-[#121417] mt-0.5">{m.title}</h3>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                  {m.lessons.length} lessons
                </span>
              </div>

              <div className="divide-y divide-slate-100 p-5 space-y-4">
                {m.lessons.map((l, lIdx) => (
                  <div key={l.id} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-[#121417]">
                        {lIdx + 1}. {l.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#121417] text-[#d2f835]">
                          {l.contentType}
                        </span>
                        <span className="font-semibold text-slate-500">{l.durationMinutes || 0} mins</span>
                      </div>
                    </div>

                    {l.mediaUrl && (
                      <div className="space-y-2 pt-1">
                        <div className="text-xs text-blue-600 flex items-center gap-1 font-mono">
                          <ExternalLink className="w-3.5 h-3.5" /> Media URL: <a href={l.mediaUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{l.mediaUrl}</a>
                        </div>
                        {l.mediaUrl.includes("youtube.com") || l.mediaUrl.includes("youtu.be") ? (
                          <div className="aspect-video max-w-xl rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-sm">
                            <iframe
                              src={l.mediaUrl.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")}
                              className="w-full h-full"
                              allowFullScreen
                            />
                          </div>
                        ) : null}
                      </div>
                    )}

                    {l.textContent && (
                      <div className="p-4 rounded-xl bg-white text-xs text-slate-700 whitespace-pre-line font-mono border border-slate-200 max-h-48 overflow-y-auto leading-relaxed">
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

