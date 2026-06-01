"use client";

import { useEffect } from "react";

interface UseFloatingBarShortcutsOptions {
  isTranscribing: boolean;
  onBack: () => void;
  triggerAction: () => void;
}

export function useFloatingBarShortcuts({
  isTranscribing,
  onBack,
  triggerAction,
}: UseFloatingBarShortcutsOptions) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTranscribing) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowLeft" || e.key === "1") {
        e.preventDefault();
        onBack();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        triggerAction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // triggerAction reads actionRef at call time — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranscribing, onBack]);
}
