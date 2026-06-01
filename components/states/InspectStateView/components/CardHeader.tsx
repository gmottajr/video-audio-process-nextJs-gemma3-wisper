"use client";

import type { ReactNode } from "react";
import { SECTION_LABEL } from "../types";

interface CardHeaderProps {
  title: string;
  trailing?: ReactNode;
  hint?: string;
}

export function CardHeader({ title, trailing, hint }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
        {title}
      </div>
      <div className="flex items-center gap-2">
        {hint && (
          <span className="text-[11px]" style={{ color: "oklch(55% 0.02 280)" }}>
            {hint}
          </span>
        )}
        {trailing}
      </div>
    </div>
  );
}
