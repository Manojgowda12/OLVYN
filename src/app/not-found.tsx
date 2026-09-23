import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] w-full flex items-center justify-center px-4 py-16">
      <div
        className="max-w-md w-full p-8 rounded-3xl text-center relative overflow-hidden backdrop-blur-xl transition-all"
        style={{
          background: "rgba(13, 22, 41, 0.75)",
          border: "1px solid rgba(37, 99, 235, 0.25)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(37, 99, 235, 0.1)",
        }}
      >
        {/* Glow */}
        <div
          className="absolute -top-20 -right-20 w-44 h-44 rounded-full pointer-events-none opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #00f0ff 0%, transparent 70%)" }}
        />

        {/* 404 Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5 text-xs font-mono font-bold tracking-wider"
          style={{
            background: "rgba(37, 99, 235, 0.15)",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            color: "#00F0FF",
          }}
        >
          <Search className="w-3.5 h-3.5" />
          <span>ERROR 404</span>
        </div>

        {/* Headline */}
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3"
          style={{ color: "#F5F7FF" }}
        >
          Page Not Found
        </h1>

        {/* Subtitle */}
        <p
          className="text-sm leading-relaxed mb-6 font-medium"
          style={{ color: "#B8C4D9" }}
        >
          The curriculum, lesson, or resource you requested could not be located.
          It may have been moved or unpublished.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/explore"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-95 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.35)",
            }}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore Courses</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all hover:bg-blue-500/10 active:scale-95"
            style={{
              background: "rgba(13, 22, 41, 0.7)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "#F5F7FF",
            }}
          >
            <Home className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
