"use client";

import { useEffect, useRef } from "react";

/**
 * ScrollNav — attaches a CSS class to the header when the user scrolls.
 * Uses IntersectionObserver (NOT window.addEventListener("scroll", ...))
 * so there's no scroll jank.
 */
export function ScrollNav() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const header = document.querySelector("header");
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel exits viewport (user scrolled down), make nav more opaque
        if (!entry.isIntersecting) {
          header.classList.add("nav-scrolled");
        } else {
          header.classList.remove("nav-scrolled");
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Sentinel is a 1px element placed right below the navbar in hero
  return (
    <div
      ref={sentinelRef}
      style={{ position: "absolute", top: "80px", left: 0, width: "1px", height: "1px", pointerEvents: "none" }}
      aria-hidden
    />
  );
}
