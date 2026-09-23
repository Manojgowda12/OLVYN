"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Compass } from "lucide-react";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error indicator on client
    console.error("OLVYN Client Error Boundary caught an exception:", {
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4 py-16">
      <div
        className="max-w-md w-full p-8 rounded-3xl text-center relative overflow-hidden backdrop-blur-xl transition-all"
        style={{
          background: "rgba(13, 22, 41, 0.75)",
          border: "1px solid rgba(37, 99, 235, 0.25)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(37, 99, 235, 0.12)",
        }}
      >
        {/* Subtle decorative glow */}
        <div
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)" }}
        />

        {/* Warning Icon Badge */}
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-transform hover:scale-105"
          style={{
            background: "rgba(37, 99, 235, 0.15)",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            boxShadow: "0 0 20px rgba(0, 240, 255, 0.15)",
          }}
        >
          <AlertTriangle className="w-7 h-7 text-[#00F0FF]" />
        </div>

        {/* Headline */}
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3"
          style={{ color: "#F5F7FF" }}
        >
          Something Went Wrong
        </h1>

        {/* Safe, non-leaking user explanation */}
        <p
          className="text-sm leading-relaxed mb-6 font-medium"
          style={{ color: "#B8C4D9" }}
        >
          An unexpected error occurred while loading this page. Our platform monitoring
          has recorded the event. No sensitive data was exposed.
        </p>

        {error.digest && (
          <div
            className="mb-6 px-3 py-1.5 rounded-lg text-xs font-mono inline-block"
            style={{
              background: "rgba(5, 14, 36, 0.8)",
              border: "1px solid rgba(127, 140, 168, 0.2)",
              color: "#7F8CA8",
            }}
          >
            Incident ID: {error.digest}
          </div>
        )}

        {/* Safe Recovery Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all cursor-pointer hover:opacity-95 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.35)",
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

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

        <div className="mt-6 pt-4 border-t border-blue-500/15">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
            style={{ color: "#7F8CA8" }}
          >
            <Compass className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Explore Course Catalog</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
