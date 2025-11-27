"use client";

import React, { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import ModelSelector, { type ModelKey } from "@/components/ModelSelector";
import { ResourceWarningCard } from "@/components/ResourceWarningCard";
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
 * TranscribeFromDoneForm Component
 * 
 * Allows users to transcribe an already-processed audio file with optional enhancements.
 * Displays smart recommendations, model selection, and resource warnings.
 * 
 * Extracted from DoneStateView to follow SRP (Single Responsibility Principle).
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
  // Local state for transcription options
  const [compressionType, setCompressionType] = useState<CompressionType>("none");
  const [normalizeAudio, setNormalizeAudio] = useState(false);
  const [localModelKey, setLocalModelKey] = useState<ModelKey>(selectedModelKey);

  // Sync local model key with prop changes
  useEffect(() => {
    setLocalModelKey(selectedModelKey);
  }, [selectedModelKey]);

  // Handle model selection
  const handleModelChange = (modelKey: ModelKey) => {
    setLocalModelKey(modelKey);
    if (onModelSelect) {
      onModelSelect(modelKey);
    }
  };

  // Check if enhancements were already applied
  const wasCompressed = result.metadata?.compressionType && result.metadata.compressionType !== "none";
  const wasNormalized = result.metadata?.normalized;

  // Smart recommendations based on filename
  const filename = file.name.toLowerCase();
  const isMeetingContent = /meeting|interview|call|conversation|conference/i.test(filename);
  const isPodcastContent = /podcast|broadcast|episode|show/i.test(filename);
  const hasNewEnhancements = compressionType !== "none" || normalizeAudio;

  const getSmartRecommendation = (): string | null => {
    if (isMeetingContent && compressionType !== "speech" && !wasCompressed) {
      return "💡 Tip: Speech compression recommended for multi-speaker content";
    }
    if (isPodcastContent && compressionType !== "studio" && !wasCompressed) {
      return "💡 Tip: Studio compression recommended for professional broadcasting";
    }
    if (hasNewEnhancements) {
      return "✨ Audio will be enhanced before transcription for better accuracy";
    }
    return null;
  };

  const handleTranscribe = () => {
    if (isModelLoaded || isModelLoading) {
      onTranscribe(compressionType, normalizeAudio, localModelKey);
    }
  };

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-purple-950/30 via-indigo-950/30 to-blue-950/30 border border-purple-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-bold text-zinc-100">
            Transcribe This Audio
          </h3>
          <span className="text-xs text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full font-medium">
            AI Whisper
          </span>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Convert this audio to text using AI transcription. Choose your model and optionally enhance the audio first for better accuracy.
        </p>

        {/* Model Selection */}
        <div className="mb-4">
          <label className="text-xs font-medium text-zinc-300 mb-2 block">
            Select AI Model:
          </label>
          <ModelSelector
            selectedModel={localModelKey}
            currentlyLoadedModel={currentModel}
            isLoading={isModelLoading}
            onModelSelect={handleModelChange}
            file={file}
          />
        </div>

        {/* Enhancement Options */}
        <div className="space-y-3 mb-4">
          {/* Compression Selector (only if not already compressed) */}
          {!wasCompressed && (
            <div>
              <label htmlFor="compression-type" className="text-xs font-medium text-zinc-300 mb-1.5 block">
                Add Compression (Optional):
              </label>
              <select
                id="compression-type"
                value={compressionType}
                onChange={(e) => setCompressionType(e.target.value as CompressionType)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="none">⭕ No Compression (use as-is)</option>
                <option value="speech">🎙️ Speech - Meetings, Interviews (+15%)</option>
                <option value="studio">🎚️ Studio - Podcasts, Broadcasts (+12%)</option>
                <option value="both">🎛️ Both - Maximum Enhancement (+25%)</option>
              </select>
            </div>
          )}

          {/* Normalization Checkbox (only if not already normalized) */}
          {!wasNormalized && (
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={normalizeAudio}
                onChange={(e) => setNormalizeAudio(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900"
              />
              <span className="ml-2 text-sm text-zinc-100 group-hover:text-purple-300 transition-colors">
                🎵 Normalize Audio (EBU R128) - Improves transcription
              </span>
            </label>
          )}

          {/* Show what's already applied */}
          {(wasCompressed || wasNormalized) && (
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-md p-3">
              <p className="text-xs font-medium text-zinc-300 mb-1">Already Applied:</p>
              <div className="flex flex-wrap gap-2">
                {wasCompressed && (
                  <span className="text-xs px-2 py-1 bg-green-950/50 border border-green-500/30 text-green-300 rounded-full">
                    {result.metadata?.compressionType === "speech" ? "🎙️ Speech Compressed" :
                     result.metadata?.compressionType === "studio" ? "🎚️ Studio Compressed" :
                     "🎛️ Both Compressions"}
                  </span>
                )}
                {wasNormalized && (
                  <span className="text-xs px-2 py-1 bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 rounded-full">
                    🎵 Normalized
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Smart Recommendation */}
        {getSmartRecommendation() && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
            <p className="text-xs text-blue-300 leading-relaxed">
              {getSmartRecommendation()}
            </p>
          </div>
        )}

        {/* Resource Warning for Transcription */}
        <ResourceWarningCard
          file={file}
          modelKey={localModelKey}
          className="mb-4"
          minRAMThreshold={50}
        />

        {/* Transcribe Button */}
        <button
          onClick={handleTranscribe}
          disabled={!isModelLoaded && !isModelLoading}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-zinc-700 disabled:to-zinc-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:shadow-none"
        >
          <Brain className="w-5 h-5" />
          {isModelLoading
            ? `Loading AI Model... ${Math.round(modelLoadingProgress)}%`
            : isModelLoaded
            ? hasNewEnhancements
              ? "🎵 Enhance & Transcribe to Text"
              : "Transcribe to Text"
            : "Waiting for AI Model..."}
        </button>

        <p className="mt-3 text-xs text-center text-zinc-500">
          {isModelLoading
            ? "🤖 AI model is loading..."
            : isModelLoaded
            ? hasNewEnhancements
              ? "Audio will be enhanced, then transcribed using Whisper AI"
              : "Audio will be transcribed directly using Whisper AI"
            : "⏳ Waiting for AI model to be ready..."}
        </p>
      </div>
    </div>
  );
}

