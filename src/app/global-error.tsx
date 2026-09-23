"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("OLVYN Root Layout Error Boundary:", {
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#050816",
          color: "#F5F7FF",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            padding: "2rem",
            borderRadius: "1.5rem",
            textAlign: "center",
            background: "rgba(13, 22, 41, 0.9)",
            border: "1px solid rgba(37, 99, 235, 0.3)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "1rem",
              margin: "0 auto 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(37, 99, 235, 0.2)",
              border: "1px solid rgba(6, 182, 212, 0.4)",
            }}
          >
            <AlertTriangle style={{ width: "1.75rem", height: "1.75rem", color: "#00F0FF" }} />
          </div>

          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.75rem", color: "#F5F7FF" }}>
            Critical Platform Exception
          </h1>

          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 1.5rem", color: "#B8C4D9" }}>
            A core application exception occurred. The platform reliability service has recorded this incident.
          </p>

          {error.digest && (
            <div
              style={{
                fontSize: "0.75rem",
                fontFamily: "monospace",
                color: "#7F8CA8",
                marginBottom: "1.5rem",
              }}
            >
              Digest: {error.digest}
            </div>
          )}

          <button
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#FFFFFF",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "none",
              cursor: "pointer",
            }}
          >
            <RefreshCw style={{ width: "1rem", height: "1rem" }} />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
