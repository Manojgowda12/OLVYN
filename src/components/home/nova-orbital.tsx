"use client";

import { useReducedMotion } from "motion/react";

// Orbital word nodes around the Nova core
const NOVA_CONCEPTS = [
  { label: "UNDERSTAND", angle: 210, radius: 90 },
  { label: "PRACTICE",   angle: 30,  radius: 130 },
  { label: "EXPLORE",    angle: 150, radius: 165 },
  { label: "LEARN",      angle: 270, radius: 115 },
  { label: "TRACK",      angle: 340, radius: 145 },
];

function polarToXY(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}

export function NovaOrbital() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      style={{
        position: "relative",
        width: 360,
        height: 360,
        flexShrink: 0,
      }}
    >
      {/* SVG orbital rings with enhanced visibility */}
      <svg
        viewBox="-180 -180 360 360"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        {/* Orbital circles */}
        <circle cx="0" cy="0" r="90"  fill="none" stroke="rgba(59, 130, 246, 0.45)"  strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="0" cy="0" r="130" fill="none" stroke="rgba(6, 182, 212, 0.4)"   strokeWidth="1" strokeDasharray="3 8" />
        <circle cx="0" cy="0" r="165" fill="none" stroke="rgba(139, 92, 246, 0.35)" strokeWidth="1" strokeDasharray="2 10" />

        {/* Connection lines from core to concepts */}
        {NOVA_CONCEPTS.map((c) => {
          const { x, y } = polarToXY(c.angle, c.radius);
          return (
            <line
              key={c.label}
              x1="0" y1="0" x2={x} y2={y}
              stroke="rgba(59, 130, 246, 0.25)"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Orbital dot markers */}
        {NOVA_CONCEPTS.map((c) => {
          const inner = polarToXY(c.angle, c.radius - 20);
          return (
            <circle
              key={`dot-${c.label}`}
              cx={inner.x}
              cy={inner.y}
              r="2.5"
              fill="#00f0ff"
              opacity="0.9"
            />
          );
        })}
      </svg>

      {/* Core glowing orb */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "radial-gradient(circle, #2563eb 0%, #1e40af 50%, #081a4e 85%, transparent 100%)",
          animation: reduceMotion ? "none" : "nova-core-pulse 3s ease-in-out infinite",
          zIndex: 10,
        }}
      >
        {/* Inner ring */}
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: "1.5px solid rgba(59, 130, 246, 0.65)",
            animation: reduceMotion ? "none" : "nova-ring-spin 6s linear infinite",
          }}
        />
        {/* Outer ring */}
        <div
          style={{
            position: "absolute",
            inset: -16,
            borderRadius: "50%",
            border: "1px dashed rgba(6, 182, 212, 0.45)",
            animation: reduceMotion ? "none" : "nova-ring-spin-r 10s linear infinite",
          }}
        />
      </div>

      {/* Floating concept labels */}
      {NOVA_CONCEPTS.map((c) => {
        const { x, y } = polarToXY(c.angle, c.radius);
        return (
          <div
            key={c.label}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: c.angle < 180 ? "#00f0ff" : "#F5F7FF",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              textShadow: "0 0 12px rgba(6,182,212,0.6)",
            }}
          >
            {c.label}
          </div>
        );
      })}
    </div>
  );
}
