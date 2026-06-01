"use client";

import { Loader2 } from "lucide-react";

interface FFmpegBannerProps {
  isFFmpegLoaded: boolean;
  isFFmpegLoading?: boolean;
}

export function FFmpegBanner({ isFFmpegLoaded, isFFmpegLoading = false }: FFmpegBannerProps) {
  if (isFFmpegLoaded) return null;
  return (
    <div
      className="mb-5 p-3 rounded-xl flex items-center gap-3"
      style={{
        background: "oklch(22% 0.025 280 / 0.7)",
        border: "1px solid oklch(60% 0.28 290 / 0.25)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Loader2
        className="w-4 h-4 animate-spin shrink-0"
        style={{ color: "oklch(74% 0.16 290)" }}
      />
      <div>
        <p className="text-sm font-medium text-aura-text">
          {isFFmpegLoading ? "Initializing processing engine…" : "Processing engine not loaded"}
        </p>
        <p className="text-xs text-aura-muted">
          {isFFmpegLoading ? "FFmpeg WebAssembly is loading" : "Click any action to reload"}
        </p>
      </div>
    </div>
  );
}
