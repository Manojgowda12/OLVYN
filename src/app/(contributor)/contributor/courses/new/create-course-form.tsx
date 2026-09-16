"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

export function CreateCourseForm({ categories }: { categories: Category[] }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("BEGINNER");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [estimatedHours, setEstimatedHours] = useState("3.0");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/contributor/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortSummary,
          description,
          difficulty,
          categoryId,
          estimatedHours: parseFloat(estimatedHours) || 0,
          thumbnailUrl: thumbnailUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create course.");
      }

      router.push(`/contributor/courses/${data.course.id}/edit`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-7 sm:p-9 rounded-3xl bg-white border border-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-[#121417]">
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" suppressHydrationWarning>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
            Course Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Cloud Architecture"
            className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] focus:ring-1 focus:ring-[#121417] transition-all"
            suppressHydrationWarning
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
            Short Summary * (10-200 chars)
          </label>
          <input
            type="text"
            required
            value={shortSummary}
            onChange={(e) => setShortSummary(e.target.value)}
            placeholder="A concise, punchy description shown in cards and search results."
            className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] focus:ring-1 focus:ring-[#121417] transition-all"
            suppressHydrationWarning
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] transition-all"
              suppressHydrationWarning
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
              Difficulty *
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] transition-all"
              suppressHydrationWarning
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="ALL_LEVELS">All Levels</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
              Estimated Duration (Hours)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] transition-all"
              suppressHydrationWarning
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
              Thumbnail Image URL (Optional)
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] transition-all"
              suppressHydrationWarning
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#121417] mb-1.5">
            Full Course Description *
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what learners will achieve, prerequisites, and learning outcomes."
            className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-[#121417] placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#121417] transition-all font-mono"
            suppressHydrationWarning
          />
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <Link
            href="/contributor"
            className="text-xs font-bold text-[#121417] hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className="px-7 py-3 rounded-full bg-[#121417] hover:bg-black disabled:opacity-50 text-[#d2f835] font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            suppressHydrationWarning
          >
            <span>{isLoading ? "Creating Draft..." : "Continue to Course Studio"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

