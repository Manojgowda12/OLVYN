"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Send,
  FileText,
  Video,
  Layers,
  Check,
  AlertTriangle,
  Play,
  X
} from "lucide-react";
import { FileUpload } from "@/components/file-upload";

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

interface CourseEditorProps {
  course: {
    id: string;
    title: string;
    slug: string;
    shortSummary: string;
    description: string;
    difficulty: string;
    status: string;
    rejectionReason: string | null;
    modules: Module[];
  };
}

export function CourseEditor({ course: initialCourse }: CourseEditorProps) {
  const router = useRouter();
  const [course, setCourse] = useState(initialCourse);

  // New Module modal state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");

  // New Lesson modal state
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonType, setLessonType] = useState("VIDEO_URL");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonMediaUrl, setLessonMediaUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("15");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Module Handler
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;

    try {
      const res = await fetch(`/api/contributor/courses/${course.id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: moduleTitle,
          description: moduleDesc,
          orderIndex: course.modules.length + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create module");

      setCourse((prev) => ({
        ...prev,
        modules: [...prev.modules, { ...data.module, lessons: [] }],
      }));

      setModuleTitle("");
      setModuleDesc("");
      setShowModuleModal(false);
      setSuccess("Module added successfully!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add Lesson Handler
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleId || !lessonTitle.trim()) return;

    const currentModule = course.modules.find((m) => m.id === activeModuleId);
    const orderIndex = (currentModule?.lessons.length || 0) + 1;

    try {
      const res = await fetch(`/api/contributor/modules/${activeModuleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonTitle,
          description: lessonDesc,
          contentType: lessonType,
          textContent: lessonContent,
          mediaUrl: lessonMediaUrl || undefined,
          durationMinutes: parseInt(lessonDuration, 10) || 15,
          orderIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create lesson");

      setCourse((prev) => ({
        ...prev,
        modules: prev.modules.map((m) =>
          m.id === activeModuleId ? { ...m, lessons: [...m.lessons, data.lesson] } : m
        ),
      }));

      setLessonTitle("");
      setLessonDesc("");
      setLessonContent("");
      setLessonMediaUrl("");
      setActiveModuleId(null);
      setSuccess("Lesson added successfully!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit for Review Handler
  const handleSubmitForReview = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/contributor/courses/${course.id}/submit`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setCourse((prev) => ({ ...prev, status: "PENDING_REVIEW", rejectionReason: null }));
      setSuccess("Course submitted for editorial review! Redirecting to studio...");
      setTimeout(() => {
        router.push("/contributor");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <div className="space-y-8 text-[#121417]">
      {/* Top Action Header */}
      <div className="p-7 sm:p-9 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                course.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : course.status === "PENDING_REVIEW"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : course.status === "REJECTED"
                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              Status: {course.status.replace("_", " ")}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {course.modules.length} Modules • {totalLessons} Lessons
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#121417] leading-tight">{course.title}</h1>
          <p className="text-xs text-slate-500 max-w-xl">{course.shortSummary}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/contributor"
            className="px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#121417] transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Studio</span>
          </Link>

          {course.status !== "PENDING_REVIEW" && course.status !== "PUBLISHED" && (
            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting || totalLessons === 0}
              className="px-6 py-3.5 rounded-full bg-[#121417] hover:bg-black disabled:opacity-50 text-[#d2f835] text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Submitting..." : "Submit for Editorial Review"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Rejection Notice If Applicable */}
      {course.status === "REJECTED" && course.rejectionReason && (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Editorial Revision Feedback from Admin:
          </p>
          <p className="pl-5 text-rose-800 italic font-medium">&ldquo;{course.rejectionReason}&rdquo;</p>
          <p className="pl-5 text-[11px] text-rose-600">
            Make the suggested updates to your curriculum below, then resubmit for review.
          </p>
        </div>
      )}

      {/* Course Structure Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#121417] tracking-tight">Curriculum Structure</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize your curriculum into progressive modules and attach video or markdown lessons.
            </p>
          </div>

          <button
            onClick={() => setShowModuleModal(true)}
            className="px-5 py-2.5 rounded-full bg-[#121417] hover:bg-black text-xs font-black text-[#d2f835] shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Add Module
          </button>
        </div>

        {/* Modules List */}
        {course.modules.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-3xl bg-white border border-dashed border-slate-300 shadow-xs">
            <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#121417]">No modules added yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Every course requires at least 1 module and 1 lesson before submitting for review.
            </p>
            <button
              onClick={() => setShowModuleModal(true)}
              className="mt-5 px-6 py-3 rounded-full bg-[#121417] hover:bg-black text-xs font-black text-[#d2f835] shadow-md transition-all cursor-pointer"
            >
              + Create First Module
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {course.modules.map((module, mIdx) => (
              <div
                key={module.id}
                className="rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden"
              >
                {/* Module Header */}
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Module {mIdx + 1}
                    </span>
                    <h3 className="text-base font-bold text-[#121417] mt-0.5">{module.title}</h3>
                    {module.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveModuleId(module.id)}
                    className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-[#121417] text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto cursor-pointer active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-600" /> Add Lesson
                  </button>
                </div>

                {/* Lessons in Module */}
                {module.lessons.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">
                    No lessons in this module yet. Click &ldquo;Add Lesson&rdquo; above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 p-4 space-y-3">
                    {module.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="font-mono font-bold text-slate-400 text-xs">{lIdx + 1}.</span>
                          <div>
                            <p className="font-bold text-[#121417] text-sm">{lesson.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Type: <strong className="text-slate-700">{lesson.contentType}</strong> • Duration: {lesson.durationMinutes || 0}m
                              {lesson.mediaUrl && " • Video Attached"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-black/10 p-7 shadow-2xl text-[#121417]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#121417]">Add Course Module</h3>
              <button
                onClick={() => setShowModuleModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddModule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="e.g. Module 1: Foundations"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                  placeholder="Summary of this learning unit..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] text-xs font-black shadow-sm"
                >
                  Create Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {activeModuleId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-black/10 p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[#121417]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#121417]">Add Lesson</h3>
              <button
                onClick={() => setActiveModuleId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Building Modern Components"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Content Type
                  </label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="VIDEO_URL">Video (YouTube / Embed)</option>
                    <option value="TEXT">Markdown Notes / Text</option>
                    <option value="EXTERNAL_LINK">External Resource Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {lessonType === "VIDEO_URL" && (
                <div className="space-y-2">
                  <FileUpload
                    label="Lesson Video Upload (MP4)"
                    helperText="Upload MP4 video (up to 25MB)"
                    accept="video/mp4"
                    folder="lessons"
                    value={lessonMediaUrl}
                    onChange={(url) => setLessonMediaUrl(url)}
                  />
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Or paste YouTube / Stream URL
                    </label>
                    <input
                      type="url"
                      value={lessonMediaUrl}
                      onChange={(e) => setLessonMediaUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              )}

              {lessonType === "DOCUMENT_URL" && (
                <div className="space-y-2">
                  <FileUpload
                    label="Lesson Document (PDF)"
                    helperText="Upload PDF document (up to 25MB)"
                    accept="application/pdf"
                    folder="documents"
                    value={lessonMediaUrl}
                    onChange={(url) => setLessonMediaUrl(url)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Lesson Content & Notes (Markdown supported)
                </label>
                <textarea
                  rows={5}
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="Write code examples, explanations, and concepts here..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModuleId(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] text-xs font-black shadow-sm"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

