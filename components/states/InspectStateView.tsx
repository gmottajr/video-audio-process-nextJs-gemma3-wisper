"use client";

import { Loader2 } from "lucide-react";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { ActionSelector, type ActionType, type ActionOptions } from "@/components/ActionSelector";
import ModelSelector, { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { PageHeader } from "@/components/PageHeader";
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
    <div className="animate-in fade-in duration-500">
      <PageHeader showLogo={true} />

      {/* FFmpeg Loading Banner */}
      {!isFFmpegLoaded && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{
            background: "oklch(22% 0.025 280)",
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

      {/* Transcription Mode Selector */}
      {fastModeEnabled && (
        <div className="mb-4">
          <TranscriptionModeSelector
            selectedMode={transcriptionMode}
            onModeChange={onModeChange}
            disabled={isTranscribing}
          />
        </div>
      )}

      {/* System Capabilities (Fast Mode only) */}
      {fastModeEnabled && transcriptionMode === 'fast' && (
        <div className="mb-4">
          <SystemCapabilitiesCard onWorkerConfigChange={onWorkerConfigChange} />
        </div>
      )}

      {/* Model Selector */}
      <div
        className="mb-4 p-5 rounded-xl"
        style={{
          background: "oklch(22% 0.025 280)",
          border: "1px solid oklch(38% 0.02 280 / 0.35)",
          backdropFilter: "blur(8px)",
        }}
      >
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

      {/* File Info */}
      <div className="mb-4">
        <p className="text-xs text-aura-muted font-mono tracking-wide uppercase mb-2 pl-1">File Information</p>
        <MetadataDisplay metrics={metrics} file={file} variant="compact" />
      </div>

      {/* Media Preview */}
      <div className="mb-4">
        <p className="text-xs text-aura-muted font-mono tracking-wide uppercase mb-2 pl-1">Preview</p>
        <MediaPreview file={file} />
      </div>

      {/* Action Selector */}
      <div className="mb-6">
        <p className="text-xs text-aura-muted font-mono tracking-wide uppercase mb-2 pl-1">Choose Action</p>
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

      {/* Back */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl text-sm transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: "oklch(22% 0.025 280)",
            border: "1px solid oklch(38% 0.02 280 / 0.35)",
            color: "var(--text-muted)",
          }}
        >
          ← Choose Different File
        </button>
      </div>
    </div>
  );
}
