"use client";

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  dimmed?: boolean;
}

export function Card({ children, dimmed = false }: CardProps) {
  return (
    <div
      className="p-5 rounded-xl transition-opacity duration-200"
      style={{
        background: "oklch(22% 0.025 280 / 0.55)",
        border: "1px solid oklch(38% 0.02 280 / 0.35)",
        backdropFilter: "blur(8px)",
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      {children}
    </div>
  );
}
