"use client";

export function WireframeGlobe() {
  return (
    <div
      style={{
        position: "relative",
        width: 420,
        height: 420,
        flexShrink: 0,
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: "-15%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(37,99,235,0.14) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* SVG wireframe globe */}
      <svg
        viewBox="0 0 420 420"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <defs>
          <radialGradient id="globe-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(37,99,235,0.3)" />
            <stop offset="60%"  stopColor="rgba(37,99,235,0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <clipPath id="globe-clip">
            <circle cx="210" cy="210" r="190" />
          </clipPath>
        </defs>

        {/* Base glow sphere */}
        <circle cx="210" cy="210" r="190" fill="url(#globe-fade)" />
        <circle cx="210" cy="210" r="190" fill="none" stroke="rgba(59,130,246,0.35)" strokeWidth="1.2" />

        {/* Latitude lines */}
        <g clipPath="url(#globe-clip)" opacity="0.65">
          {[35, 70, 105, 140, 175, 210, 245, 280, 315, 350, 385].map((cy, i) => {
            const dy = cy - 210;
            const rx = Math.sqrt(Math.max(0, 190 * 190 - dy * dy));
            return rx > 5 ? (
              <ellipse
                key={i}
                cx="210" cy={cy}
                rx={rx} ry={Math.max(4, rx * 0.08)}
                fill="none"
                stroke="rgba(147,197,253,0.35)"
                strokeWidth="0.8"
              />
            ) : null;
          })}

          {/* Longitude lines */}
          {[0, 30, 60, 90, 120, 150].map((angle, i) => (
            <ellipse
              key={`lon-${i}`}
              cx="210" cy="210"
              rx="8" ry="190"
              fill="none"
              stroke="rgba(147,197,253,0.3)"
              strokeWidth="0.8"
              transform={`rotate(${angle} 210 210)`}
            />
          ))}
        </g>

        {/* Connection arc nodes (knowledge network) */}
        {[
          { cx: 160, cy: 140 }, { cx: 260, cy: 130 }, { cx: 300, cy: 200 },
          { cx: 270, cy: 280 }, { cx: 180, cy: 295 }, { cx: 130, cy: 220 },
          { cx: 210, cy: 155 }, { cx: 335, cy: 165 }, { cx: 100, cy: 170 },
          { cx: 240, cy: 340 },
        ].map((node, i) => (
          <g key={i}>
            <circle cx={node.cx} cy={node.cy} r="3.5" fill="#00f0ff" />
            <circle cx={node.cx} cy={node.cy} r="8" fill="none" stroke="#00f0ff" strokeWidth="0.8" opacity="0.45" />
          </g>
        ))}

        {/* Arc connections between nodes */}
        {[
          "M 160 140 Q 210 100 260 130",
          "M 260 130 Q 310 155 300 200",
          "M 300 200 Q 295 245 270 280",
          "M 160 140 Q 145 185 130 220",
          "M 130 220 Q 150 260 180 295",
          "M 180 295 Q 225 315 270 280",
          "M 335 165 Q 320 180 300 200",
          "M 210 155 Q 235 145 260 130",
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="rgba(6,182,212,0.45)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        ))}
      </svg>
    </div>
  );
}
