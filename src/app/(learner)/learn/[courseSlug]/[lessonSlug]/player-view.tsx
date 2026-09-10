"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  BookOpen,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Send,
  HelpCircle,
  Code
} from "lucide-react";

interface LessonItem {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number | null;
  orderIndex: number;
  contentType: string;
}

interface ModuleItem {
  id: string;
  title: string;
  orderIndex: number;
  lessons: LessonItem[];
}

interface ResourceItem {
  id: string;
  title: string;
  url: string;
  resourceType: string;
}

interface PlayerViewProps {
  course: {
    id: string;
    title: string;
    slug: string;
    modules: ModuleItem[];
  };
  currentLesson: {
    id: string;
    title: string;
    slug: string;
    contentType: string;
    textContent: string | null;
    mediaUrl: string | null;
    durationMinutes: number | null;
    resources: ResourceItem[];
    module: { id: string; title: string };
  };
  initialProgress: Record<string, boolean>;
  initialCourseProgress: {
    percentage: number;
    completedLessons: number;
    totalLessons: number;
    isCompleted: boolean;
  } | null;
}

export function PlayerView({
  course,
  currentLesson,
  initialProgress,
  initialCourseProgress,
}: PlayerViewProps) {
  const router = useRouter();

  const [progress, setProgress] = useState(initialProgress);
  const [courseProgress, setCourseProgress] = useState(initialCourseProgress);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [novaOpen, setNovaOpen] = useState(false);

  // Nova AI Chat State
  const [novaMessages, setNovaMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Hi there! I'm **Nova**, your learning assistant for **${course.title}**. Ask me to explain "${currentLesson.title}", provide a practice quiz, or clarify any programming concept!`,
    },
  ]);
  const [novaInput, setNovaInput] = useState("");
  const [novaLoading, setNovaLoading] = useState(false);

  const isCurrentCompleted = !!progress[currentLesson.id];

  // Flatten all lessons to determine next & previous
  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))
  );
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Toggle completion
  const handleToggleComplete = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/lessons/${currentLesson.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setProgress((prev) => ({ ...prev, [currentLesson.id]: data.isCompleted }));
        setCourseProgress(data.courseProgress);
      }
    } catch (e) {
      console.error("Failed to update progress:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Send query to Nova AI
  const handleSendNova = async (promptText?: string) => {
    const message = promptText || novaInput;
    if (!message.trim() || novaLoading) return;

    const newMessages = [...novaMessages, { role: "user" as const, content: message }];
    setNovaMessages(newMessages);
    setNovaInput("");
    setNovaLoading(true);

    try {
      const res = await fetch("/api/nova/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          lessonContext: {
            courseTitle: course.title,
            lessonTitle: currentLesson.title,
            textContent: currentLesson.textContent || "",
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Nova service error");
      }

      const data = await res.json();
      setNovaMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "I'm having trouble retrieving a response right now." },
      ]);
    } catch (err) {
      setNovaMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach Nova right now. Please verify your GEMINI_API_KEY is configured.",
        },
      ]);
    } finally {
      setNovaLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Player Navigation Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/90 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
            {course.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress Indicator */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-400">Progress:</span>
            <div className="w-24 h-2 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${courseProgress?.percentage || 0}%` }}
              />
            </div>
            <span className="text-xs font-mono text-blue-400 font-semibold">
              {courseProgress?.percentage || 0}%
            </span>
          </div>

          {/* Nova AI Tutor Button */}
          <button
            onClick={() => setNovaOpen(!novaOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              novaOpen
                ? "bg-violet-600 text-white shadow-violet-500/25"
                : "bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nova AI Tutor</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Syllabus Sidebar */}
        <aside
          className={`absolute lg:static top-0 bottom-0 left-0 w-80 bg-slate-900 border-r border-slate-800 z-30 transition-transform duration-300 flex flex-col ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Course Syllabus
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {course.modules.map((module, mIdx) => (
              <div key={module.id} className="space-y-1">
                <p className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
                  Module {mIdx + 1}: {module.title}
                </p>
                <div className="space-y-0.5 mt-1">
                  {module.lessons.map((lesson) => {
                    const isDone = !!progress[lesson.id];
                    const isActive = lesson.id === currentLesson.id;

                    return (
                      <Link
                        key={lesson.id}
                        href={`/learn/${course.slug}/${lesson.slug}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        {lesson.durationMinutes && (
                          <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                            {lesson.durationMinutes}m
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Content Viewport */}
        <main className="flex-1 overflow-y-auto flex flex-col p-4 sm:p-8 lg:px-12 max-w-4xl mx-auto w-full">
          <div className="flex-1 space-y-6">
            {/* Lesson Header */}
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                {currentLesson.module.title}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {currentLesson.title}
              </h1>

              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentLesson.contentType}
                </span>
                {currentLesson.durationMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {currentLesson.durationMinutes} mins
                  </span>
                )}
              </div>
            </div>

            {/* External Media / Video Embed */}
            {currentLesson.mediaUrl && (
              <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video w-full flex items-center justify-center relative">
                {currentLesson.mediaUrl.includes("youtube.com") ||
                currentLesson.mediaUrl.includes("youtu.be") ? (
                  <iframe
                    src={currentLesson.mediaUrl.replace("watch?v=", "embed/")}
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <ExternalLink className="w-8 h-8 text-blue-400 mx-auto" />
                    <p className="text-sm font-semibold text-white">External Learning Resource</p>
                    <a
                      href={currentLesson.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                    >
                      Open Link in New Tab
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Lesson Text / Markdown Content */}
            {currentLesson.textContent ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/90 shadow-sm">
                <div className="prose-dark whitespace-pre-line text-sm sm:text-base leading-relaxed">
                  {currentLesson.textContent}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-sm">
                No written notes provided for this lesson. Refer to attached video or external resources.
              </div>
            )}

            {/* Attached Resources */}
            {currentLesson.resources.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Lesson Resources & Links
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentLesson.resources.map((res) => (
                    <a
                      key={res.id}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-blue-500/50 flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors group"
                    >
                      <span className="font-medium truncate">{res.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {prevLesson ? (
                <Link
                  href={`/learn/${course.slug}/${prevLesson.slug}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous: {prevLesson.title}
                </Link>
              ) : (
                <div />
              )}
            </div>

            {/* Mark as Complete Toggle */}
            <button
              onClick={handleToggleComplete}
              disabled={isUpdating}
              className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-md ${
                isCurrentCompleted
                  ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
              }`}
            >
              {isCurrentCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Lesson Completed (Click to Undo)
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4" />
                  Mark as Complete
                </>
              )}
            </button>

            <div>
              {nextLesson ? (
                <Link
                  href={`/learn/${course.slug}/${nextLesson.slug}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Next: {nextLesson.title} <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Course Completed! Return to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </main>

        {/* Right Nova AI Drawer */}
        <aside
          className={`absolute lg:static top-0 bottom-0 right-0 w-84 sm:w-96 bg-slate-900 border-l border-slate-800 z-30 transition-transform duration-300 flex flex-col ${
            novaOpen ? "translate-x-0" : "translate-x-full lg:hidden"
          }`}
        >
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center text-white">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">Nova AI Learning Assistant</span>
            </div>
            <button
              onClick={() => setNovaOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/20 flex flex-wrap gap-1.5">
            <button
              onClick={() => handleSendNova("Explain this lesson in simple terms.")}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Explain simply
            </button>
            <button
              onClick={() => handleSendNova("Give me a practice exercise based on this lesson.")}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Practice exercise
            </button>
            <button
              onClick={() => handleSendNova("Why does this code produce this output?")}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Code breakdown
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {novaMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-slate-950/70 border border-slate-800 text-slate-200"
                    : "bg-blue-600 text-white ml-6"
                }`}
              >
                <p className="font-semibold text-[10px] uppercase tracking-wider mb-1 text-slate-400">
                  {msg.role === "assistant" ? "Nova" : "You"}
                </p>
                <div className="whitespace-pre-line">{msg.content}</div>
              </div>
            ))}
            {novaLoading && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-400 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-violet-400 border-t-transparent animate-spin" />
                <span>Nova is thinking...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/40">
            <div className="relative">
              <input
                type="text"
                value={novaInput}
                onChange={(e) => setNovaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendNova()}
                placeholder="Ask Nova a question about this lesson..."
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={() => handleSendNova()}
                disabled={novaLoading || !novaInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-400 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
