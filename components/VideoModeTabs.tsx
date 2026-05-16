"use client";

import { useState } from "react";
import { Scissors, RefreshCw, Brain } from "lucide-react";

export type VideoMode = "extract" | "convert" | "transcribe";

interface VideoModeTabsProps {
  selectedMode: VideoMode;
  onModeChange: (mode: VideoMode) => void;
}

const TABS: { mode: VideoMode; label: string; Icon: React.ElementType }[] = [
  { mode: "extract",    label: "Extract Audio",    Icon: Scissors  },
  { mode: "convert",   label: "Convert Container", Icon: RefreshCw },
  { mode: "transcribe", label: "AI Transcription", Icon: Brain     },
];

export function VideoModeTabs({ selectedMode, onModeChange }: VideoModeTabsProps) {
  const [hovered, setHovered] = useState<VideoMode | null>(null);

  return (
    <div className="mb-5">
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-xl"
        style={{ background: "oklch(18% 0.02 280)", border: "1px solid oklch(38% 0.02 280 / 0.40)" }}
      >
        {TABS.map(({ mode, label, Icon }) => {
          const isActive  = selectedMode === mode;
          const isHovered = hovered === mode && !isActive;

          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              onMouseEnter={() => setHovered(mode)}
              onMouseLeave={() => setHovered(null)}
              className="px-3 py-2.5 rounded-lg font-jazz text-sm transition-all duration-200 flex items-center justify-center gap-2"
              style={
                isActive
                  ? {
                      background: "oklch(28% 0.04 290 / 0.70)",
                      border: "1px solid oklch(60% 0.28 290 / 0.45)",
                      color: "oklch(84% 0.16 290)",
                      boxShadow: "0 0 16px oklch(60% 0.28 290 / 0.20)",
                    }
                  : isHovered
                  ? {
                      background: "oklch(26% 0.02 280)",
                      border: "1px solid oklch(44% 0.02 280 / 0.50)",
                      color: "oklch(74% 0.02 280)",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "var(--text-muted)",
                    }
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
