"use client";

import { cn } from "@/utils/cn";
import type { ResolutionConfig } from "@/utils/videoFormats";

interface ResolutionSelectorProps {
  resolutions: ResolutionConfig[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  showWarning?: boolean;
}

export function ResolutionSelector({
  resolutions,
  selectedId,
  onSelect,
  disabled,
  showWarning = false,
}: ResolutionSelectorProps) {
  return (
    <div className="space-y-3 mb-5">
      <p className="text-xs text-aura-muted font-mono tracking-wide uppercase">Output Resolution</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {resolutions.map((resolution) => {
          const isSelected = selectedId === resolution.id;
          return (
            <button
              key={resolution.id}
              onClick={() => onSelect(resolution.id)}
              disabled={disabled}
              className={cn("px-3 py-2 rounded-lg text-center transition-all duration-200", disabled && "cursor-not-allowed")}
              style={
                isSelected
                  ? {
                      background: "oklch(25% 0.04 290)",
                      border: "1px solid oklch(60% 0.28 290 / 0.50)",
                    }
                  : {
                      background: "oklch(21% 0.025 280)",
                      border: "1px solid oklch(38% 0.02 280 / 0.40)",
                    }
              }
            >
              <div className="font-jazz text-sm text-aura-text">{resolution.name}</div>
              <div className="text-xs text-aura-muted mt-0.5">
                {resolution.id === "original" ? "No scaling" : `${resolution.width}×${resolution.height}`}
              </div>
            </button>
          );
        })}
      </div>
      {showWarning && selectedId !== "original" && (
        <div
          className="p-3 rounded-lg"
          style={{ background: "oklch(72% 0.16 55 / 0.08)", border: "1px solid oklch(72% 0.16 55 / 0.25)" }}
        >
          <p className="text-xs" style={{ color: "oklch(78% 0.13 55)" }}>
            Scaling will require re-encoding — remux disabled
          </p>
        </div>
      )}
    </div>
  );
}
