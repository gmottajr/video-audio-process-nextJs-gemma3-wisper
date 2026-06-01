"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { pickPageTransition } from "@/lib/pageTransition";
import type { AppState } from "@/hooks/useAppStateMachine";

const STATE_ORDER: AppState[] = ["IDLE", "INSPECT", "PROCESSING", "DONE"];

export function useForgeStateAnimations(state: AppState) {
  const contentRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef<string | null>(null);
  const [transitionType] = useState(() => pickPageTransition());

  // Entrance animation on mount
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const from: gsap.TweenVars =
      transitionType === "dive"    ? { z: -280, scale: 0.86, opacity: 0 } :
      transitionType === "orbital" ? { rotationY: -28, x: -80, opacity: 0 } :
                                     { y: 80, opacity: 0 };
    gsap.fromTo(el, from, {
      z: 0, scale: 1, rotationY: 0, x: 0, y: 0, opacity: 1,
      duration: 1.05, ease: "power3.out", force3D: true,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // State-transition animation
  useEffect(() => {
    const el = contentRef.current;
    if (!el || prevStateRef.current === state) return;
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (prev === null) return;

    const forward =
      STATE_ORDER.indexOf(state) > STATE_ORDER.indexOf((prev ?? "") as AppState);

    const from: gsap.TweenVars =
      transitionType === "dive"
        ? { z: -160, scale: 0.91, opacity: 0 }
        : transitionType === "orbital"
        ? { rotationY: forward ? -20 : 20, x: forward ? -60 : 60, opacity: 0 }
        : { y: 60, opacity: 0 };

    gsap.fromTo(el, from, {
      z: 0, scale: 1, rotationY: 0, x: 0, y: 0, opacity: 1,
      duration: 0.55, ease: "power2.out", force3D: true,
    });
  }, [state, transitionType]);

  return { contentRef };
}
