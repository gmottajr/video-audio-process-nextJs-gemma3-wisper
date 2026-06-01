"use client";

import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="font-mono inline-flex items-center justify-center"
      style={{
        padding: "2px 6px",
        borderRadius: 4,
        background: "oklch(100% 0 0 / 0.06)",
        border: "1px solid oklch(100% 0 0 / 0.10)",
        color: "var(--text)",
        fontSize: 10,
        minWidth: 18,
        lineHeight: 1,
      }}
    >
      {children}
    </kbd>
  );
}
