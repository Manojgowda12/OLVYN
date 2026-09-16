"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Bot,
  User,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Zap,
  HelpCircle,
  Lightbulb,
  Compass
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedPrompts?: string[];
  referencedCourses?: Array<{ title: string; slug: string; difficulty: string; category?: string }>;
  timestamp: Date;
}

const INITIAL_PROMPT_CHIPS = [
  {
    icon: Compass,
    title: "Learning Roadmap",
    prompt: "Design a 4-week study roadmap to become proficient in full-stack web development.",
  },
  {
    icon: Zap,
    title: "Python Coding Challenge",
    prompt: "Give me a practical Python coding challenge with step-by-step guidance and solution.",
  },
  {
    icon: Lightbulb,
    title: "Explain Server Components",
    prompt: "Explain the difference between React 19 Server Components and Client Components simply.",
  },
  {
    icon: BookOpen,
    title: "Explore Course Catalog",
    prompt: "What are the most popular beginner courses currently published on OpenLearner?",
  },
];

export function NovaChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "### 👋 Hello! I'm Nova, your AI Learning Companion & Tutor.\n\n" +
        "I am directly connected to the live OpenLearner curriculum database. Ask me anything about our courses, request personalized study roadmaps, practice coding challenges, or get instant explanations on complex topics.\n\n" +
        "*How can I help you learn today?*",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newUserMsg: Message = {
      id: userMessageId,
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      // Build history for multi-turn context
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/nova/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      const botMessageId = `assistant-${Date.now()}`;
      const newBotMsg: Message = {
        id: botMessageId,
        role: "assistant",
        content: data.reply,
        suggestedPrompts: data.suggestedPrompts,
        referencedCourses: data.referencedCourses,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newBotMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Sorry, I encountered an issue: ${err.message}. Please try asking again or select one of the suggested prompts below.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content:
          "### 🔄 Chat reset.\n\nI'm ready for a fresh topic! What would you like to explore or study next?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col min-h-[calc(100vh-140px)] text-[#121417]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#121417] text-[#d2f835] text-xs font-black uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#d2f835]" />
            <span>Live AI Learning Companion</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#121417] tracking-tight">
            Nova AI Tutor
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#475467] max-w-xl">
            Grounded in our live course database. Ask questions, plan study schedules, and practice concepts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleResetChat}
            className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-black/10 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>New Chat</span>
          </button>
          <Link
            href="/explore"
            className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#121417] flex items-center gap-1.5 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse Courses</span>
          </Link>
        </div>
      </div>

      {/* Suggested Prompt Chips (when 1 or 2 messages) */}
      {messages.length <= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {INITIAL_PROMPT_CHIPS.map((chip, idx) => {
            const Icon = chip.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(chip.prompt)}
                className="p-4 rounded-2xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-black/20 hover:shadow-md transition-all text-left group flex flex-col justify-between cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-xl bg-[#121417] text-[#d2f835] flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#121417]">{chip.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {chip.prompt}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white rounded-3xl border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 sm:p-7 overflow-y-auto space-y-6 max-h-[60vh] sm:max-h-[65vh]">
        {messages.map((msg) => {
          const isAssistant = msg.role === "assistant";

          return (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 ${isAssistant ? "items-start" : "items-start justify-end"}`}
            >
              {isAssistant && (
                <div className="w-9 h-9 rounded-2xl bg-[#121417] text-[#d2f835] flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`rounded-3xl p-5 sm:p-6 max-w-3xl space-y-3 ${
                  isAssistant
                    ? "bg-slate-50/80 border border-slate-200/80 text-[#121417]"
                    : "bg-[#121417] text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isAssistant ? "text-slate-500" : "text-[#d2f835]"}`}>
                    {isAssistant ? "Nova Assistant" : "You"}
                  </span>
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className={`p-1 rounded-md text-[11px] flex items-center gap-1 ${
                      isAssistant
                        ? "text-slate-400 hover:text-slate-700"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Content with basic formatting */}
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>
              </div>

              {!isAssistant && (
                <div className="w-9 h-9 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-slate-500 italic p-3">
            <div className="w-7 h-7 rounded-xl bg-[#121417] text-[#d2f835] flex items-center justify-center animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>Nova is querying the curriculum database and formulating an answer...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Box */}
      <div className="mt-4 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Nova anything about courses, coding concepts, or study roadmaps..."
            disabled={isLoading}
            className="w-full pl-5 pr-32 py-4 rounded-full bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-xs sm:text-sm text-[#121417] placeholder-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 px-5 py-2.5 rounded-full bg-[#121417] hover:bg-black disabled:opacity-40 text-[#d2f835] text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
          Nova AI dynamically queries live database curricula to generate accurate, verified educational assistance.
        </p>
      </div>
    </div>
  );
}
