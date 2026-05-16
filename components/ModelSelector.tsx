"use client";

import React from "react";
import { Brain, Zap, CheckCircle2 } from "lucide-react";
import { getResourceWarning, formatFileSize } from "@/utils/resourceEstimation";

export const WHISPER_MODELS = {
  tiny: {
    id: "Xenova/whisper-tiny",
    name: "Whisper Tiny",
    size: "39 MB",
    speed: "Very Fast",
    quality: "Basic",
    description: "Quick transcriptions, lower accuracy",
    badge: null,
  },
  base: {
    id: "Xenova/whisper-base",
    name: "Whisper Base",
    size: "74 MB",
    speed: "Fast",
    quality: "Good",
    description: "Balanced speed and accuracy",
    badge: "Popular",
  },
  small: {
    id: "Xenova/whisper-small",
    name: "Whisper Small",
    size: "244 MB",
    speed: "Moderate",
    quality: "Excellent",
    description: "High accuracy, slower processing",
    badge: "Best",
  },
  "distil-small": {
    id: "distil-whisper/distil-small.en",
    name: "Distil-Whisper",
    size: "166 MB",
    speed: "Fast",
    quality: "Good",
    description: "Faster than Small, English only",
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
  file?: File | null;
  fastModeEnabled?: boolean;
}

const BADGE_STYLE: Record<string, React.CSSProperties> = {
  Popular: { background: "oklch(60% 0.28 290)", color: "white" },
  Best:    { background: "linear-gradient(135deg, oklch(58% 0.28 328), oklch(60% 0.28 290))", color: "white" },
  Fast:    { background: "oklch(66% 0.17 195)", color: "white" },
};

export default function ModelSelector({
  selectedModel,
  currentlyLoadedModel,
  isLoading,
  onModelSelect,
  disabled = false,
  file = null,
  fastModeEnabled = false,
}: ModelSelectorProps) {
  const resourceWarning = file ? getResourceWarning(file, selectedModel) : null;
  const showWarning = resourceWarning && ["heavy", "extreme", "dangerous"].includes(resourceWarning.level);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-aura-muted" />
          <h3 className="font-jazz text-base" style={{ color: "oklch(94% 0.01 280)" }}>AI Transcription Model</h3>
          {file && (
            <span className="text-xs text-aura-muted font-mono ml-1">
              {formatFileSize(file.size)}
            </span>
          )}
        </div>
        <p className="text-xs text-aura-muted pl-6">Choose based on speed vs. accuracy</p>
        {fastModeEnabled && (
          <div
            className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "oklch(66% 0.17 195 / 0.10)", border: "1px solid oklch(66% 0.17 195 / 0.25)" }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: "oklch(66% 0.17 195)" }} />
            <span className="text-xs font-medium" style={{ color: "oklch(74% 0.13 195)" }}>
              Fast Mode · Parallel processing
            </span>
          </div>
        )}
      </div>

      {/* Resource Warning */}
      {showWarning && resourceWarning && (
        <div
          className="mb-4 p-4 rounded-xl"
          style={{
            background: resourceWarning.level === "dangerous"
              ? "oklch(22% 0.06 25 / 0.60)"
              : "oklch(22% 0.05 55 / 0.60)",
            border: `1px solid ${resourceWarning.level === "dangerous" ? "oklch(55% 0.18 25 / 0.40)" : "oklch(65% 0.16 55 / 0.30)"}`,
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{resourceWarning.icon}</span>
            <div className="flex-1">
              <h4 className="font-jazz text-sm mb-1 text-aura-text">{resourceWarning.message}</h4>
              <p className="text-xs text-aura-muted mb-2">{resourceWarning.recommendation}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded px-2 py-1" style={{ background: "oklch(20% 0.02 280 / 0.60)" }}>
                  <span className="text-aura-muted">RAM: </span>
                  <span className="text-aura-text font-semibold">{resourceWarning.estimatedRAM}GB+</span>
                </div>
                {resourceWarning.requiresGPU && (
                  <div className="rounded px-2 py-1 col-span-2" style={{ background: "oklch(20% 0.02 280 / 0.60)" }}>
                    <span className="text-aura-muted">GPU: </span>
                    <span className="text-aura-text font-semibold">Dedicated GPU recommended</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model cards */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.keys(WHISPER_MODELS) as ModelKey[]).map((modelKey) => {
          const model = WHISPER_MODELS[modelKey];
          const isSelected = selectedModel === modelKey;
          const isLoaded = currentlyLoadedModel === model.id && !isLoading;

          return (
            <button
              key={modelKey}
              onClick={() => onModelSelect(modelKey)}
              disabled={disabled || isLoading}
              className="relative p-3 rounded-xl text-left transition-all duration-200"
              style={{
                background: isSelected
                  ? "oklch(28% 0.04 290 / 0.70)"
                  : "oklch(22% 0.025 280)",
                border: isSelected
                  ? "1px solid oklch(60% 0.28 290 / 0.55)"
                  : "1px solid oklch(38% 0.02 280 / 0.35)",
                backdropFilter: "blur(8px)",
                boxShadow: isSelected
                  ? "0 0 20px oklch(60% 0.28 290 / 0.15), inset 0 1px 0 oklch(100% 0 0 / 0.04)"
                  : "inset 0 1px 0 oklch(100% 0 0 / 0.03)",
                opacity: disabled || isLoading ? 0.75 : 1,
                cursor: disabled || isLoading ? "not-allowed" : "pointer",
              }}
            >
              {/* Badge */}
              {model.badge && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                    style={BADGE_STYLE[model.badge]}
                  >
                    {model.badge}
                  </span>
                </div>
              )}

              {/* Loaded indicator */}
              {isLoaded && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(66% 0.17 195)" }} />
                </div>
              )}

              {/* Name & size */}
              <div className="mb-2">
                <h4
                  className="font-jazz text-sm leading-tight"
                  style={{ color: isSelected ? "oklch(80% 0.22 290)" : "var(--text)" }}
                >
                  {model.name.replace("Whisper ", "")}
                </h4>
                <p className="text-[11px] text-aura-muted font-mono">{model.size}</p>
              </div>

              {/* Speed & quality tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span
                  className="font-jazz flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: "oklch(38% 0.04 290 / 0.55)",
                    color: "oklch(78% 0.08 290)",
                    border: "1px solid oklch(50% 0.04 290 / 0.30)",
                  }}
                >
                  <Zap className="w-2.5 h-2.5" />
                  {model.speed}
                </span>
                <span
                  className="font-jazz px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: "oklch(35% 0.02 280 / 0.60)",
                    color: "oklch(72% 0.02 280)",
                    border: "1px solid oklch(45% 0.02 280 / 0.30)",
                  }}
                >
                  {model.quality}
                </span>
              </div>

              {/* Description */}
              <p className="text-[10px] text-aura-muted leading-tight">{model.description}</p>

              {/* Loaded footer */}
              {isLoaded && (
                <div
                  className="mt-2 pt-2"
                  style={{ borderTop: "1px solid oklch(66% 0.17 195 / 0.20)" }}
                >
                  <span className="text-[10px] font-semibold" style={{ color: "oklch(66% 0.17 195)" }}>
                    ✓ Loaded
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading message */}
      {isLoading && (
        <div
          className="mt-4 p-3 rounded-xl"
          style={{
            background: "oklch(22% 0.025 280)",
            border: "1px solid oklch(60% 0.28 290 / 0.25)",
          }}
        >
          <p className="text-sm text-aura-muted">
            Loading <span className="text-aura-text">{WHISPER_MODELS[selectedModel].name}</span>… this may take a moment.
          </p>
        </div>
      )}
    </div>
  );
}
