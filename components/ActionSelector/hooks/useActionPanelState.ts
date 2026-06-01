import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { detectFileType, getRecommendedFormats } from "@/utils/audioFormats";
import type { WaveformSelection } from "@/components/WaveformViewer";
import type { ActionPanelState, CompressionType } from "../types";

export function useActionPanelState(
  file: File,
  transcriptionMode: "standard" | "fast",
) {
  const fileType = detectFileType(file);
  const audioFormats = getRecommendedFormats(fileType);

  const [selectedAudioFormat, setSelectedAudioFormat] = useState<string>(
    audioFormats[0]?.id || "wav",
  );
  const [selectedVideoFormat, setSelectedVideoFormat] = useState<string>("mp4");
  const [selectedResolution, setSelectedResolution] = useState<string>("original");
  const [normalizeAudio, setNormalizeAudio] = useState(false);
  const [compressionType, setCompressionType] = useState<CompressionType>("none");
  const [waveformSelection, setWaveformSelection] = useState<WaveformSelection | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Auto-disable enhancements for Fast Mode
  useEffect(() => {
    if (transcriptionMode === "fast") {
      setCompressionType("none");
      setNormalizeAudio(false);
    }
  }, [transcriptionMode]);

  // Blob URL cache — persists across React StrictMode double-mounts
  const blobUrlCacheRef = useRef<{ file: File; url: string } | null>(null);

  const audioUrl = useMemo(() => {
    if (fileType !== "audio") return null;

    if (blobUrlCacheRef.current?.file === file) {
      return blobUrlCacheRef.current.url;
    }
    if (blobUrlCacheRef.current) {
      URL.revokeObjectURL(blobUrlCacheRef.current.url);
    }
    const url = URL.createObjectURL(file);
    blobUrlCacheRef.current = { file, url };
    return url;
  }, [file, fileType]);

  const state: ActionPanelState = {
    selectedAudioFormat,
    selectedVideoFormat,
    selectedResolution,
    normalizeAudio,
    compressionType,
    waveformSelection,
    audioDuration,
  };

  const patch = useCallback((updates: Partial<ActionPanelState>) => {
    if ("selectedAudioFormat" in updates) setSelectedAudioFormat(updates.selectedAudioFormat!);
    if ("selectedVideoFormat" in updates) setSelectedVideoFormat(updates.selectedVideoFormat!);
    if ("selectedResolution" in updates) setSelectedResolution(updates.selectedResolution!);
    if ("normalizeAudio" in updates) setNormalizeAudio(updates.normalizeAudio!);
    if ("compressionType" in updates) setCompressionType(updates.compressionType!);
    if ("waveformSelection" in updates) setWaveformSelection(updates.waveformSelection ?? null);
    if ("audioDuration" in updates) setAudioDuration(updates.audioDuration!);
  }, []);

  return { state, patch, audioUrl };
}
