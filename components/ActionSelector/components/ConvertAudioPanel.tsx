"use client";

import { Scissors } from "lucide-react";
import { getFormatById, getRecommendedFormats } from "@/utils/audioFormats";
import { createSegmentMetadata, formatSegmentLabel, estimateSegmentSize } from "@/types/audioSegment";
import { WaveformViewer } from "@/components/WaveformViewer";
import { FormatSelector } from "@/components/FormatSelector";
import { FormatDetailsCard } from "@/components/FormatDetailsCard";
import { CompressionSection } from "./CompressionSection";
import { NormalizationCheckbox } from "./NormalizationCheckbox";
import type { ActionPanelProps } from "../types";

export function ConvertAudioPanel({
  file,
  state,
  onStateChange,
  disabled,
  audioUrl,
}: ActionPanelProps) {
  const audioFormats = getRecommendedFormats("audio");
  const selectedAudioConfig = getFormatById(state.selectedAudioFormat);

  const segmentMetadata =
    state.waveformSelection && state.audioDuration > 0
      ? createSegmentMetadata(
          file,
          state.waveformSelection.startTime,
          state.waveformSelection.endTime,
          state.audioDuration,
        )
      : null;

  const estimatedSize = segmentMetadata
    ? estimateSegmentSize(file.size, segmentMetadata.duration, state.audioDuration)
    : null;

  return (
    <>
      {audioUrl && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-aura-muted">
              Click and drag on the waveform to select a segment (optional)
            </p>
            {state.waveformSelection && (
              <button
                onClick={() => onStateChange({ waveformSelection: null })}
                className="text-xs underline transition-colors"
                style={{ color: "oklch(74% 0.16 290)" }}
              >
                Clear selection
              </button>
            )}
          </div>

          <WaveformViewer
            audioUrl={audioUrl}
            selectable={true}
            onSelectionChange={(selection) => {
              onStateChange({ waveformSelection: selection ?? null });
            }}
          />

          {segmentMetadata && (
            <div
              className="mt-4 rounded-lg p-4"
              style={{ background: "oklch(28% 0.04 290 / 0.40)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg" style={{ background: "oklch(60% 0.28 290 / 0.18)" }}>
                  <Scissors className="w-4 h-4" style={{ color: "oklch(74% 0.16 290)" }} />
                </div>
                <div>
                  <h4 className="font-jazz text-sm text-aura-text">Segment Selected</h4>
                  <p className="text-xs text-aura-muted mt-0.5">{formatSegmentLabel(segmentMetadata)}</p>
                  {estimatedSize && (
                    <p className="text-xs text-aura-muted opacity-60 mt-0.5 font-mono">
                      ~{(estimatedSize / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-aura-muted">
                All actions below will apply to this segment only.
              </p>
            </div>
          )}
        </div>
      )}

      <FormatSelector
        formats={audioFormats}
        selectedId={state.selectedAudioFormat}
        onSelect={(id) => onStateChange({ selectedAudioFormat: id })}
        disabled={disabled}
        type="audio"
      />

      {selectedAudioConfig && (
        <FormatDetailsCard format={selectedAudioConfig} type="audio" />
      )}

      <CompressionSection
        filename={file.name}
        compressionType={state.compressionType}
        normalizeAudio={state.normalizeAudio}
        disabled={disabled}
        onChange={(value) => onStateChange({ compressionType: value })}
      />

      <NormalizationCheckbox
        checked={state.normalizeAudio}
        disabled={disabled}
        onChange={(checked) => onStateChange({ normalizeAudio: checked })}
      />
    </>
  );
}
