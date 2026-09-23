"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, Terminal, ShieldCheck, ArrowRight, Layers, BookOpen, Compass } from "lucide-react";

/**
 * Isolated leaf component: BentoNovaPrompt
 * Simulates real-time lesson query & grounding in Nova AI copilot.
 * Memoized to prevent any parent layout re-renders.
 */
export const BentoNovaPrompt = React.memo(function BentoNovaPrompt() {
  const prompts = [
    "Clarify matrix multiplication in Lesson 2...",
    "How does backprop compute loss gradients?",
    "Summarize key syllabus points for Module 1...",
  ];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fullText = prompts[currentIdx];

    if (!isDeleting && displayText.length < fullText.length) {
      timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1));
      }, 55);
    } else if (!isDeleting && displayText.length === fullText.length) {
      timer = setTimeout(() => setIsDeleting(true), 2400);
    } else if (isDeleting && displayText.length > 0) {
      timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length - 1));
      }, 25);
    } else if (isDeleting && displayText.length === 0) {
      setIsDeleting(false);
      setCurrentIdx((prev) => (prev + 1) % prompts.length);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIdx]);

  return (
    <div className="p-4 rounded-xl bg-[#070e1e]/90 border border-cyan-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-cyan-500/20 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Terminal className="w-3.5 h-3.5" />
          <span>NOVA_GROUNDING_ENGINE</span>
        </div>
        <div className="flex items-center gap-1 text-[#7F8CA8]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
          </span>
          <span className="text-[10px] text-cyan-400 uppercase font-semibold">Ready</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#EAF2FF] min-h-[28px] font-mono">
        <span className="text-cyan-400 font-bold">&gt;</span>
        <span>{displayText}</span>
        <span className="w-1.5 h-3.5 bg-cyan-400 animate-pulse inline-block" />
      </div>

      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#A8B4CC]">
        <span>Context: Active Lesson Notes</span>
        <span className="text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Zero Hallucination
        </span>
      </div>
    </div>
  );
});

/**
 * Isolated leaf component: BentoSyllabusSimulator
 * Simulates structured curriculum progression with auto-scrolling telemetry.
 */
export const BentoSyllabusSimulator = React.memo(function BentoSyllabusSimulator() {
  const steps = [
    { title: "Foundations & Syntax", status: "completed", time: "25m" },
    { title: "Data Structures & Trees", status: "active", time: "40m" },
    { title: "Applied Graph Algorithms", status: "queued", time: "55m" },
  ];

  return (
    <div className="space-y-2 mt-3 font-mono text-xs">
      {steps.map((s, idx) => (
        <div
          key={s.title}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
            s.status === "completed"
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
              : s.status === "active"
              ? "bg-blue-600/15 border-blue-400/40 text-blue-200 shadow-[0_0_12px_rgba(37,99,235,0.2)]"
              : "bg-white/[0.02] border-white/[0.06] text-[#7F8CA8]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] opacity-60">0{idx + 1}</span>
            <span className="font-sans font-semibold text-[13px]">{s.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] opacity-80">{s.time}</span>
            {s.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            {s.status === "active" && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#3b82f6]" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Isolated leaf component: BentoTelemetryBadge
 * Live status telemetry ticker for 100% open platform.
 */
export const BentoTelemetryBadge = React.memo(function BentoTelemetryBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-[11px] font-mono text-blue-300 shadow-[0_0_12px_rgba(37,99,235,0.15)]">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
      </span>
      <span>RESOURCES: 100% OPEN · PAYWALLS: 0</span>
    </div>
  );
});
