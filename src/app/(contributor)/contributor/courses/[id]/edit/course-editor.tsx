"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  Send,
  FileText,
  Layers,
  Check,
  AlertTriangle,
  X,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  Paperclip,
  Eye,
  ExternalLink,
  Code,
  HelpCircle,
  Save,
  Loader2
} from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface Resource {
  id: string;
  title: string;
  resourceType: string;
  url: string;
  description: string | null;
  isInternal: boolean;
}

interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  description: string | null;
  contentType: string;
  textContent: string | null;
  mediaUrl: string | null;
  durationMinutes: number | null;
  orderIndex: number;
  isRequired: boolean;
  resources?: Resource[];
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Lesson[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CourseEditorProps {
  course: {
    id: string;
    title: string;
    slug: string;
    shortSummary: string;
    description: string;
    difficulty: string;
    language: string;
    estimatedHours: number | null;
    thumbnailUrl: string | null;
    categoryId: string | null;
    category: Category | null;
    status: string;
    rejectionReason: string | null;
    modules: Module[];
  };
  categories: Category[];
}

export function CourseEditor({ course: initialCourse, categories }: CourseEditorProps) {
  const router = useRouter();
  const [course, setCourse] = useState(initialCourse);

  const isEditable = course.status === "DRAFT" || course.status === "REJECTED";

  // Course Metadata Form State
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [metaTitle, setMetaTitle] = useState(course.title);
  const [metaSummary, setMetaSummary] = useState(course.shortSummary);
  const [metaDesc, setMetaDesc] = useState(course.description);
  const [metaDifficulty, setMetaDifficulty] = useState(course.difficulty);
  const [metaHours, setMetaHours] = useState(course.estimatedHours?.toString() || "");
  const [metaCategory, setMetaCategory] = useState(course.categoryId || (categories[0]?.id ?? ""));
  const [metaThumbnail, setMetaThumbnail] = useState(course.thumbnailUrl || "");
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  // Module Modal State (Add or Edit)
  const [moduleModalMode, setModuleModalMode] = useState<"ADD" | "EDIT" | null>(null);
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");

  // Lesson Modal State (Add or Edit)
  const [lessonModalMode, setLessonModalMode] = useState<"ADD" | "EDIT" | null>(null);
  const [targetLessonModuleId, setTargetLessonModuleId] = useState<string | null>(null);
  const [targetLessonId, setTargetLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonType, setLessonType] = useState("TEXT");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonMediaUrl, setLessonMediaUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("15");
  const [lessonIsRequired, setLessonIsRequired] = useState(true);
  const [editorMobileTab, setEditorMobileTab] = useState<"write" | "preview">("write");

  // Resource Management Modal State
  const [resourceModalLesson, setResourceModalLesson] = useState<Lesson | null>(null);
  const [resTitle, setResTitle] = useState("");
  const [resType, setResType] = useState("EXTERNAL_LINK");
  const [resUrl, setResUrl] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [isAttachingRes, setIsAttachingRes] = useState(false);

  // Status & Notification State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clear messages
  const notify = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  // ==========================================
  // COURSE METADATA UPDATE
  // ==========================================
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;
    setIsSavingMeta(true);
    setError(null);

    try {
      const res = await fetch(`/api/contributor/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: metaTitle,
          shortSummary: metaSummary,
          description: metaDesc,
          difficulty: metaDifficulty,
          estimatedHours: metaHours ? parseFloat(metaHours) : null,
          thumbnailUrl: metaThumbnail || "",
          categoryId: metaCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update course metadata");

      setCourse((prev) => ({
        ...prev,
        ...data.course,
      }));
      notify("Course metadata updated successfully!");
      setShowMetadataForm(false);
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsSavingMeta(false);
    }
  };

  // ==========================================
  // MODULE CRUD & REORDER
  // ==========================================
  const openAddModule = () => {
    setModuleTitle("");
    setModuleDesc("");
    setTargetModuleId(null);
    setModuleModalMode("ADD");
  };

  const openEditModule = (m: Module) => {
    setModuleTitle(m.title);
    setModuleDesc(m.description || "");
    setTargetModuleId(m.id);
    setModuleModalMode("EDIT");
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim() || !isEditable) return;

    try {
      if (moduleModalMode === "ADD") {
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
        notify("Module created successfully!");
      } else if (moduleModalMode === "EDIT" && targetModuleId) {
        const res = await fetch(`/api/contributor/modules/${targetModuleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: moduleTitle,
            description: moduleDesc,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update module");

        setCourse((prev) => ({
          ...prev,
          modules: prev.modules.map((m) =>
            m.id === targetModuleId ? { ...m, ...data.module } : m
          ),
        }));
        notify("Module updated successfully!");
      }

      setModuleModalMode(null);
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!isEditable) return;
    if (!window.confirm("Are you sure you want to delete this module and ALL its lessons? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/contributor/modules/${moduleId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete module");

      setCourse((prev) => {
        const filtered = prev.modules.filter((m) => m.id !== moduleId);
        return {
          ...prev,
          modules: filtered.map((m, idx) => ({ ...m, orderIndex: idx + 1 })),
        };
      });
      notify("Module deleted successfully.");
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleMoveModule = async (index: number, direction: "UP" | "DOWN") => {
    if (!isEditable) return;
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= course.modules.length) return;

    const newModules = [...course.modules];
    const [moved] = newModules.splice(index, 1);
    newModules.splice(targetIndex, 0, moved);

    const orderedIds = newModules.map((m) => m.id);

    try {
      setIsProcessing(true);
      const res = await fetch(`/api/contributor/courses/${course.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MODULES",
          orderedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reorder modules");

      setCourse((prev) => ({
        ...prev,
        modules: newModules.map((m, idx) => ({ ...m, orderIndex: idx + 1 })),
      }));
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // LESSON CRUD & REORDER
  // ==========================================
  const openAddLesson = (moduleId: string) => {
    setTargetLessonModuleId(moduleId);
    setTargetLessonId(null);
    setLessonTitle("");
    setLessonDesc("");
    setLessonType("TEXT");
    setLessonContent("");
    setLessonMediaUrl("");
    setLessonDuration("15");
    setLessonIsRequired(true);
    setLessonModalMode("ADD");
  };

  const openEditLesson = (moduleId: string, lesson: Lesson) => {
    setTargetLessonModuleId(moduleId);
    setTargetLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonDesc(lesson.description || "");
    setLessonType(lesson.contentType);
    setLessonContent(lesson.textContent || "");
    setLessonMediaUrl(lesson.mediaUrl || "");
    setLessonDuration(lesson.durationMinutes?.toString() || "15");
    setLessonIsRequired(lesson.isRequired);
    setLessonModalMode("EDIT");
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonModuleId || !lessonTitle.trim() || !isEditable) return;

    try {
      if (lessonModalMode === "ADD") {
        const currentModule = course.modules.find((m) => m.id === targetLessonModuleId);
        const orderIndex = (currentModule?.lessons.length || 0) + 1;

        const res = await fetch(`/api/contributor/modules/${targetLessonModuleId}/lessons`, {
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
            isRequired: lessonIsRequired,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create lesson");

        setCourse((prev) => ({
          ...prev,
          modules: prev.modules.map((m) =>
            m.id === targetLessonModuleId
              ? { ...m, lessons: [...m.lessons, { ...data.lesson, resources: [] }] }
              : m
          ),
        }));
        notify("Lesson created successfully!");
      } else if (lessonModalMode === "EDIT" && targetLessonId) {
        const res = await fetch(`/api/contributor/modules/${targetLessonModuleId}/lessons/${targetLessonId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: lessonTitle,
            description: lessonDesc,
            contentType: lessonType,
            textContent: lessonContent,
            mediaUrl: lessonMediaUrl || undefined,
            durationMinutes: parseInt(lessonDuration, 10) || 15,
            isRequired: lessonIsRequired,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update lesson");

        setCourse((prev) => ({
          ...prev,
          modules: prev.modules.map((m) =>
            m.id === targetLessonModuleId
              ? {
                  ...m,
                  lessons: m.lessons.map((l) =>
                    l.id === targetLessonId ? { ...l, ...data.lesson } : l
                  ),
                }
              : m
          ),
        }));
        notify("Lesson updated successfully!");
      }

      setLessonModalMode(null);
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!isEditable) return;
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;

    try {
      const res = await fetch(`/api/contributor/modules/${moduleId}/lessons/${lessonId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete lesson");

      setCourse((prev) => ({
        ...prev,
        modules: prev.modules.map((m) => {
          if (m.id !== moduleId) return m;
          const filtered = m.lessons.filter((l) => l.id !== lessonId);
          return {
            ...m,
            lessons: filtered.map((l, idx) => ({ ...l, orderIndex: idx + 1 })),
          };
        }),
      }));
      notify("Lesson deleted successfully.");
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleMoveLesson = async (moduleId: string, lessonIdx: number, direction: "UP" | "DOWN") => {
    if (!isEditable) return;
    const targetModule = course.modules.find((m) => m.id === moduleId);
    if (!targetModule) return;

    const targetIdx = direction === "UP" ? lessonIdx - 1 : lessonIdx + 1;
    if (targetIdx < 0 || targetIdx >= targetModule.lessons.length) return;

    const newLessons = [...targetModule.lessons];
    const [moved] = newLessons.splice(lessonIdx, 1);
    newLessons.splice(targetIdx, 0, moved);

    const orderedIds = newLessons.map((l) => l.id);

    try {
      setIsProcessing(true);
      const res = await fetch(`/api/contributor/courses/${course.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LESSONS",
          moduleId,
          orderedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reorder lessons");

      setCourse((prev) => ({
        ...prev,
        modules: prev.modules.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: newLessons.map((l, idx) => ({ ...l, orderIndex: idx + 1 })) }
            : m
        ),
      }));
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // RESOURCE MANAGEMENT
  // ==========================================
  const openResourcesModal = (lesson: Lesson) => {
    setResourceModalLesson(lesson);
    setResTitle("");
    setResType("EXTERNAL_LINK");
    setResUrl("");
    setResDesc("");
  };

  const handleAttachResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceModalLesson || !resTitle.trim() || !resUrl.trim() || !isEditable) return;

    setIsAttachingRes(true);
    try {
      const isInternal = resUrl.startsWith("/") || resUrl.startsWith("data:") || resUrl.includes("supabase.co");

      const res = await fetch(`/api/contributor/lessons/${resourceModalLesson.id}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resTitle,
          resourceType: resType,
          url: resUrl,
          description: resDesc,
          isInternal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach resource");

      const createdResource: Resource = data.resource;

      // Update local state in both course structure and modal view
      setCourse((prev) => ({
        ...prev,
        modules: prev.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) =>
            l.id === resourceModalLesson.id
              ? { ...l, resources: [...(l.resources || []), createdResource] }
              : l
          ),
        })),
      }));

      setResourceModalLesson((prev) =>
        prev ? { ...prev, resources: [...(prev.resources || []), createdResource] } : null
      );

      setResTitle("");
      setResUrl("");
      setResDesc("");
      notify("Resource attached successfully!");
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setIsAttachingRes(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!resourceModalLesson || !isEditable) return;
    if (!window.confirm("Remove this resource from the lesson?")) return;

    try {
      const res = await fetch(`/api/contributor/lessons/${resourceModalLesson.id}/resources/${resourceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete resource");

      setCourse((prev) => ({
        ...prev,
        modules: prev.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) =>
            l.id === resourceModalLesson.id
              ? { ...l, resources: (l.resources || []).filter((r) => r.id !== resourceId) }
              : l
          ),
        })),
      }));

      setResourceModalLesson((prev) =>
        prev
          ? { ...prev, resources: (prev.resources || []).filter((r) => r.id !== resourceId) }
          : null
      );
      notify("Resource deleted.");
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  // ==========================================
  // SUBMIT FOR REVIEW
  // ==========================================
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

      setCourse((prev) => ({
        ...prev,
        status: "PENDING_REVIEW",
        rejectionReason: null,
      }));
      notify("Course submitted for editorial review! Redirecting to studio...");
      setTimeout(() => {
        router.push("/contributor");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      notify(err.message, true);
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
            {course.category && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {course.category.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#121417] leading-tight">{course.title}</h1>
          <p className="text-xs text-slate-500 max-w-xl">{course.shortSummary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/contributor"
            className="px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#121417] transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Studio</span>
          </Link>

          {isEditable && (
            <button
              onClick={() => setShowMetadataForm(!showMetadataForm)}
              className="px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#121417] transition-all flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
              <span>{showMetadataForm ? "Close Settings" : "Course Settings"}</span>
            </button>
          )}

          {isEditable && (
            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting || totalLessons === 0}
              className="px-6 py-3.5 rounded-full bg-[#121417] hover:bg-black disabled:opacity-50 text-[#d2f835] text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Submitting..."
                  : course.status === "REJECTED"
                  ? "Resubmit for Review"
                  : "Submit for Review"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Rejection Notice Banner */}
      {course.status === "REJECTED" && course.rejectionReason && (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-700">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span className="text-sm">Editorial Feedback Required</span>
          </div>
          <p className="pl-7 text-rose-900 font-medium leading-relaxed italic bg-white/70 p-3 rounded-2xl border border-rose-100">
            &ldquo;{course.rejectionReason}&rdquo;
          </p>
          <p className="pl-7 text-xs text-rose-700">
            Please make the requested improvements to your modules, lessons, or resources below, then click &ldquo;Resubmit for Review&rdquo;.
          </p>
        </div>
      )}

      {/* Read-Only Status Info */}
      {course.status === "PENDING_REVIEW" && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800">Under Editorial Review</p>
            <p className="text-amber-700 mt-0.5">
              This course is currently undergoing review by our content editors. Modifications are locked until the review is finished.
            </p>
          </div>
        </div>
      )}

      {course.status === "PUBLISHED" && (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-800">Published & Live</p>
            <p className="text-emerald-700 mt-0.5">
              This course is published in the OLVYN catalog. Contact an administrator if you require major version changes.
            </p>
          </div>
        </div>
      )}

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

      {/* Course Metadata Form (Collapsible) */}
      {showMetadataForm && isEditable && (
        <div className="p-7 sm:p-8 rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#121417]">Edit Course Metadata</h2>
              <p className="text-xs text-slate-500">Update course overview, category, difficulty, and thumbnail.</p>
            </div>
            <button
              onClick={() => setShowMetadataForm(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveMetadata} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Short Summary *
                </label>
                <input
                  type="text"
                  required
                  value={metaSummary}
                  onChange={(e) => setMetaSummary(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Category *
                </label>
                <select
                  value={metaCategory}
                  onChange={(e) => setMetaCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Difficulty
                </label>
                <select
                  value={metaDifficulty}
                  onChange={(e) => setMetaDifficulty(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All Levels</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="200"
                  value={metaHours}
                  onChange={(e) => setMetaHours(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                  placeholder="e.g. 10.5"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <FileUpload
                  label="Course Thumbnail Image"
                  helperText="Upload 16:9 thumbnail image (JPEG, PNG, WebP up to 25MB)"
                  accept="image/jpeg,image/png,image/webp"
                  folder="thumbnails"
                  value={metaThumbnail}
                  onChange={(url) => setMetaThumbnail(url)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMetadataForm(false)}
                className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingMeta}
                className="px-6 py-2.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] text-xs font-black shadow-sm flex items-center gap-1.5"
              >
                {isSavingMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Metadata</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Course Curriculum Structure Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#121417] tracking-tight">Curriculum Structure</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize your curriculum into ordered modules and lessons. Use the arrows to reorder items.
            </p>
          </div>

          {isEditable && (
            <button
              onClick={openAddModule}
              className="px-5 py-2.5 rounded-full bg-[#121417] hover:bg-black text-xs font-black text-[#d2f835] shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Add Module
            </button>
          )}
        </div>

        {/* Modules List */}
        {course.modules.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-3xl bg-white border border-dashed border-slate-300 shadow-xs">
            <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#121417]">No modules added yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Every course requires at least 1 module and 1 lesson before submitting for review.
            </p>
            {isEditable && (
              <button
                onClick={openAddModule}
                className="mt-5 px-6 py-3 rounded-full bg-[#121417] hover:bg-black text-xs font-black text-[#d2f835] shadow-md transition-all cursor-pointer"
              >
                + Create First Module
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {course.modules.map((module, mIdx) => (
              <div
                key={module.id}
                className="rounded-3xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden"
              >
                {/* Module Header */}
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Module {mIdx + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        • {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#121417]">{module.title}</h3>
                    {module.description && (
                      <p className="text-xs text-slate-500">{module.description}</p>
                    )}
                  </div>

                  {/* Module Controls */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                    {isEditable && (
                      <>
                        <button
                          onClick={() => handleMoveModule(mIdx, "UP")}
                          disabled={mIdx === 0 || isProcessing}
                          title="Move module up"
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 text-slate-600 transition-all"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveModule(mIdx, "DOWN")}
                          disabled={mIdx === course.modules.length - 1 || isProcessing}
                          title="Move module down"
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 text-slate-600 transition-all"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModule(module)}
                          title="Edit module"
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(module.id)}
                          title="Delete module"
                          className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 hover:border-rose-200 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openAddLesson(module.id)}
                          className="ml-1 px-3.5 py-2 rounded-xl bg-[#121417] hover:bg-black text-[#d2f835] text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Lesson</span>
                        </button>
                      </>
                    )}
                  </div>
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
                        className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="font-mono font-bold text-slate-400 text-xs mt-0.5">
                            {lIdx + 1}.
                          </span>
                          <div className="space-y-1 min-w-0">
                            <p className="font-bold text-[#121417] text-sm truncate">{lesson.title}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-700">
                                {lesson.contentType}
                              </span>
                              <span>• {lesson.durationMinutes || 0}m</span>
                              {lesson.mediaUrl && <span className="text-blue-600 font-medium">• Media Linked</span>}
                              {lesson.textContent && <span className="text-emerald-600 font-medium">• Notes Attached</span>}
                              <span className="text-slate-400">
                                • {lesson.resources?.length || 0} {lesson.resources?.length === 1 ? "resource" : "resources"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Lesson Controls */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => openResourcesModal(lesson)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                            title="Manage lesson resources"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                            <span>Resources ({lesson.resources?.length || 0})</span>
                          </button>

                          {isEditable && (
                            <>
                              <button
                                onClick={() => handleMoveLesson(module.id, lIdx, "UP")}
                                disabled={lIdx === 0 || isProcessing}
                                title="Move lesson up"
                                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 text-slate-600 transition-all"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveLesson(module.id, lIdx, "DOWN")}
                                disabled={lIdx === module.lessons.length - 1 || isProcessing}
                                title="Move lesson down"
                                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 text-slate-600 transition-all"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditLesson(module.id, lesson)}
                                title="Edit lesson content"
                                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(module.id, lesson.id)}
                                title="Delete lesson"
                                className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 hover:border-rose-200 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* ==========================================
          MODAL: MODULE ADD / EDIT
         ========================================== */}
      {moduleModalMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-black/10 p-7 shadow-2xl text-[#121417]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#121417]">
                {moduleModalMode === "ADD" ? "Add Course Module" : "Edit Module"}
              </h3>
              <button
                onClick={() => setModuleModalMode(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleModuleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="e.g. Module 1: Core Principles"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#121417] text-xs focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModuleModalMode(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] text-xs font-black shadow-sm"
                >
                  {moduleModalMode === "ADD" ? "Create Module" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: LESSON ADD / EDIT WITH SPLIT MARKDOWN LIVE PREVIEW
         ========================================== */}
      {lessonModalMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-5xl rounded-3xl bg-white border border-black/10 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-[#121417]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#121417]">
                  {lessonModalMode === "ADD" ? "Add Lesson" : "Edit Lesson & Curriculum Content"}
                </h3>
                <p className="text-xs text-slate-500">
                  Compose lesson notes in Markdown with real-time live preview.
                </p>
              </div>
              <button
                onClick={() => setLessonModalMode(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLessonSubmit} className="space-y-5">
              {/* Metadata row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="e.g. Asynchronous State Management in React"
                    className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Content Type
                  </label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                  >
                    <option value="TEXT">Markdown Notes / Text</option>
                    <option value="VIDEO_URL">Video (YouTube / Embed)</option>
                    <option value="DOCUMENT_URL">Document (PDF)</option>
                    <option value="EXTERNAL_LINK">External Resource Link</option>
                    <option value="CODE_REPO">Code Repository</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Summary / Description
                  </label>
                  <input
                    type="text"
                    value={lessonDesc}
                    onChange={(e) => setLessonDesc(e.target.value)}
                    placeholder="Brief objective of this lesson..."
                    className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Media uploads if applicable */}
              {lessonType === "VIDEO_URL" && (
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <FileUpload
                    label="Lesson Video Upload (MP4)"
                    helperText="Upload MP4 video (up to 25MB)"
                    accept="video/mp4"
                    folder="lessons"
                    value={lessonMediaUrl}
                    onChange={(url) => setLessonMediaUrl(url)}
                  />
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Or paste YouTube / External Video Embed URL
                    </label>
                    <input
                      type="url"
                      value={lessonMediaUrl}
                      onChange={(e) => setLessonMediaUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              )}

              {lessonType === "DOCUMENT_URL" && (
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
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

              {/* SPLIT-PANE MARKDOWN LIVE PREVIEW (Phase 9) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Lesson Educational Content (Markdown Supported)
                  </label>
                  {/* Mobile Tab Switcher */}
                  <div className="flex md:hidden items-center p-0.5 rounded-lg bg-slate-100 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setEditorMobileTab("write")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        editorMobileTab === "write" ? "bg-white text-black shadow-xs" : "text-slate-500"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMobileTab("preview")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        editorMobileTab === "preview" ? "bg-white text-black shadow-xs" : "text-slate-500"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {/* Two-column split layout on desktop, stacked/tabbed on mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LEFT: Markdown Editor */}
                  <div className={`space-y-1.5 ${editorMobileTab === "preview" ? "hidden md:block" : "block"}`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                      <span>Markdown Input</span>
                      <span>{lessonContent.length} chars</span>
                    </div>
                    <textarea
                      rows={14}
                      value={lessonContent}
                      onChange={(e) => setLessonContent(e.target.value)}
                      placeholder="# Concept Title&#10;&#10;Explain the concepts with **bold text**, `inline code`, and blockquotes:&#10;&#10;```typescript&#10;const greeting = 'Hello, OLVYN!';&#10;```"
                      className="w-full p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#d2f835] leading-relaxed resize-y scrollbar-thin"
                    />
                  </div>

                  {/* RIGHT: Live Preview using MarkdownRenderer */}
                  <div className={`space-y-1.5 ${editorMobileTab === "write" ? "hidden md:block" : "block"}`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live Preview (Learner View)</span>
                      </span>
                      <span className="text-slate-400">XSS-Safe Native JSX</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 h-[320px] md:h-[350px] overflow-y-auto text-xs text-slate-800 leading-relaxed scrollbar-thin">
                      {lessonContent.trim() ? (
                        <MarkdownRenderer content={lessonContent} theme="light" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">
                          Start typing on the left to see the live rendered markdown here.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLessonModalMode(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#121417] hover:bg-black text-[#d2f835] text-xs font-black shadow-sm"
                >
                  {lessonModalMode === "ADD" ? "Create Lesson" : "Save Lesson Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: RESOURCE MANAGEMENT (Phase 6)
         ========================================== */}
      {resourceModalLesson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-black/10 p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-[#121417]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#121417]">Manage Lesson Resources</h3>
                <p className="text-xs text-slate-500">
                  Lesson: <strong className="text-slate-700">{resourceModalLesson.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setResourceModalLesson(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing Resources List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Attached Resources</h4>
              {!resourceModalLesson.resources || resourceModalLesson.resources.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 border border-slate-200">
                  No resources attached yet. Add supplementary slides, files, or external links below.
                </p>
              ) : (
                <div className="space-y-2">
                  {resourceModalLesson.resources.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-[#121417] truncate">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{res.title}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 font-mono">
                            {res.resourceType}
                          </span>
                        </div>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{res.url}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>

                      {isEditable && (
                        <button
                          onClick={() => handleDeleteResource(res.id)}
                          title="Delete resource"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Resource Form */}
            {isEditable && (
              <form onSubmit={handleAttachResource} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Attach New Resource</h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      value={resTitle}
                      onChange={(e) => setResTitle(e.target.value)}
                      placeholder="e.g. Slides PDF / Source Code"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Type</label>
                    <select
                      value={resType}
                      onChange={(e) => setResType(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                    >
                      <option value="EXTERNAL_LINK">Link</option>
                      <option value="PDF">PDF</option>
                      <option value="FILE">File</option>
                      <option value="CODE_REPO">Code Repo</option>
                    </select>
                  </div>
                </div>

                {/* If File/PDF: File upload component */}
                {(resType === "FILE" || resType === "PDF") && (
                  <div className="space-y-1">
                    <FileUpload
                      label="Upload Resource File"
                      helperText="PDF or asset file (up to 25MB)"
                      accept={resType === "PDF" ? "application/pdf" : "*"}
                      folder="resources"
                      value={resUrl}
                      onChange={(url) => setResUrl(url)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Resource URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={resUrl}
                    onChange={(e) => setResUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={resDesc}
                    onChange={(e) => setResDesc(e.target.value)}
                    placeholder="Brief description of this attachment..."
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-black"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isAttachingRes}
                    className="px-5 py-2 rounded-full bg-[#121417] hover:bg-black disabled:opacity-50 text-[#d2f835] text-xs font-black shadow-sm flex items-center gap-1.5"
                  >
                    {isAttachingRes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Attach Resource</span>
                  </button>
                </div>
              </form>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResourceModalLesson(null)}
                className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
