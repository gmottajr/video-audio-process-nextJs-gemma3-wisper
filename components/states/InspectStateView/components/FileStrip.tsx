"use client";

import { ChevronLeft } from "lucide-react";
import type { FileKindStrategy } from "../strategies/fileKind/types";

interface FileStripProps {
  file: File;
  kindStrategy: FileKindStrategy;
  onBack: () => void;
}

export function FileStrip({ file, kindStrategy, onBack }: FileStripProps) {
  const Icon = kindStrategy.icon;
  return (
    <div
      className="flex items-center gap-3 mb-5 px-4 py-2.5 rounded-xl"
      style={{
        background: "oklch(22% 0.025 280 / 0.6)",
        border: "1px solid oklch(38% 0.02 280 / 0.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="flex-shrink-0 w-9 h-9 rounded-lg grid place-items-center"
        style={{
          background: "oklch(60% 0.20 290 / 0.12)",
          border: "1px solid oklch(60% 0.20 290 / 0.25)",
          color: "oklch(74% 0.16 290)",
        }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
          {file.name}
        </div>
        <div
          className="font-mono text-[10px] tracking-[0.08em] uppercase mt-0.5"
          style={{ color: "oklch(50% 0.02 280)" }}
        >
          {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type || "unknown type"}
        </div>
      </div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:scale-[1.02]"
        style={{
          background: "transparent",
          border: "1px solid oklch(38% 0.02 280 / 0.4)",
          color: "var(--text-muted)",
        }}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Change file
      </button>
    </div>
  );
}
