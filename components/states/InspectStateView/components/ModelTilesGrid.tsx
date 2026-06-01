"use client";

import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { Card } from "./Card";
import { CardHeader } from "./CardHeader";
import { ChipTag } from "./ChipTag";
import { ModelBadge } from "./ModelBadge";

interface ModelTilesGridProps {
  selected: ModelKey;
  currentlyLoaded: string | null;
  onSelect: (m: ModelKey) => void;
  fastMode: boolean;
  disabled?: boolean;
  dimmed?: boolean;
}

const MODEL_ORDER: ModelKey[] = ["tiny", "base", "small", "distil-small"];

export function ModelTilesGrid({
  selected,
  currentlyLoaded,
  onSelect,
  fastMode,
  disabled,
  dimmed,
}: ModelTilesGridProps) {
  return (
    <Card dimmed={dimmed}>
      <CardHeader
        title="AI model"
        trailing={
          fastMode ? (
            <span
              className="font-mono text-[9.5px] tracking-[0.12em] uppercase px-2 py-0.5 rounded"
              style={{
                color: "oklch(78% 0.14 195)",
                background: "oklch(66% 0.17 195 / 0.10)",
                border: "1px solid oklch(66% 0.17 195 / 0.30)",
              }}
            >
              Fast mode · Parallel
            </span>
          ) : null
        }
      />
      <p
        className="text-[12px] leading-snug mb-3 -mt-1"
        style={{ color: "var(--text-muted)" }}
      >
        Pick based on speed vs. accuracy. All run 100% locally.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {MODEL_ORDER.map((key) => {
          const model = WHISPER_MODELS[key];
          const isSelected = selected === key;
          const isLoaded = currentlyLoaded === model.id;
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onSelect(key)}
              disabled={disabled}
              className="relative text-left p-3 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isSelected
                  ? "oklch(60% 0.20 290 / 0.10)"
                  : "oklch(24% 0.025 280 / 0.65)",
                border: isSelected
                  ? "1px solid oklch(60% 0.20 290 / 0.50)"
                  : "1px solid oklch(38% 0.02 280 / 0.35)",
              }}
            >
              <ModelBadge isSelected={isSelected} isLoaded={isLoaded} badge={model.badge} />
              <div
                className="font-semibold text-[14px] leading-tight"
                style={{ color: "var(--text)" }}
              >
                {model.name.replace("Whisper ", "")}
              </div>
              <div
                className="font-mono text-[10px] tracking-[0.06em] mt-0.5 mb-2.5"
                style={{ color: "oklch(55% 0.02 280)" }}
              >
                {model.size}
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                <ChipTag label={model.speed} />
                <ChipTag label={model.quality} />
              </div>
              <p className="text-[11.5px] leading-snug" style={{ color: "var(--text-muted)" }}>
                {model.description}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
