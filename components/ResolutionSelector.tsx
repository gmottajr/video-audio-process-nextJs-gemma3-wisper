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
    <div className="space-y-4 mb-6">
      <label className="block text-sm font-medium text-zinc-300">
        Output Resolution
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {resolutions.map((resolution) => (
          <button
            key={resolution.id}
            onClick={() => onSelect(resolution.id)}
            disabled={disabled}
            className={cn(
              "px-3 py-2 rounded-lg border-2 text-center transition-all duration-200",
              selectedId === resolution.id
                ? "border-cyan-500 bg-cyan-950/30 shadow-lg shadow-cyan-500/20"
                : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="font-bold text-zinc-100 text-sm">{resolution.name}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {resolution.id === "original"
                ? "No scaling"
                : `${resolution.width}x${resolution.height}`}
            </div>
          </button>
        ))}
      </div>
      {showWarning && selectedId !== "original" && (
        <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg">
          <p className="text-xs text-amber-300">
            ⚠️ Scaling will require re-encoding (remux disabled)
          </p>
        </div>
      )}
    </div>
  );
}

