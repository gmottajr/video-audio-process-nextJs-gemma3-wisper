"use client";

import React from "react";
import { Brain, Zap, CheckCircle2 } from "lucide-react";

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
  },
} as const;

export type ModelKey = keyof typeof WHISPER_MODELS;

interface ModelSelectorProps {
  selectedModel: ModelKey;
  currentlyLoadedModel: string | null;
  isLoading: boolean;
  onModelSelect: (model: ModelKey) => void;
  disabled?: boolean;
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
}: ModelSelectorProps) {
  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-800">
            AI Transcription Model
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Choose your model based on speed vs. accuracy needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                relative p-4 rounded-xl border-2 text-left transition-all
                ${isSelected ? `${model.borderColor} ${model.bgColor}` : "border-gray-200 bg-white"}
                ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"}
                ${!disabled && !isLoading && isSelected ? "shadow-md" : ""}
              `}
            >
              {/* Active Indicator */}
              {isCurrentlyLoaded && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className={`w-5 h-5 ${model.color}`} />
                </div>
              )}

              {/* Model Name & Size */}
              <div className="mb-3">
                <h4 className={`font-bold text-lg ${isSelected ? model.color : "text-gray-800"}`}>
                  {model.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1">{model.size}</p>
              </div>

              {/* Speed & Quality Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs">
                  <Zap className="w-3 h-3" />
                  <span className="font-medium">{model.speed}</span>
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium">
                  {model.quality} Quality
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600">{model.description}</p>

              {/* Loading/Loaded State */}
              {isCurrentlyLoaded && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className={`text-xs font-semibold ${model.color}`}>
                    ✓ Currently Loaded
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

