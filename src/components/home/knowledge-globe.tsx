"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, useReducedMotion } from "motion/react";

// Knowledge nodes positioned around the globe surface (polar coords → xy%)
const KNOWLEDGE_NODES = [
  { top: "18%", left: "38%", delay: 0 },
  { top: "28%", left: "62%", delay: 0.8 },
  { top: "45%", left: "72%", delay: 1.4 },
  { top: "60%", left: "55%", delay: 0.4 },
  { top: "55%", left: "28%", delay: 2.1 },
  { top: "35%", left: "18%", delay: 1.0 },
  { top: "70%", left: "40%", delay: 1.8 },
  { top: "22%", left: "50%", delay: 0.6 },
];

const FLOATING_PANELS = [
  { label: "LEARN", icon: "◎", top: "12%", left: "-18%", animClass: "fp-1" },
  { label: "BUILD", icon: "◈", top: "72%", left: "-12%", animClass: "fp-2" },
  { label: "AI GUIDANCE", icon: "✦", top: "8%", right: "-15%", animClass: "fp-3" },
  { label: "DISCOVER", icon: "◉", top: "68%", right: "-18%", animClass: "fp-4" },
] as const;

// Particle canvas for ambient starfield
function ParticleCanvas({ size }: { size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; r: number; a: number }>>([]);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width = size;
    const H = canvas.height = size;
    const count = 60;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.6 + 0.3,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${p.a * 0.75})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, [size]);

  useEffect(() => {
    init();
    return () => cancelAnimationFrame(animRef.current);
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        pointerEvents: "none",
        opacity: 0.85,
      }}
    />
  );
}

// SVG continent-like geographic overlay with visible internal structure
function GlobeGrid() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="globe-grid"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "50%" }}
    >
      {/* Latitude lines */}
      {[30, 60, 90, 120, 150].map((y) => (
        <ellipse
          key={y}
          cx="100" cy={y}
          rx={Math.sin((y / 200) * Math.PI) * 98}
          ry="4"
          fill="none"
          stroke="rgba(147, 197, 253, 0.42)"
          strokeWidth="0.5"
        />
      ))}
      {/* Longitude lines */}
      {[0, 36, 72, 108, 144].map((angle) => (
        <ellipse
          key={angle}
          cx="100" cy="100"
          rx="4"
          ry="96"
          fill="none"
          stroke="rgba(147, 197, 253, 0.35)"
          strokeWidth="0.5"
          transform={`rotate(${angle} 100 100)`}
        />
      ))}
      {/* Continent silhouettes (stylized geographic landmasses) */}
      <path
        d="M 68 55 C 72 48, 85 47, 90 52 C 96 55, 98 62, 95 68 C 91 75, 82 78, 75 74 C 67 69, 63 62, 68 55 Z"
        fill="rgba(37, 99, 235, 0.28)"
        stroke="rgba(96, 165, 250, 0.6)"
        strokeWidth="0.6"
      />
      <path
        d="M 105 48 C 112 44, 128 46, 132 54 C 136 61, 130 70, 122 73 C 114 76, 106 72, 104 65 C 102 58, 99 52, 105 48 Z"
        fill="rgba(37, 99, 235, 0.25)"
        stroke="rgba(96, 165, 250, 0.55)"
        strokeWidth="0.6"
      />
      <path
        d="M 78 88 C 82 82, 92 80, 96 86 C 100 92, 97 102, 91 106 C 84 110, 76 107, 73 100 C 71 94, 74 93, 78 88 Z"
        fill="rgba(6, 182, 212, 0.22)"
        stroke="rgba(6, 182, 212, 0.55)"
        strokeWidth="0.6"
      />
      <path
        d="M 108 85 C 115 80, 126 82, 129 90 C 132 97, 127 108, 118 110 C 110 112, 104 106, 105 99 C 106 92, 102 89, 108 85 Z"
        fill="rgba(37, 99, 235, 0.22)"
        stroke="rgba(96, 165, 250, 0.5)"
        strokeWidth="0.6"
      />
      <path
        d="M 85 118 C 90 114, 100 115, 102 122 C 104 128, 100 135, 94 137 C 87 139, 81 134, 81 127 C 81 121, 81 121, 85 118 Z"
        fill="rgba(124, 58, 237, 0.2)"
        stroke="rgba(167, 139, 250, 0.45)"
        strokeWidth="0.6"
      />
    </svg>
  );
}

export function KnowledgeGlobe() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Subtle parallax from mouse position
  const rotateX = useTransform(mouseY, [-300, 300], reduceMotion ? [0, 0] : [6, -6]);
  const rotateY = useTransform(mouseX, [-300, 300], reduceMotion ? [0, 0] : [-8, 8]);
  const panelX  = useTransform(mouseX, [-300, 300], reduceMotion ? [0, 0] : [-6, 6]);
  const panelY  = useTransform(mouseY, [-300, 300], reduceMotion ? [0, 0] : [-4, 4]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || reduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouseX.set(e.clientX - cx);
      mouseY.set(e.clientY - cy);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, reduceMotion]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{
        width: "var(--globe-size, 480px)",
        height: "var(--globe-size, 480px)",
        perspective: "1200px",
      }}
    >
      {/* Outer ambient glow — subtle background depth */}
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(37,99,235,0.18) 0%, rgba(6,182,212,0.06) 45%, transparent 70%)",
          filter: "blur(32px)",
          pointerEvents: "none",
        }}
      />

      {/* Globe + rings wrapper — responds to mouse */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          position: "relative",
          width: "100%",
          height: "100%",
        }}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
      >
        {/* Orbital rings — slightly brighter for clear silhouette */}
        <div className="orbital-ring orbital-1" />
        <div className="orbital-ring orbital-2" />
        <div className="orbital-ring orbital-3" />

        {/* Main sphere — midground depth with clearer edge lighting */}
        <div className="globe-sphere" style={{ position: "absolute", inset: 0 }}>
          <GlobeGrid />
          <div className="globe-shine" />
          {!reduceMotion && <ParticleCanvas size={480} />}

          {/* Cyan knowledge nodes — brighter and high contrast */}
          {KNOWLEDGE_NODES.map((node, i) => (
            <div
              key={i}
              className="k-node"
              style={{
                top: node.top,
                left: node.left,
                animationDuration: `${2 + i * 0.4}s`,
                animationDelay: `${node.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Platform pedestal */}
        <div className="platform-base">
          <div className="platform-ring" />
          <div className="platform-ring" />
          <div className="platform-ring" />
          <div className="platform-ring" />
          <div className="platform-glow" />
        </div>
      </motion.div>

      {/* Floating panels — foreground depth, crisp readable labels and cyan icons */}
      <motion.div
        style={{ x: panelX, y: panelY, position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {FLOATING_PANELS.map((panel) => (
          <div
            key={panel.label}
            className={`floating-panel ${panel.animClass}`}
            style={{
              top: panel.top,
              ...("left" in panel ? { left: panel.left } : { right: (panel as { right: string }).right }),
            }}
          >
            <span className="panel-dot" />
            <span style={{ color: "#00f0ff", textShadow: "0 0 8px rgba(0,240,255,0.7)" }}>{panel.icon}</span>
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{panel.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
