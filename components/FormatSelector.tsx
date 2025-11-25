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
    <div className="space-y-4 mb-6">
      <label className="block text-sm font-medium text-zinc-300">
        {type === "audio" ? "Audio Format" : "Video Format"}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {formats.map((format) => {
          const isVideo = "videoCodec" in format;
          const badge = getBadge?.(format);

          return (
            <button
              key={format.id}
              onClick={() => onSelect(format.id)}
              disabled={disabled}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all duration-200 relative",
                selectedId === format.id
                  ? "border-blue-500 bg-blue-950/30 shadow-lg shadow-blue-500/20"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Badge */}
              {badge && (
                <div className="absolute -top-2 -right-2">
                  {badge}
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-zinc-100">{format.name}</div>
                  <div className="text-xs text-zinc-500">{format.extension}</div>
                </div>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedId === format.id
                      ? "border-blue-500 bg-blue-500"
                      : "border-zinc-600"
                  )}
                >
                  {selectedId === format.id && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>

              <div className="text-xs text-zinc-400 mb-1">{format.description}</div>

              {isVideo ? (
                <div className="text-xs text-cyan-400 font-medium">
                  {(format as VideoFormatConfig).videoCodec} + {(format as VideoFormatConfig).audioCodec}
                </div>
              ) : (
                <div className="text-xs text-cyan-400 font-medium">
                  {(format as AudioFormatConfig).quality}
                </div>
              )}

              {isVideo && (format as VideoFormatConfig).estimatedSpeed && (
                <div className="mt-1 text-xs text-zinc-500">
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

