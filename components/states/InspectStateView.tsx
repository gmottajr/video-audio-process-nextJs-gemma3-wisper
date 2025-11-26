"use client";

import { MetadataDisplay } from "@/components/MetadataDisplay";
import { ActionSelector, type ActionType } from "@/components/ActionSelector";
import ModelSelector, { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { PageHeader } from "@/components/PageHeader";

interface InspectStateViewProps {
  file: File;
  metrics: any;
  
  // Model selection
  selectedModelKey: ModelKey;
  currentModel: string | null;
  isModelLoading: boolean;
  isTranscribing: boolean;
  onModelSelect: (modelKey: ModelKey) => void;
  
  // Action handling
  onAction: (action: ActionType, formatId: string, options?: { resolutionId?: string }) => void;
  onBack: () => void;
  
  // Status
  isFFmpegLoaded: boolean;
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
  onAction,
  onBack,
  isFFmpegLoaded,
  isModelLoaded,
  modelLoadingProgress,
}: InspectStateViewProps) {
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

      {/* Model Selector (for AI Transcription) */}
      <div className="mb-6">
        <ModelSelector
          selectedModel={selectedModelKey}
          currentlyLoadedModel={currentModel}
          isLoading={isModelLoading}
          onModelSelect={onModelSelect}
          disabled={isTranscribing}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Metadata */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-zinc-300">
            File Information
          </h3>
          <MetadataDisplay metrics={metrics} file={file} />
        </div>

        {/* Right: Action Selector */}
        <div>
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
          />
        </div>
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



