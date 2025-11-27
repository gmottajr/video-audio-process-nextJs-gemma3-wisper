"use client";

import React from "react";
import ModelSelector, { type ModelKey } from "@/components/ModelSelector";
import { ResourceWarningCard } from "@/components/ResourceWarningCard";
import { TranscriptionFormHeader } from "@/components/transcription/TranscriptionFormHeader";
import { EnhancementOptionsSelector } from "@/components/transcription/EnhancementOptionsSelector";
import { SmartRecommendations } from "@/components/transcription/SmartRecommendations";
import { AlreadyAppliedBadges } from "@/components/transcription/AlreadyAppliedBadges";
import { TranscribeButton } from "@/components/transcription/TranscribeButton";
import { useTranscriptionOptions } from "@/hooks/useTranscriptionOptions";
import type { CompressionType } from "@/components/ActionSelector";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

interface TranscribeFromDoneFormProps {
  result: ProcessingResult;
  file: File;
  selectedModelKey: ModelKey;
  currentModel: string | null;
  isModelLoaded?: boolean;
  isModelLoading?: boolean;
  modelLoadingProgress?: number;
  onModelSelect?: (modelKey: ModelKey) => void;
  onTranscribe: (compressionType: CompressionType, normalizeAudio: boolean, modelKey: ModelKey) => void;
}

/**
 * TranscribeFromDoneForm Component (Refactored)
 * 
 * Orchestrates the transcription form UI using smaller, focused sub-components.
 * Each sub-component has a single responsibility following SRP.
 * 
 * Responsibilities:
 * - Layout orchestration
 * - Data flow between sub-components
 * - Handling form submission
 */
export function TranscribeFromDoneForm({
  result,
  file,
  selectedModelKey,
  currentModel,
  isModelLoaded = false,
  isModelLoading = false,
  modelLoadingProgress = 0,
  onModelSelect,
  onTranscribe,
}: TranscribeFromDoneFormProps) {
  // Use custom hook to manage all form state
  const options = useTranscriptionOptions({
    result,
    selectedModelKey,
    onModelSelect,
  });

  // Handle form submission
  const handleTranscribe = () => {
    if (isModelLoaded || isModelLoading) {
      onTranscribe(
        options.compressionType,
        options.normalizeAudio,
        options.localModelKey
      );
    }
  };

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-purple-950/30 via-indigo-950/30 to-blue-950/30 border border-purple-500/30 rounded-lg p-6">
        {/* Header Section */}
        <TranscriptionFormHeader />

        {/* Model Selection */}
        <div className="mb-4">
          <label className="text-xs font-medium text-zinc-300 mb-2 block">
            Select AI Model:
          </label>
          <ModelSelector
            selectedModel={options.localModelKey}
            currentlyLoadedModel={currentModel}
            isLoading={isModelLoading}
            onModelSelect={options.handleModelChange}
            file={file}
          />
        </div>

        {/* Enhancement Options */}
        <EnhancementOptionsSelector
          compressionType={options.compressionType}
          normalizeAudio={options.normalizeAudio}
          wasCompressed={options.wasCompressed}
          wasNormalized={options.wasNormalized}
          onCompressionChange={options.setCompressionType}
          onNormalizeChange={options.setNormalizeAudio}
        />

        {/* Already Applied Badges */}
        <AlreadyAppliedBadges
          compressionType={result.metadata?.compressionType}
          normalized={result.metadata?.normalized}
        />

        {/* Smart Recommendations */}
        <SmartRecommendations
          filename={file.name}
          compressionType={options.compressionType}
          wasCompressed={options.wasCompressed}
          hasNewEnhancements={options.hasNewEnhancements}
        />

        {/* Resource Warning */}
        <ResourceWarningCard
          file={file}
          modelKey={options.localModelKey}
          className="mb-4"
          minRAMThreshold={50}
        />

        {/* Transcribe Button */}
        <TranscribeButton
          onClick={handleTranscribe}
          isModelLoaded={isModelLoaded}
          isModelLoading={isModelLoading}
          modelLoadingProgress={modelLoadingProgress}
          hasNewEnhancements={options.hasNewEnhancements}
        />
      </div>
    </div>
  );
}

