"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  Sparkles,
  Send,
  Bot,
  User,
  BookOpen,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Lightbulb,
  Compass,
  MessageSquare,
  Trash2,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Brain,
  X,
  Shield,
} from "lucide-react";

interface MemoryItem {
  id: string;
  memoryType: string;
  key: string;
  value: string;
  confidence: number;
  importance: number;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedPrompts?: string[];
  referencedCourses?: Array<{ title: string; slug: string; difficulty: string; category?: string }>;
  sources?: Array<{ courseTitle: string; lessonTitle?: string | null; sourceUrl: string }>;
  timestamp: Date;
}

interface ConversationItem {
  id: string;
  title: string;
  mode: string;
  courseTitle?: string;
  lessonTitle?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
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

const WELCOME_MESSAGE: Message = {
  id: "welcome-msg",
  role: "assistant",
  content:
    "### 👋 Hello! I'm Nova, your AI Learning Companion & Tutor.\n\n" +
    "I am directly connected to the live OpenLearner curriculum database. Ask me anything about our courses, request personalized study roadmaps, practice coding challenges, or get instant explanations on complex topics.\n\n" +
    "*How can I help you learn today?*",
  timestamp: new Date(),
};

export function NovaChatView() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Nova Personal Memory State
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [memoryStatusMessage, setMemoryStatusMessage] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    setIsLoadingMemories(true);
    try {
      const res = await fetch("/api/user/memories");
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
        if (typeof data.memoryEnabled === "boolean") {
          setMemoryEnabled(data.memoryEnabled);
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  const handleToggleMemoryEnabled = async () => {
    const nextState = !memoryEnabled;
    setMemoryEnabled(nextState);
    try {
      const res = await fetch("/api/user/memories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryEnabled: nextState }),
      });
      if (res.ok) {
        setMemoryStatusMessage(`Personal memory is now ${nextState ? "active" : "paused"}.`);
        setTimeout(() => setMemoryStatusMessage(null), 3000);
      }
    } catch {
      setMemoryEnabled(!nextState);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/user/memories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      // Ignore
    }
  };

  const handleClearAllMemories = async () => {
    if (!window.confirm("Are you sure you want to clear all personal memories stored by Nova? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/user/memories", { method: "DELETE" });
      if (res.ok) {
        setMemories([]);
        setMemoryStatusMessage("All personal memories cleared.");
        setTimeout(() => setMemoryStatusMessage(null), 3000);
      }
    } catch {
      // Ignore
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Fetch conversations list on mount
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/nova/conversations");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to load conversations");

      const data = await res.json();
      setIsAuthenticated(true);
      setConversations(data.conversations || []);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load selected conversation
  const loadConversation = async (convId: string) => {
    if (convId === activeConversationId || isLoading) return;
    setIsLoadingHistory(true);

    try {
      const res = await fetch(`/api/nova/conversations/${convId}`);
      if (!res.ok) throw new Error("Could not load conversation");

      const data = await res.json();
      const conv = data.conversation;

      if (conv && Array.isArray(conv.messages)) {
        setActiveConversationId(conv.id);
        const mappedMessages: Message[] = conv.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));

        setMessages(mappedMessages.length > 0 ? mappedMessages : [WELCOME_MESSAGE]);
      }
    } catch (err: any) {
      console.error("Error loading conversation:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/nova/conversations/${convId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete conversation");

      setConversations((prev) => prev.filter((c) => c.id !== convId));

      if (activeConversationId === convId) {
        handleNewChat();
      }
    } catch (err: any) {
      console.error("Delete conversation error:", err);
    }
  };

  // Start fresh chat
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content:
          "### 🔄 Fresh Learning Session Started.\n\nI'm ready for a new topic! What would you like to explore or study next?",
        timestamp: new Date(),
      },
    ]);
  };

  // Send message
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
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/nova/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          conversationId: activeConversationId || undefined,
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
        sources: data.retrieval?.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newBotMsg]);

      // If a new conversation was created on the server, update state and refresh list
      if (data.conversationId && data.conversationId !== activeConversationId) {
        setActiveConversationId(data.conversationId);
        fetchConversations();
      }
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

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col min-h-[calc(100vh-120px)] text-slate-900">
      {/* Top Navigation & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
              title={sidebarOpen ? "Hide chat history" : "Show chat history"}
              aria-label="Toggle chat history sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          )}

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-900 text-[#d2f835] text-[11px] font-black uppercase tracking-wider shadow-xs mb-1">
              <Sparkles className="w-3 h-3 text-[#d2f835]" />
              <span>Live AI Learning Companion</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Nova AI Tutor
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAuthenticated && (
            <button
              onClick={() => {
                setShowMemoryModal(true);
                fetchMemories();
              }}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 border border-black/10 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              title="View and manage personal memory"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>Memory</span>
            </button>
          )}
          <button
            onClick={handleNewChat}
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
            <span>Catalog</span>
          </Link>
        </div>
      </div>

      {/* Main Layout Area: Sidebar + Chat Stream */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* Sidebar for Persistent Conversations */}
        {isAuthenticated && sidebarOpen && (
          <aside className="w-64 sm:w-72 shrink-0 bg-white rounded-3xl border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 flex flex-col justify-between hidden md:flex">
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Saved History
                </span>
                <button
                  onClick={handleNewChat}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Create new session"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {conversations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 text-center">
                    No saved chats yet. Start chatting to save your learning history.
                  </p>
                ) : (
                  conversations.map((c) => {
                    const isActive = c.id === activeConversationId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => loadConversation(c.id)}
                        className={`group p-3 rounded-2xl cursor-pointer transition-all flex items-start justify-between gap-2 text-left ${
                          isActive
                            ? "bg-slate-900 text-white shadow-xs"
                            : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate leading-snug">
                            {c.title || "Learning Session"}
                          </p>
                          <p
                            className={`text-[10px] mt-0.5 flex items-center gap-1 ${
                              isActive ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                            <span>• {c.messageCount} msgs</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(e, c.id)}
                          className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                            isActive
                              ? "hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                              : "hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          }`}
                          title="Delete session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* User status */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center font-medium">
              Persistent Learning Memory Active
            </div>
          </aside>
        )}

        {/* Chat Stream View */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Guest notification if unauthenticated */}
          {isAuthenticated === false && (
            <div className="mb-3 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
              <span>💡 You are exploring as a guest. Sign in to save and resume your Nova AI learning conversations.</span>
              <Link href="/login" className="underline font-bold text-amber-950 ml-2 shrink-0">
                Sign In
              </Link>
            </div>
          )}

          {/* Suggested Prompt Chips */}
          {messages.length <= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
              {INITIAL_PROMPT_CHIPS.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip.prompt)}
                    className="p-3.5 rounded-2xl bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-black/20 hover:shadow-md transition-all text-left group flex flex-col justify-between cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-xl bg-[#121417] text-[#d2f835] flex items-center justify-center shrink-0">
                        <Icon className="w-3 h-3" />
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

          {/* Messages List */}
          <div className="flex-1 bg-white rounded-3xl border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 sm:p-6 overflow-y-auto space-y-5 max-h-[55vh] sm:max-h-[60vh]">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12 text-xs text-slate-400">
                Loading saved conversation...
              </div>
            ) : (
              messages.map((msg) => {
                const isAssistant = msg.role === "assistant";

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 sm:gap-4 ${isAssistant ? "items-start" : "items-start justify-end"}`}
                  >
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-2xl bg-[#121417] text-[#d2f835] flex items-center justify-center shrink-0 shadow-xs mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`rounded-3xl p-4 sm:p-5 max-w-3xl space-y-2.5 ${
                        isAssistant
                          ? "bg-slate-50/80 border border-slate-200/80 text-[#121417]"
                          : "bg-[#121417] text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isAssistant ? "text-slate-500" : "text-[#d2f835]"
                          }`}
                        >
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

                      <div className="text-xs sm:text-sm leading-relaxed font-sans">
                        <MarkdownRenderer content={msg.content} isUser={!isAssistant} />
                      </div>

                      {isAssistant && msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-black/5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-semibold text-[11px] text-slate-600">📚 Curriculum:</span>
                          {msg.sources.map((s, idx) => (
                            <Link
                              key={idx}
                              href={s.sourceUrl}
                              className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-black hover:border-black/30 transition-all font-medium text-[11px]"
                            >
                              {s.lessonTitle || s.courseTitle}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isAssistant && (
                      <div className="w-8 h-8 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex items-center gap-3 text-xs text-slate-500 italic p-3">
                <div className="w-6 h-6 rounded-xl bg-[#121417] text-[#d2f835] flex items-center justify-center animate-pulse">
                  <Sparkles className="w-3 h-3" />
                </div>
                <span>Nova is reasoning with curriculum data...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="mt-3">
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
                className="w-full pl-5 pr-28 py-3.5 rounded-full bg-white border border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-xs sm:text-sm text-[#121417] placeholder-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 px-4 py-2 rounded-full bg-[#121417] hover:bg-black disabled:opacity-40 text-[#d2f835] text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <span>Ask</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Nova Personal Memory Modal */}
      {showMemoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-black/10 shadow-2xl p-6 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">Nova Personal Memory</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-600" /> Private
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Durable learning facts extracted to personalize your tutor experience.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Toast inside Modal */}
            {memoryStatusMessage && (
              <div className="my-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <span>{memoryStatusMessage}</span>
              </div>
            )}

            {/* Memory Controls Bar */}
            <div className="py-3 flex items-center justify-between border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Personalized Memory</span>
                <button
                  onClick={handleToggleMemoryEnabled}
                  className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition-all cursor-pointer ${
                    memoryEnabled
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {memoryEnabled ? "ACTIVE" : "PAUSED"}
                </button>
              </div>

              {memories.length > 0 && (
                <button
                  onClick={handleClearAllMemories}
                  className="text-red-500 hover:text-red-700 font-bold transition-colors cursor-pointer"
                >
                  Clear All Memory
                </button>
              )}
            </div>

            {/* Memories List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {isLoadingMemories ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading memories...</div>
              ) : memories.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Brain className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No personal memories yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    As you chat about what you're learning, your goals, and concepts you struggle with, Nova will remember them here.
                  </p>
                </div>
              ) : (
                memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-slate-300 transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1 text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100/70 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                          {m.memoryType.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">{m.key}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed break-words">{m.value}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0 cursor-pointer"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer Note */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
              Memories are never shared across accounts and never override platform safety guardrails.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
