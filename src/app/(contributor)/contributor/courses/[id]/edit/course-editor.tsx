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
  AlertTriangle
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
  const [lessonType, setLessonType] = useState("TEXT");
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
    <div className="space-y-8">
      {/* Top Action Header */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${
                course.status === "PUBLISHED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : course.status === "PENDING_REVIEW"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : course.status === "REJECTED"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {course.status.replace("_", " ")}
            </span>
            <span className="text-xs text-slate-400">
              {course.modules.length} Modules • {totalLessons} Lessons
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{course.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/contributor"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Exit Studio
          </Link>

          {course.status !== "PENDING_REVIEW" && course.status !== "PUBLISHED" && (
            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Rejection Notice If Applicable */}
      {course.status === "REJECTED" && course.rejectionReason && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-red-400">
            <AlertTriangle className="w-4 h-4" /> Editorial Revision Feedback:
          </p>
          <p className="pl-5 text-slate-200 italic">&ldquo;{course.rejectionReason}&rdquo;</p>
        </div>
      )}

      {/* Course Structure Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Course Curriculum Structure</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Organize your curriculum into progressive modules and lessons.
            </p>
          </div>

          <button
            onClick={() => setShowModuleModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Module
          </button>
        </div>

        {/* Modules List */}
        {course.modules.length === 0 ? (
          <div className="text-center py-12 p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-white">No modules added yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Every course requires at least 1 module and 1 lesson before submitting for review.
            </p>
            <button
              onClick={() => setShowModuleModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
            >
              + Create First Module
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {course.modules.map((module, mIdx) => (
              <div
                key={module.id}
                className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden"
              >
                {/* Module Header */}
                <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                      Module {mIdx + 1}
                    </span>
                    <h3 className="text-base font-bold text-white">{module.title}</h3>
                    {module.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{module.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveModuleId(module.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Lesson
                  </button>
                </div>

                {/* Lessons in Module */}
                {module.lessons.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 italic">
                    No lessons in this module yet. Click &ldquo;Add Lesson&rdquo; above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {module.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        className="p-3.5 px-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-500">{lIdx + 1}.</span>
                          <div>
                            <p className="font-medium text-slate-200">{lesson.title}</p>
                            <p className="text-[11px] text-slate-400">
                              Type: {lesson.contentType} • Duration: {lesson.durationMinutes || 0}m
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Course Module</h3>
            <form onSubmit={handleAddModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="e.g. Module 1: Foundations"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                  placeholder="Summary of this learning unit..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Add Lesson</h3>
            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Variables and Data Types"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Content Type
                  </label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="TEXT">Markdown Notes / Text</option>
                    <option value="VIDEO_URL">Video (YouTube / Embed)</option>
                    <option value="EXTERNAL_LINK">External Web Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {lessonType === "VIDEO_URL" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Video URL (YouTube or direct stream)
                  </label>
                  <input
                    type="url"
                    value={lessonMediaUrl}
                    onChange={(e) => setLessonMediaUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Lesson Content / Notes (Markdown supported)
                </label>
                <textarea
                  rows={6}
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="Write code examples, explanations, and concepts here..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModuleId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
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
