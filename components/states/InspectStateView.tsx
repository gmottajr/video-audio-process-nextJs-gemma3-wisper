"use client";

import { Loader2, FileVideo, ChevronLeft } from "lucide-react";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { ActionSelector, type ActionType, type ActionOptions } from "@/components/ActionSelector";
import ModelSelector, { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { ForgeStepper } from "@/components/ForgeStepper";
import { TranscriptionModeSelector } from "@/components/fast-mode";
import { SystemCapabilitiesCard } from "@/components/fast-mode/SystemCapabilitiesCard";
import type { TranscriptionMode } from "@/types/fast-mode";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { MediaPreview } from "@/components/MediaPreview";

interface InspectStateViewProps {
  file: File;
  metrics: any;
  selectedModelKey: ModelKey;
  currentModel: string | null;
  isModelLoading: boolean;
  isTranscribing: boolean;
  onModelSelect: (modelKey: ModelKey) => void;
  transcriptionMode: TranscriptionMode;
  onModeChange: (mode: TranscriptionMode) => void;
  onWorkerConfigChange?: (config: { workers: number; useGPU: boolean; memoryBudgetMB: number; devicePreference: import('@/types/fast-mode').DevicePreference }) => void;
  onAction: (action: ActionType, formatId: string, options?: ActionOptions) => void;
  onBack: () => void;
  isFFmpegLoaded: boolean;
  isFFmpegLoading?: boolean;
  isModelLoaded: boolean;
  modelLoadingProgress: number;
}

const SECTION_LABEL = "font-mono text-[11px] tracking-[0.18em] uppercase mb-2.5";

/**
 * InspectStateView — REDESIGNED (v2.1)
 *
 * Drop-in replacement. Same prop signature.
 *
 * Changes:
 *   • Two-column layout:
 *       LEFT  = decisions  (Mode → Model)
 *       RIGHT = context    (File info · Preview · Hardware)
 *   • Action selector spans full width below as the primary CTA zone.
 *   • Persistent file-summary strip at top so users don't lose context.
 *   • Anchored by ForgeStepper.
 *   • PageHeader brand mark removed — the stepper does that job now.
 */
export function InspectStateView({
  file,
  metrics,
  selectedModelKey,
  currentModel,
  isModelLoading,
  isTranscribing,
  onModelSelect,
  transcriptionMode,
  onModeChange,
  onWorkerConfigChange,
  onAction,
  onBack,
  isFFmpegLoaded,
  isFFmpegLoading = false,
  isModelLoaded,
  modelLoadingProgress,
}: InspectStateViewProps) {
  const fastModeEnabled = isFeatureEnabled('ENABLE_FAST_MODE');

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto px-4">
      <div className="mb-6">
        <ForgeStepper currentState="INSPECT" />
      </div>

      {/* file summary strip */}
      <div
        className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl"
        style={{
          background: "oklch(22% 0.025 280 / 0.6)",
          border: "1px solid oklch(38% 0.02 280 / 0.35)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg grid place-items-center"
          style={{
            background: "oklch(60% 0.20 290 / 0.12)",
            border: "1px solid oklch(60% 0.20 290 / 0.25)",
            color: "oklch(74% 0.16 290)",
          }}
        >
          <FileVideo className="w-4 h-4" />
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

      {!isFFmpegLoaded && (
        <div
          className="mb-5 p-4 rounded-xl flex items-center gap-3"
          style={{
            background: "oklch(22% 0.025 280 / 0.7)",
            border: "1px solid oklch(60% 0.28 290 / 0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "oklch(74% 0.16 290)" }} />
          <div>
            <p className="text-sm font-medium text-aura-text">
              {isFFmpegLoading ? "Initializing processing engine…" : "Processing engine not loaded"}
            </p>
            <p className="text-xs text-aura-muted">
              {isFFmpegLoading ? "FFmpeg WebAssembly is loading" : "Click any action to reload"}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        {/* LEFT — decisions */}
        <div className="flex flex-col gap-5">
          {fastModeEnabled && (
            <div>
              <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
                Transcription Mode
              </div>
              <TranscriptionModeSelector
                selectedMode={transcriptionMode}
                onModeChange={onModeChange}
                disabled={isTranscribing}
              />
            </div>
          )}

          <div
            className="p-5 rounded-xl"
            style={{
              background: "oklch(22% 0.025 280 / 0.55)",
              border: "1px solid oklch(38% 0.02 280 / 0.35)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
              AI Model
            </div>
            <ModelSelector
              selectedModel={selectedModelKey}
              currentlyLoadedModel={currentModel}
              isLoading={isModelLoading}
              onModelSelect={onModelSelect}
              disabled={isTranscribing}
              file={file}
              fastModeEnabled={transcriptionMode === 'fast'}
            />
          </div>
        </div>

        {/* RIGHT — context */}
        <div className="flex flex-col gap-5">
          <div>
            <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
              File Information
            </div>
            <MetadataDisplay metrics={metrics} file={file} variant="compact" />
          </div>

          <div>
            <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
              Preview
            </div>
            <MediaPreview file={file} />
          </div>

          {fastModeEnabled && transcriptionMode === 'fast' && (
            <div>
              <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
                System Capabilities
              </div>
              <SystemCapabilitiesCard onWorkerConfigChange={onWorkerConfigChange} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
          Step 02 · Choose Action
        </div>
        <ActionSelector
          file={file}
          onAction={onAction}
          disabled={!isFFmpegLoaded}
          isModelLoading={isModelLoading}
          isModelLoaded={isModelLoaded}
          modelLoadingProgress={modelLoadingProgress}
          selectedModelKey={transcriptionMode === 'fast' ? 'distil-small' : selectedModelKey}
          transcriptionMode={transcriptionMode}
        />
      </div>
    </div>
  );
}
