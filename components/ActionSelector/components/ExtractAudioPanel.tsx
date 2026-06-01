"use client";

import { getFormatById, getRecommendedFormats } from "@/utils/audioFormats";
import { FormatSelector } from "@/components/FormatSelector";
import { FormatDetailsCard } from "@/components/FormatDetailsCard";
import { CompressionSection } from "./CompressionSection";
import { NormalizationCheckbox } from "./NormalizationCheckbox";
import type { ActionPanelProps } from "../types";

export function ExtractAudioPanel({ file, state, onStateChange, disabled }: ActionPanelProps) {
  const audioFormats = getRecommendedFormats("video");
  const selectedAudioConfig = getFormatById(state.selectedAudioFormat);

  return (
    <>
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
