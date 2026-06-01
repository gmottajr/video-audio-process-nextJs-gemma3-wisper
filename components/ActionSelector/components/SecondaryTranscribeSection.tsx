"use client";

import { TranscribeInfoCard } from "@/components/TranscribeInfoCard";
import { ResourceWarningCard } from "@/components/ResourceWarningCard";
import { ProgressButton } from "@/components/ProgressButton";
import type { ActionPanelState } from "../types";
import type { ModelKey } from "@/components/ModelSelector";

interface SecondaryTranscribeSectionProps {
  file: File;
  fileType: "audio" | "video";
  state: ActionPanelState;
  disabled: boolean;
  isModelLoading?: boolean;
  isModelLoaded?: boolean;
  modelLoadingProgress?: number;
  selectedModelKey?: ModelKey;
  onTranscribe: () => void;
}

export function SecondaryTranscribeSection({
  file,
  fileType,
  state,
  disabled,
  isModelLoading = false,
  isModelLoaded = false,
  modelLoadingProgress = 0,
  selectedModelKey = "base",
  onTranscribe,
}: SecondaryTranscribeSectionProps) {
  const hasEnhancements = state.normalizeAudio || state.compressionType !== "none";
  const hasSelection = !!state.waveformSelection;

  const buttonText = isModelLoading
    ? `Loading AI Model… ${Math.round(modelLoadingProgress)}%`
    : isModelLoaded
      ? hasEnhancements
        ? state.compressionType !== "none" && state.normalizeAudio
          ? hasSelection ? "Transcribe Segment (Enhanced)" : "Transcribe with Enhanced Audio"
          : state.compressionType === "speech"
            ? hasSelection ? "Transcribe Segment (Speech)" : "Transcribe with Speech Compression"
            : state.compressionType === "studio"
              ? hasSelection ? "Transcribe Segment (Studio)" : "Transcribe with Studio Compression"
              : state.compressionType === "both"
                ? hasSelection ? "Transcribe Segment (Full)" : "Transcribe with Full Enhancement"
                : hasSelection ? "Transcribe Segment (Normalized)" : "Transcribe with Normalized Audio"
        : hasSelection ? "Transcribe Selected Segment" : "Transcribe Audio to Text"
      : "Waiting for Model…";

  const hintText = isModelLoading
    ? `Loading model… ${Math.round(modelLoadingProgress)}%`
    : isModelLoaded
      ? hasEnhancements
        ? "Audio will be enhanced before transcription for better accuracy"
        : "First run: ~40 MB model download · Word-level timestamps · Export as TXT / JSON / SRT"
      : "Waiting for AI model to start loading…";

  return (
    <div
      className="mt-6 pt-6"
      style={{ borderTop: "1px solid oklch(38% 0.02 280 / 0.35)" }}
    >
      <TranscribeInfoCard compact />

      {fileType === "audio" && (
        <ResourceWarningCard
          file={file}
          modelKey={selectedModelKey}
          className="mb-4"
          minRAMThreshold={50}
        />
      )}

      <ProgressButton
        onClick={onTranscribe}
        disabled={disabled || !isModelLoaded || isModelLoading}
        isLoading={isModelLoading}
        progress={modelLoadingProgress}
        variant="transcribe"
        icon="brain"
      >
        {buttonText}
      </ProgressButton>

      <p className="mt-2 text-xs text-center text-aura-muted">{hintText}</p>
    </div>
  );
}
