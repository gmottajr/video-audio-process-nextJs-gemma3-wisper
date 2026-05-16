"use client";

import { cn } from "@/utils/cn";
import type { AudioFormatConfig } from "@/utils/audioFormats";
import type { VideoFormatConfig } from "@/utils/videoFormats";

interface FormatSelectorProps {
  formats: (AudioFormatConfig | VideoFormatConfig)[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  type: "audio" | "video";
  getBadge?: (format: AudioFormatConfig | VideoFormatConfig) => React.ReactNode;
}

export function FormatSelector({
  formats,
  selectedId,
  onSelect,
  disabled,
  type,
  getBadge,
}: FormatSelectorProps) {
  return (
    <div className="space-y-3 mb-5">
      <p className="text-xs text-aura-muted font-mono tracking-wide uppercase">
        {type === "audio" ? "Audio Format" : "Video Format"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {formats.map((format) => {
          const isVideo = "videoCodec" in format;
          const isSelected = selectedId === format.id;
          const badge = getBadge?.(format);

          return (
            <button
              key={format.id}
              onClick={() => onSelect(format.id)}
              disabled={disabled}
              className={cn("p-4 rounded-xl text-left transition-all duration-200 relative", disabled && "cursor-not-allowed")}
              style={
                isSelected
                  ? {
                      background: "oklch(25% 0.04 290)",
                      border: "1px solid oklch(60% 0.28 290 / 0.55)",
                      boxShadow: "0 0 16px oklch(60% 0.28 290 / 0.12)",
                    }
                  : {
                      background: "oklch(21% 0.025 280)",
                      border: "1px solid oklch(45% 0.02 280)",
                    }
              }
            >
              {badge && (
                <div className="absolute -top-2 -right-2">{badge}</div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-jazz text-sm text-aura-text">{format.name}</div>
                  <div className="text-xs text-aura-muted font-mono">{format.extension}</div>
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                  style={
                    isSelected
                      ? { borderColor: "oklch(60% 0.28 290)", background: "oklch(60% 0.28 290)" }
                      : { borderColor: "oklch(48% 0.02 280)", background: "transparent" }
                  }
                >
                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>

              <div className="text-xs text-aura-muted mb-1 leading-relaxed">{format.description}</div>

              <div className="text-xs font-mono" style={{ color: "oklch(66% 0.17 195)" }}>
                {isVideo
                  ? `${(format as VideoFormatConfig).videoCodec} + ${(format as VideoFormatConfig).audioCodec}`
                  : (format as AudioFormatConfig).quality}
              </div>

              {isVideo && (format as VideoFormatConfig).estimatedSpeed && (
                <div className="mt-1 text-xs text-aura-muted opacity-60">
                  Speed: {(format as VideoFormatConfig).estimatedSpeed}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
