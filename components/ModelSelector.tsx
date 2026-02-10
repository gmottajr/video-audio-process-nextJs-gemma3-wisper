"use client";

import React from "react";
import { Brain, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { getResourceWarning, formatFileSize } from "@/utils/resourceEstimation";

/**
 * Whisper Model Information
 */
export const WHISPER_MODELS = {
  tiny: {
    id: "Xenova/whisper-tiny",
    name: "Whisper Tiny",
    size: "39 MB",
    speed: "Very Fast",
    quality: "Basic",
    description: "Quick transcriptions, lower accuracy",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    badge: null,
  },
  base: {
    id: "Xenova/whisper-base",
    name: "Whisper Base",
    size: "74 MB",
    speed: "Fast",
    quality: "Good",
    description: "Balanced speed and accuracy",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    badge: "Popular",
  },
  small: {
    id: "Xenova/whisper-small",
    name: "Whisper Small",
    size: "244 MB",
    speed: "Moderate",
    quality: "Excellent",
    description: "High accuracy, slower processing",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    badge: "Best",
  },
  "distil-small": {
    id: "distil-whisper/distil-small.en",
    name: "Distil-Whisper",
    size: "166 MB",
    speed: "Fast",
    quality: "Good",
    description: "Faster than Small, English only",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    badge: "Fast",
  },
} as const;

export type ModelKey = keyof typeof WHISPER_MODELS;

interface ModelSelectorProps {
  selectedModel: ModelKey;
  currentlyLoadedModel: string | null;
  isLoading: boolean;
  onModelSelect: (model: ModelKey) => void;
  disabled?: boolean;
  file?: File | null; // NEW: For resource estimation
  fastModeEnabled?: boolean; // NEW: Show parallel processing indicator
}

/**
 * Model Selector Component
 * Allows users to choose which Whisper model to use for transcription
 */
export default function ModelSelector({
  selectedModel,
  currentlyLoadedModel,
  isLoading,
  onModelSelect,
  disabled = false,
  file = null,
  fastModeEnabled = false,
}: ModelSelectorProps) {
  // Get resource warning if file is provided
  const resourceWarning = file ? getResourceWarning(file, selectedModel) : null;
  const showWarning = resourceWarning && (resourceWarning.level === "heavy" || resourceWarning.level === "extreme" || resourceWarning.level === "dangerous");

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-800">
            AI Transcription Model
          </h3>
          {file && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              File: {formatFileSize(file.size)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Choose your model based on speed vs. accuracy needs
        </p>
        {fastModeEnabled && (
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-800 font-medium">
              Fast Mode: Parallel processing with multiple workers
            </span>
          </div>
        )}
      </div>

      {/* Resource Warning Banner */}
      {showWarning && resourceWarning && (
        <div className={`mb-4 p-4 rounded-lg border-2 ${
          resourceWarning.level === "dangerous" ? "bg-red-950/50 border-red-500/50" :
          resourceWarning.level === "extreme" ? "bg-orange-950/50 border-orange-500/50" :
          "bg-yellow-950/50 border-yellow-500/50"
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{resourceWarning.icon}</span>
            <div className="flex-1">
              <h4 className={`font-bold text-sm mb-1 ${
                resourceWarning.level === "dangerous" ? "text-red-300" :
                resourceWarning.level === "extreme" ? "text-orange-300" :
                "text-yellow-300"
              }`}>
                {resourceWarning.message}
              </h4>
              <p className="text-xs text-zinc-300 mb-2">
                {resourceWarning.recommendation}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-800/50 rounded px-2 py-1">
                  <span className="text-zinc-400">RAM: </span>
                  <span className="text-zinc-200 font-semibold">{resourceWarning.estimatedRAM}GB+</span>
                </div>
                {resourceWarning.requiresHighEndCPU && (
                  <div className="bg-zinc-800/50 rounded px-2 py-1">
                    <span className="text-zinc-400">CPU: </span>
                    <span className="text-zinc-200 font-semibold">High-end</span>
                  </div>
                )}
                {resourceWarning.requiresGPU && (
                  <div className="bg-zinc-800/50 rounded px-2 py-1 col-span-2">
                    <span className="text-zinc-400">GPU: </span>
                    <span className="text-zinc-200 font-semibold">Dedicated GPU Recommended</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {(Object.keys(WHISPER_MODELS) as ModelKey[]).map((modelKey) => {
          const model = WHISPER_MODELS[modelKey];
          const isSelected = selectedModel === modelKey;
          const isCurrentlyLoaded =
            currentlyLoadedModel === model.id && !isLoading;

          return (
            <button
              key={modelKey}
              onClick={() => onModelSelect(modelKey)}
              disabled={disabled || isLoading}
              className={`
                relative p-3 rounded-lg border-2 text-left transition-all
                ${isSelected ? `${model.borderColor} ${model.bgColor}` : "border-gray-200 bg-white"}
                ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"}
                ${!disabled && !isLoading && isSelected ? "shadow-md" : ""}
              `}
            >
              {/* Badge (Popular, Best, Fast) */}
              {model.badge && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    model.badge === 'Best' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : model.badge === 'Fast'
                      ? 'bg-amber-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {model.badge}
                  </span>
                </div>
              )}

              {/* Active Indicator */}
              {isCurrentlyLoaded && (
                <div className="absolute top-1.5 right-1.5">
                  <CheckCircle2 className={`w-4 h-4 ${model.color}`} />
                </div>
              )}

              {/* Model Name & Size */}
              <div className="mb-2">
                <h4 className={`font-bold text-sm leading-tight ${isSelected ? model.color : "text-gray-800"}`}>
                  {model.name.replace('Whisper ', '')}
                </h4>
                <p className="text-[11px] text-gray-500">{model.size}</p>
              </div>

              {/* Speed & Quality */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                  <Zap className="w-2.5 h-2.5" />
                  {model.speed}
                </span>
                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">
                  {model.quality}
                </span>
              </div>

              {/* Description */}
              <p className="text-[10px] text-gray-500 leading-tight">{model.description}</p>

              {/* Loading/Loaded State */}
              {isCurrentlyLoaded && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className={`text-[10px] font-semibold ${model.color}`}>
                    ✓ Loaded
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info Message */}
      {isLoading && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Loading {WHISPER_MODELS[selectedModel].name}... This may take a moment.
          </p>
        </div>
      )}
    </div>
  );
}



