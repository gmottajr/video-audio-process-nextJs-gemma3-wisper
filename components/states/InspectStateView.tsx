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

interface InspectStateViewProps {
  file: File;
  metrics: any;
  
  // Model selection
  selectedModelKey: ModelKey;
  currentModel: string | null;
  isModelLoading: boolean;
  isTranscribing: boolean;
  onModelSelect: (modelKey: ModelKey) => void;
  
  // Transcription mode (Fast Mode)
  transcriptionMode: TranscriptionMode;
  onModeChange: (mode: TranscriptionMode) => void;
  
  // Worker configuration (Fast Mode)
  onWorkerConfigChange?: (config: { workers: number; useGPU: boolean; memoryBudgetMB: number; devicePreference: import('@/types/fast-mode').DevicePreference }) => void;
  
  // Action handling
  onAction: (action: ActionType, formatId: string, options?: ActionOptions) => void;
  onBack: () => void;
  
  // Status
  isFFmpegLoaded: boolean;
  isFFmpegLoading?: boolean;
  isModelLoaded: boolean;
  modelLoadingProgress: number;
}

/**
 * INSPECT State View
 * Shows file metadata and action selection
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
    <div className="animate-in fade-in duration-500">
      {/* Main Title & Subtitle */}
      <PageHeader 
        subtitle="Configure Processing"
        description="Review your file details and choose your desired output format and options."
        icon="⚙️"
      />

      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-600 rounded-full mb-4">
          <span className="text-3xl font-bold text-white">2</span>
        </div>
        <h3 className="text-xl font-bold mb-2">Review & Configure</h3>
        <p className="text-zinc-400">
          Check your file details and choose the output format
        </p>
      </div>

      {/* FFmpeg Loading Banner */}
      {!isFFmpegLoaded && (
        <div className="mb-6 p-4 bg-blue-950/50 border border-blue-500/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-300">
                {isFFmpegLoading ? "Loading processing engine..." : "Processing engine not loaded"}
              </p>
              <p className="text-xs text-blue-400/70">
                {isFFmpegLoading 
                  ? "Please wait while FFmpeg WebAssembly initializes" 
                  : "Click any action to reload the processing engine"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transcription Mode Selector (Fast Mode) */}
      {fastModeEnabled && (
        <div className="mb-4">
          <TranscriptionModeSelector
            selectedMode={transcriptionMode}
            onModeChange={onModeChange}
            disabled={isTranscribing}
          />
        </div>
      )}

      {/* System Capabilities Card (Fast Mode only) */}
      {fastModeEnabled && transcriptionMode === 'fast' && (
        <div className="mb-4">
          <SystemCapabilitiesCard
            onWorkerConfigChange={onWorkerConfigChange}
          />
        </div>
      )}

      {/* Model Selector (for AI Transcription) */}
      <div className="mb-4">
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

      {/* File Information - Compact Single Row */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2 text-zinc-400">
          File Information
        </h3>
        <MetadataDisplay metrics={metrics} file={file} variant="compact" />
      </div>

      {/* Action Selector - Full Width */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-zinc-300">
          Choose Action
        </h3>
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

      {/* Back button */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold transition-all duration-200"
        >
          ← Choose Different File
        </button>
      </div>
    </div>
  );
}



