"use client";

import { Zap } from "lucide-react";
import type { VideoMode } from "@/components/VideoModeTabs";

interface ActionHeaderProps {
  fileType: "audio" | "video" | "unknown";
  videoMode: VideoMode;
}

export function ActionHeader({ fileType, videoMode }: ActionHeaderProps) {
  const title =
    fileType === "video"
      ? videoMode === "extract"
        ? "Extract Audio"
        : videoMode === "transcribe"
          ? "AI Transcription"
          : "Convert Video"
      : "Convert Audio";

  const description =
    fileType === "video"
      ? videoMode === "extract"
        ? "Extract the audio track from your video file"
        : videoMode === "transcribe"
          ? "Generate text transcript using Whisper AI"
          : "Convert your video to a different container format"
      : "Convert your audio to a different format";

  return (
    <div className="mb-5">
      <h3 className="font-jazz text-base text-aura-text mb-1 flex items-center gap-2">
        <Zap className="w-4 h-4" style={{ color: "oklch(74% 0.16 290)" }} />
        {title}
      </h3>
      <p className="text-xs text-aura-muted pl-6">{description}</p>
    </div>
  );
}
