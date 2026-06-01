"use client";

import { TranscribeInfoCard } from "@/components/TranscribeInfoCard";
import { ResourceWarningCard } from "@/components/ResourceWarningCard";
import { EnhancementTimeWarning } from "@/components/transcription/EnhancementTimeWarning";
import { getSmartRecommendation } from "../services/formatRecommender";
import type { ActionPanelProps } from "../types";
import type { CompressionType } from "../types";
import { detectFileType } from "@/utils/audioFormats";

export function TranscribePanel({
  file,
  state,
  onStateChange,
  disabled,
  transcriptionMode = "standard",
  isModelLoading,
  isModelLoaded,
  modelLoadingProgress = 0,
  selectedModelKey = "base",
}: ActionPanelProps) {
  const fileType = detectFileType(file);
  const isFast = transcriptionMode === "fast";
  const recommendation = getSmartRecommendation(file.name, state.normalizeAudio, state.compressionType);

  return (
    <>
      {fileType === "video" && (
        <>
          <TranscribeInfoCard />
          <ResourceWarningCard
            file={file}
            modelKey={selectedModelKey}
            className="mt-4"
            minRAMThreshold={50}
          />
        </>
      )}

      <div
        className={`mt-4 rounded-xl p-4 ${isFast ? "opacity-60" : ""}`}
        style={{ background: "oklch(19% 0.02 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <p className="font-jazz text-sm text-aura-text">Audio Enhancement</p>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "oklch(66% 0.17 195 / 0.15)", color: "oklch(74% 0.13 195)" }}
          >
            Improves accuracy
          </span>
          {isFast && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "oklch(72% 0.16 55 / 0.18)", color: "oklch(80% 0.14 55)" }}
            >
              Disabled in Fast Mode
            </span>
          )}
        </div>

        {isFast && (
          <div
            className="mb-3 p-2.5 rounded-md"
            style={{ background: "oklch(72% 0.16 55 / 0.10)", border: "1px solid oklch(72% 0.16 55 / 0.25)" }}
          >
            <p className="text-xs leading-relaxed" style={{ color: "oklch(80% 0.14 55)" }}>
              <span className="font-semibold" style={{ color: "oklch(86% 0.14 55)" }}>Fast Mode:</span>{" "}
              Audio enhancements are disabled to maximize transcription speed.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div>
            <label className="text-xs text-aura-muted mb-1.5 block">Compression Type:</label>
            <select
              value={state.compressionType}
              onChange={(e) => onStateChange({ compressionType: e.target.value as CompressionType })}
              disabled={disabled || isFast}
              className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              style={{
                background: "oklch(24% 0.025 280 / 0.80)",
                border: "1px solid oklch(38% 0.02 280 / 0.50)",
                color: "var(--text)",
              }}
            >
              <option value="none">No Compression (default)</option>
              <option value="speech">Speech — Meetings, Interviews (+15%)</option>
              <option value="studio">Studio — Podcasts, Broadcasts (+12%)</option>
              <option value="both">Both — Maximum Enhancement (+25%)</option>
            </select>
          </div>

          <label className={`flex items-center gap-2 ${isFast ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={state.normalizeAudio}
              onChange={(e) => onStateChange({ normalizeAudio: e.target.checked })}
              disabled={disabled || isFast}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-aura-text">Normalize Audio (EBU R128)</span>
          </label>
        </div>

        {recommendation && (
          <div
            className="mt-3 p-2.5 rounded-md animate-in fade-in duration-300"
            style={{ background: "oklch(28% 0.04 290 / 0.30)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
          >
            <p className="text-xs" style={{ color: "oklch(80% 0.12 290)" }}>{recommendation}</p>
          </div>
        )}

        <EnhancementTimeWarning
          compressionType={state.compressionType}
          normalizeAudio={state.normalizeAudio}
        />

        <div
          className="mt-3 p-2.5 rounded-md"
          style={{ background: "oklch(72% 0.16 55 / 0.08)", border: "1px solid oklch(72% 0.16 55 / 0.20)" }}
        >
          <p className="text-xs leading-relaxed" style={{ color: "oklch(78% 0.13 55)" }}>
            Need to transcribe only a portion? Use{" "}
            <span className="font-semibold" style={{ color: "oklch(84% 0.14 55)" }}>"Extract Audio"</span>{" "}
            first, then select segments from the waveform.
          </p>
        </div>
      </div>
    </>
  );
}
