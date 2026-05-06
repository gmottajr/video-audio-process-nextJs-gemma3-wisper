"use client";

import { createContext, useContext } from "react";

interface ScrollSceneContextValue {
  scrollProgress: number;     // 0–1 across the entire page
  activeSectionIndex: number; // which section is currently centered
  totalSections: number;
}

export const ScrollSceneContext = createContext<ScrollSceneContextValue>({
  scrollProgress: 0,
  activeSectionIndex: 0,
  totalSections: 1,
});

export function useScrollScene() {
  return useContext(ScrollSceneContext);
}
