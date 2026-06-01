"use client";

import { useEffect } from "react";
import type { TranscriptionMode } from "@/types/fast-mode";
import { MODE_STORAGE_KEY } from "../types";

export function useTranscriptionModePersistence(
  selected: TranscriptionMode,
  onSelect: (mode: TranscriptionMode) => void
) {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      if ((stored === "standard" || stored === "fast") && stored !== selected) {
        onSelect(stored);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, selected);
    } catch {
      /* ignore */
    }
  }, [selected]);
}
