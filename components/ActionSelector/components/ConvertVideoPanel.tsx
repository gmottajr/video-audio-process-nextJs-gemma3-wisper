"use client";

import { SUPPORTED_VIDEO_FORMATS, RESOLUTION_OPTIONS, canRemux, getVideoFormatById } from "@/utils/videoFormats";
import { FormatSelector } from "@/components/FormatSelector";
import { ResolutionSelector } from "@/components/ResolutionSelector";
import { FormatDetailsCard } from "@/components/FormatDetailsCard";
import type { ActionPanelProps } from "../types";

export function ConvertVideoPanel({ file, state, onStateChange, disabled }: ActionPanelProps) {
  const selectedVideoConfig = getVideoFormatById(state.selectedVideoFormat);
  const willRemux =
    state.selectedResolution === "original" &&
    canRemux(file, state.selectedVideoFormat);

  const getFormatBadge = (format: { id: string; badge?: string; videoCodec?: string }) => {
    const isRemux = "videoCodec" in format && canRemux(file, format.id) && state.selectedResolution === "original";
    if (isRemux) {
      return (
        <div
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: "oklch(66% 0.17 195 / 0.20)", color: "oklch(74% 0.13 195)", border: "1px solid oklch(66% 0.17 195 / 0.35)" }}
        >
          Instant
        </div>
      );
    }
    if (format.badge) {
      return (
        <div
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: "oklch(60% 0.28 290 / 0.18)", color: "oklch(74% 0.16 290)", border: "1px solid oklch(60% 0.28 290 / 0.35)" }}
        >
          {format.badge}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <FormatSelector
        formats={SUPPORTED_VIDEO_FORMATS}
        selectedId={state.selectedVideoFormat}
        onSelect={(id) => onStateChange({ selectedVideoFormat: id })}
        disabled={disabled}
        type="video"
        getBadge={getFormatBadge}
      />

      <ResolutionSelector
        resolutions={RESOLUTION_OPTIONS}
        selectedId={state.selectedResolution}
        onSelect={(id) => onStateChange({ selectedResolution: id })}
        disabled={disabled}
        showWarning
      />

      {selectedVideoConfig && (
        <FormatDetailsCard
          format={selectedVideoConfig}
          type="video"
          willRemux={willRemux}
        />
      )}
    </>
  );
}
