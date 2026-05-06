"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSceneContext } from "@/contexts/ScrollSceneContext";
import type { TransitionType } from "@/lib/pageTransition";

gsap.registerPlugin(ScrollTrigger);

interface ScrollSceneProps {
  sections: React.ReactNode[];
  nav?: React.ReactNode;
  /** Transition style for every section on this page — chosen once per page visit. */
  transitionType: TransitionType;
}

// ── TRANSFORM ENGINE ──────────────────────────────────────────────────────────
// dist = (scrollY / viewportH) - sectionIndex
//   dist =  0  → section is centered and active
//   dist =  1  → section is one step below (not yet entered)
//   dist = -1  → section is one step above (exited)

function applyTransform(
  el: HTMLDivElement,
  inner: HTMLDivElement | null,
  dist: number,
  type: TransitionType,
  // Orbital direction alternates per section so adjacent panels sweep from
  // opposite sides, creating a weaving rhythm within the same style.
  dir: 1 | -1,
) {
  if (Math.abs(dist) > 1.3) {
    el.style.visibility = "hidden";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    return;
  }

  el.style.visibility = "visible";
  const t    = Math.max(-1, Math.min(1, dist));
  const absv = 1 - Math.abs(t); // 1 at center, 0 at edges

  // Keep interaction alive until the section is more than halfway out of view.
  // 0.85 was too tight — it cut the YouTube iframe at just 15% scroll progress.
  el.style.pointerEvents = Math.abs(t) < 0.5 ? "auto" : "none";

  if (type === "dive") {
    // Emerges from deep Z (tiny, far), exits toward viewer (large, near)
    const tz = t >= 0 ? -600 * t : 420 * (-t);
    const sc = t >= 0 ? 1 - 0.4 * t : 1 + 0.28 * (-t);
    el.style.transform = `translateZ(${tz}px) scale(${sc})`;
    el.style.opacity = String(Math.max(0, Math.min(1, absv * absv * 1.3)));
    if (inner) inner.style.transform = "";

  } else if (type === "orbital") {
    // Sweeps in from left or right with a 3D Y-rotation
    const ry = dir * 42 * t;
    const tx = dir * 48 * t;
    el.style.transform = `perspective(900px) rotateY(${ry}deg) translateX(${tx}%)`;
    el.style.opacity = String(Math.max(0, Math.min(1, absv)));
    if (inner) inner.style.transform = "";

  } else {
    // Parallax: section moves at full speed; inner content counter-moves at ~40%,
    // creating a depth-of-field separation between the background and the text.
    el.style.transform = `translateY(${78 * t}vh)`;
    el.style.opacity = String(Math.max(0, Math.min(1, absv)));
    if (inner) inner.style.transform = `translateY(${-28 * t}vh)`;
  }
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function ScrollScene({ sections, nav, transitionType }: ScrollSceneProps) {
  const n = sections.length;

  // Orbital direction alternates per section (left/right weave) for visual
  // interest even though all sections share the same transition type.
  const dirRef = useRef<(1 | -1)[]>([]);
  if (dirRef.current.length !== n) {
    dirRef.current = sections.map((_, i) => (i % 2 === 0 ? 1 : -1) as 1 | -1);
  }

  const sectionEls    = useRef<(HTMLDivElement | null)[]>(new Array(n).fill(null));
  const innerEls      = useRef<(HTMLDivElement | null)[]>(new Array(n).fill(null));
  const activeIdxRef  = useRef(0);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeIndex, setActiveIndex]       = useState(0);

  useEffect(() => {
    // Set initial transforms before the first scroll event fires
    for (let i = 0; i < n; i++) {
      const el = sectionEls.current[i];
      if (!el) continue;
      applyTransform(el, innerEls.current[i], i === 0 ? 0 : i, transitionType, dirRef.current[i]);
    }

    let ticking = false;

    const update = () => {
      const scrollY  = window.scrollY;
      const sectionH = window.innerHeight;
      const current  = scrollY / sectionH; // fractional section index

      for (let i = 0; i < n; i++) {
        const el = sectionEls.current[i];
        if (!el) continue;
        applyTransform(el, innerEls.current[i], current - i, transitionType, dirRef.current[i]);
      }

      const newProgress = n > 1 ? Math.min(1, Math.max(0, current / (n - 1))) : 0;
      const newActive   = Math.min(n - 1, Math.max(0, Math.round(current)));

      setScrollProgress(newProgress);

      if (newActive !== activeIdxRef.current) {
        activeIdxRef.current = newActive;
        setActiveIndex(newActive);

        // GSAP stagger: animate [data-scroll-item] children in the arriving section
        const arriving = sectionEls.current[newActive];
        if (arriving) {
          const items = arriving.querySelectorAll<HTMLElement>("[data-scroll-item]");
          if (items.length > 0) {
            gsap.fromTo(
              items,
              { y: 22, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out", overwrite: true },
            );
          }
        }
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update,   { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [n, transitionType]);

  const scrollToSection = (i: number) =>
    window.scrollTo({ top: i * window.innerHeight, behavior: "smooth" });

  return (
    <ScrollSceneContext.Provider value={{ scrollProgress, activeSectionIndex: activeIndex, totalSections: n }}>
      {/* Scroll driver — provides scrollable height without visible content */}
      <div style={{ height: `${n * 100}vh` }} aria-hidden className="pointer-events-none" />

      {/* Fixed scene — the viewport that never moves */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 10, perspective: "1100px" }}>

        {/* Nav always visible at the top */}
        {nav && (
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-auto">
            {nav}
          </div>
        )}

        {/* 3D section stack */}
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {sections.map((section, i) => (
            <div
              key={i}
              ref={el => { sectionEls.current[i] = el; }}
              className="absolute inset-0"
              style={{ willChange: "transform, opacity" }}
            >
              <div
                ref={el => { innerEls.current[i] = el; }}
                className="w-full h-full"
                style={{ willChange: "transform" }}
              >
                {section}
              </div>
            </div>
          ))}
        </div>

        {/* Dot navigation — shows which section is active, click to jump */}
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2.5"
          aria-label="Section navigation"
        >
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToSection(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width:      i === activeIndex ? "10px" : "6px",
                height:     i === activeIndex ? "10px" : "6px",
                background: i === activeIndex
                  ? "oklch(60% 0.20 290)"
                  : "oklch(60% 0.20 290 / 0.35)",
                boxShadow: i === activeIndex
                  ? "0 0 8px oklch(60% 0.20 290 / 0.6)"
                  : "none",
              }}
              aria-label={`Section ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </ScrollSceneContext.Provider>
  );
}
