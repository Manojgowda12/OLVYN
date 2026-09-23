"use client";

import dynamic from "next/dynamic";

// KnowledgeGlobe — canvas + mouse interaction, no SSR
export const KnowledgeGlobeClient = dynamic(
  () => import("./knowledge-globe").then((m) => ({ default: m.KnowledgeGlobe })),
  { ssr: false, loading: () => <div style={{ width: 480, height: 480 }} /> }
);

// NovaOrbital — CSS SVG animation, no SSR needed for motion
export const NovaOrbitalClient = dynamic(
  () => import("./nova-orbital").then((m) => ({ default: m.NovaOrbital })),
  { ssr: false, loading: () => <div style={{ width: 360, height: 360 }} /> }
);

// WireframeGlobe — SVG, can be SSR'd but keep consistent
export const WireframeGlobeClient = dynamic(
  () => import("./wireframe-globe").then((m) => ({ default: m.WireframeGlobe })),
  { ssr: false, loading: () => <div style={{ width: 420, height: 420 }} /> }
);
